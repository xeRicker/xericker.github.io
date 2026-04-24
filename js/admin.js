import { apiService } from './services/api.js';
import { analytics } from './services/analytics.js';
import { weatherService } from './services/weather.js';
import { adminRender } from './ui/adminRender.js';
import { setupPayrollCalculator } from './ui/payrollCalculator.js';
import { isLocalhost, parseLocalDateInput } from './utils.js';

const PASSWORD = "xdxdxd123";
const WEEKDAYS = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'];

let allData = [];
let processedData = [];
let currentData = [];
let currentWeeks = [];
let chartType = 'bar';
let viewMode = 'total';
let currentViewData = [];
let activeWeekKey = 'all';
let revenueSort = { key: 'date', direction: 'desc' };
let payrollCalculator = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!isLocalhost()) {
        const pass = prompt("Hasło:");
        if (pass !== PASSWORD) return location.href = "index.html";
    }
    document.body.style.display = 'block';

    allData = await apiService.fetchAllData();
    if (!allData.length) {
        document.getElementById('loading').innerText = "Brak danych";
        return;
    }

    processedData = await weatherService.enrichReports(analytics.processReports(allData));
    initUI(processedData);
});

function initUI(data) {
    populateMonthFilter(data);
    populateLocationFilter(data);
    populateWeekdayFilter();
    setupListeners();

    const monthSelect = document.getElementById('monthFilter');
    if (monthSelect.options.length > 0) {
        monthSelect.selectedIndex = 0;
        handleMonthChange(data);
    }

    document.getElementById('loading').style.display = 'none';
    document.getElementById('revenueTable').style.display = 'table';
    document.getElementById('lastUpdate').innerText = new Date().toLocaleString('pl-PL');

    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.style.display = 'none', 500);
    }

    initCalculator();
}

function populateMonthFilter(data) {
    const select = document.getElementById('monthFilter');
    const months = new Set(data.map(day => `${day.dateObj.getFullYear()}-${String(day.dateObj.getMonth() + 1).padStart(2, '0')}`));

    select.innerHTML = Array.from(months)
        .sort()
        .reverse()
        .map(value => {
            const [year, month] = value.split('-');
            const monthName = new Date(year, month - 1, 1)
                .toLocaleString('pl-PL', { month: 'long' });
            const label = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            return `<option value="${value}">${value} (${label})</option>`;
        })
        .join('');
}

function populateLocationFilter(data) {
    const select = document.getElementById('locationFilter');
    const locations = Array.from(
        new Set(data.flatMap(day => Object.keys(day.locations || {})))
    ).sort((a, b) => a.localeCompare(b, 'pl'));

    select.innerHTML = [
        '<option value="all">Wszystkie punkty</option>',
        ...locations.map(location => `<option value="${location}">${location}</option>`)
    ].join('');
}

function populateWeekdayFilter() {
    const select = document.getElementById('weekdayFilter');
    select.innerHTML = [
        '<option value="all">Cały tydzień</option>',
        ...WEEKDAYS.map(day => `<option value="${day}">${day.charAt(0).toUpperCase() + day.slice(1)}</option>`)
    ].join('');
}

function handleMonthChange(fullData) {
    const [year, month] = document.getElementById('monthFilter').value.split('-');
    currentData = analytics.filterByMonth(fullData, year, month);

    syncDateFiltersToMonth(year, month);
    buildWeekTabs(currentData);
    activeWeekKey = 'all';
    updateView();

    const lastDay = new Date(year, month, 0).getDate();
    payrollCalculator?.setDateRange(
        `${year}-${month}-01`,
        `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    );
}

function syncDateFiltersToMonth(year, month) {
    const lastDay = new Date(year, month, 0).getDate();
    document.getElementById('dateFromFilter').value = `${year}-${month}-01`;
    document.getElementById('dateToFilter').value = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
}

function buildWeekTabs(data) {
    const tabsContainer = document.getElementById('weekTabsContainer');
    tabsContainer.innerHTML = '';
    currentWeeks = [];

    const allTab = createWeekTab('all', 'CAŁY MIESIĄC');
    allTab.classList.add('active');
    tabsContainer.appendChild(allTab);

    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
    let bucket = [];

    sorted.forEach(day => {
        bucket.push(day);
        if (day.dayOfWeek === 'niedziela') {
            currentWeeks.push(bucket);
            bucket = [];
        }
    });

    if (bucket.length) currentWeeks.push(bucket);

    currentWeeks.forEach((weekData, index) => {
        const start = weekData[0].dateStr.slice(0, 5);
        const end = weekData[weekData.length - 1].dateStr.slice(0, 5);
        tabsContainer.appendChild(createWeekTab(String(index), `TYDZIEŃ ${index + 1} (${start}-${end})`));
    });
}

function createWeekTab(key, label) {
    const tab = document.createElement('div');
    tab.className = 'week-tab';
    tab.dataset.week = key;
    tab.innerText = label;
    tab.onclick = event => {
        document.querySelectorAll('.week-tab').forEach(node => node.classList.remove('active'));
        event.currentTarget.classList.add('active');
        activeWeekKey = key;
        updateView();
    };
    return tab;
}

function setupListeners() {
    document.getElementById('monthFilter').addEventListener('change', () => handleMonthChange(processedData));

    document.querySelectorAll('.chart-btn').forEach(button => {
        button.onclick = event => {
            document.querySelectorAll('.chart-btn').forEach(node => node.classList.remove('active'));
            event.currentTarget.classList.add('active');
            chartType = event.currentTarget.dataset.type;
            updateView();
        };
    });

    document.querySelectorAll('.view-btn').forEach(button => {
        button.onclick = event => {
            document.querySelectorAll('.view-btn').forEach(node => node.classList.remove('active'));
            event.currentTarget.classList.add('active');
            viewMode = event.currentTarget.dataset.view;
            updateView();
        };
    });

    document.querySelectorAll('#revenueTable thead th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            revenueSort.direction = revenueSort.key === key && revenueSort.direction === 'asc' ? 'desc' : 'asc';
            revenueSort.key = key;
            syncSortSelect();
            renderRevenueTable();
        });
    });

    ['dateFromFilter', 'dateToFilter', 'locationFilter', 'weekdayFilter', 'performanceFilter'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => updateView());
    });

    document.getElementById('sortFilter').addEventListener('change', event => {
        const [key, direction] = event.target.value.split('_');
        revenueSort = { key, direction };
        renderRevenueTable();
    });

    document.getElementById('resetFiltersBtn').addEventListener('click', () => {
        document.getElementById('locationFilter').value = 'all';
        document.getElementById('weekdayFilter').value = 'all';
        document.getElementById('performanceFilter').value = 'all';

        const [year, month] = document.getElementById('monthFilter').value.split('-');
        syncDateFiltersToMonth(year, month);
        revenueSort = { key: 'date', direction: 'desc' };
        syncSortSelect();
        updateView();
    });
}

function syncSortSelect() {
    const select = document.getElementById('sortFilter');
    const value = `${revenueSort.key}_${revenueSort.direction}`;
    if (Array.from(select.options).some(option => option.value === value)) {
        select.value = value;
    }
}

function updateView() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    const [year, month] = document.getElementById('monthFilter').value.split('-');
    const baseData = getActiveWeekData();

    currentViewData = applyFilters(baseData);

    adminRender.renderSummary(document.getElementById('summarySection'), currentViewData, getRenderOptions());
    adminRender.renderInsights(document.getElementById('insightsSection'), currentViewData, getRenderOptions());
    adminRender.renderChart(ctx, currentViewData, chartType, getRenderOptions());
    adminRender.renderLocationPerformance(
        document.getElementById('locationPerformanceSection'),
        currentViewData,
        getRenderOptions()
    );
    adminRender.renderHeatmap(document.getElementById('heatmapContainer'), currentViewData, year, month, getRenderOptions());
    adminRender.renderEmployeeTable(document.querySelector('#employeeTable tbody'), analytics.calculateEmployeeStats(currentViewData));
    adminRender.renderActiveFilters(document.getElementById('activeFilterChips'), getActiveFilterLabels());

    renderRevenueTable();
}

function getActiveWeekData() {
    if (activeWeekKey === 'all') return currentData;
    return currentWeeks[Number(activeWeekKey)] || currentData;
}

function applyFilters(data) {
    const from = parseLocalDateInput(document.getElementById('dateFromFilter').value);
    const to = parseLocalDateInput(document.getElementById('dateToFilter').value);
    const location = document.getElementById('locationFilter').value;
    const weekday = document.getElementById('weekdayFilter').value;
    const scenario = document.getElementById('performanceFilter').value;

    let filtered = data
        .map(day => location === 'all' ? day : projectDayToLocation(day, location))
        .filter(Boolean);

    if (from) {
        filtered = filtered.filter(day => day.dateObj >= from);
    }

    if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(day => day.dateObj <= end);
    }

    if (weekday !== 'all') {
        filtered = filtered.filter(day => day.dayOfWeek === weekday);
    }

    if (scenario !== 'all') {
        const averageTurnover = filtered.length
            ? filtered.reduce((sum, day) => sum + day.total, 0) / filtered.length
            : 0;

        filtered = filtered.filter(day => {
            if (scenario === 'glovo-heavy') return day.total > 0 && (getGlovoDisplayValue(day) / day.total) >= 0.25;
            if (scenario === 'top-turnover') return day.total >= averageTurnover;
            return true;
        });
    }

    return filtered;
}

function projectDayToLocation(day, location) {
    const locationStats = day.locations?.[location];
    if (!locationStats) return null;

    return {
        ...day,
        total: locationStats.total,
        cardTotal: locationStats.card,
        cashTotal: locationStats.cash,
        glovoTotal: locationStats.glovo,
        glovoNetTotal: locationStats.glovoNet,
        cashDeskTotal: locationStats.cashDesk,
        rawReports: locationStats.reports,
        weather: day.weather || null,
        locations: {
            [location]: { ...locationStats }
        },
        oswiecim: location === 'Oświęcim' ? locationStats.total : 0,
        osiek: location === 'Osiek' ? locationStats.total : 0,
        wilamowice: location === 'Wilamowice' ? locationStats.total : 0,
        oswiecimCard: location === 'Oświęcim' ? locationStats.card : 0,
        osiekCard: location === 'Osiek' ? locationStats.card : 0,
        wilamowiceCard: location === 'Wilamowice' ? locationStats.card : 0,
        oswiecimGlovo: location === 'Oświęcim' ? locationStats.glovo : 0,
        osiekGlovo: location === 'Osiek' ? locationStats.glovo : 0,
        wilamowiceGlovo: location === 'Wilamowice' ? locationStats.glovo : 0,
        oswiecimGlovoNet: location === 'Oświęcim' ? locationStats.glovoNet : 0,
        osiekGlovoNet: location === 'Osiek' ? locationStats.glovoNet : 0,
        wilamowiceGlovoNet: location === 'Wilamowice' ? locationStats.glovoNet : 0
    };
}

function renderRevenueTable() {
    const sorted = [...currentViewData].sort((a, b) => compareRevenueRows(a, b, revenueSort));
    adminRender.renderTable(document.querySelector('#revenueTable tbody'), sorted, getRenderOptions());
}

function compareRevenueRows(a, b, sort) {
    const multiplier = sort.direction === 'asc' ? 1 : -1;

    if (sort.key === 'date') return (a.timestamp - b.timestamp) * multiplier;
    if (sort.key === 'weatherLabel') {
        const weatherA = a.weather?.label || '';
        const weatherB = b.weather?.label || '';
        return weatherA.localeCompare(weatherB, 'pl') * multiplier;
    }
    if (sort.key === 'dayOfWeek') {
        return a.dayOfWeek.localeCompare(b.dayOfWeek, 'pl') * multiplier;
    }
    if (sort.key === 'glovoDisplay') {
        return (getGlovoDisplayValue(a) - getGlovoDisplayValue(b)) * multiplier;
    }
    return ((a[sort.key] || 0) - (b[sort.key] || 0)) * multiplier;
}

function getRenderOptions() {
    return {
        viewMode
    };
}

function getGlovoDisplayValue(entry) {
    return entry.glovoNetTotal;
}

function getActiveFilterLabels() {
    const labels = [];
    const location = document.getElementById('locationFilter').value;
    const weekday = document.getElementById('weekdayFilter').value;
    const scenario = document.getElementById('performanceFilter').value;
    const from = document.getElementById('dateFromFilter').value;
    const to = document.getElementById('dateToFilter').value;

    labels.push('Glovo netto');
    if (location !== 'all') labels.push(location);
    if (weekday !== 'all') labels.push(weekday);
    if (scenario === 'glovo-heavy') labels.push('Wysoki udział Glovo');
    if (scenario === 'top-turnover') labels.push('Ponad średnią');
    if (from && to) labels.push(`${from} -> ${to}`);

    return labels;
}

window.sortEmpTable = () => {};

function initCalculator() {
    payrollCalculator = setupPayrollCalculator({
        getReports: () => allData,
        employeeSelectId: 'calcEmployee',
        rateInputId: 'calcRate',
        dateFromId: 'calcDateFrom',
        dateToId: 'calcDateTo',
        resultBoxId: 'calcResult',
        resHoursId: 'resHours',
        resMoneyId: 'resMoney',
        detailsBoxId: 'calcDetails',
        defaultRate: 30.5
    });

    payrollCalculator.refresh();
}
