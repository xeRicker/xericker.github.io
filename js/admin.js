import { apiService } from './services/api.js';
import { analytics } from './services/analytics.js';
import { weatherService } from './services/weather.js';
import { adminRender } from './ui/adminRender.js';

import { calculateHours, formatMoney, isLocalhost, parseLocalDateInput } from './utils.js';

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
    document.getElementById('calcDateFrom').value = `${year}-${month}-01`;
    document.getElementById('calcDateTo').value = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
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
            if (scenario === 'cash-risk') return isCashRiskDay(day);
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
    if (sort.key === 'riskLevel') {
        return (getRiskLevel(a) - getRiskLevel(b)) * multiplier;
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

function getRiskLevel(entry) {
    if (entry.total <= 0) return 0;
    const cashShare = entry.cashDeskTotal / entry.total;
    if (entry.cashDeskTotal <= 0) return 3;
    if (cashShare < 0.12) return 2;
    if ((getGlovoDisplayValue(entry) / entry.total) >= 0.3) return 1;
    return 0;
}

function isCashRiskDay(entry) {
    return getRiskLevel(entry) >= 2;
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
    if (scenario === 'cash-risk') labels.push('Niski stan gotówki');
    if (scenario === 'glovo-heavy') labels.push('Wysoki udział Glovo');
    if (scenario === 'top-turnover') labels.push('Ponad średnią');
    if (from && to) labels.push(`${from} -> ${to}`);

    return labels;
}

window.sortEmpTable = () => {};

function initCalculator() {
    const select = document.getElementById('calcEmployee');
    const employees = new Set();
    allData.forEach(report => report.employees && Object.keys(report.employees).forEach(name => employees.add(name)));

    select.innerHTML = [
        '<option value="" disabled selected>Wybierz Pracownika</option>',
        ...Array.from(employees).sort().map(name => `<option value="${name}">${name}</option>`)
    ].join('');

    const formatCalcDate = date => {
        const [day, month] = date.split('.');
        return `${day}.${month}`;
    };

    const recalc = () => {
        const name = select.value;
        const resultBox = document.getElementById('calcResult');
        const detailsBox = document.getElementById('calcDetails');

        if (!name) {
            resultBox.style.display = 'none';
            detailsBox.style.display = 'none';
            return;
        }

        const rate = parseFloat(document.getElementById('calcRate').value) || 0;
        const dateFrom = parseLocalDateInput(document.getElementById('calcDateFrom').value);
        const dateTo = parseLocalDateInput(document.getElementById('calcDateTo').value);

        if (!dateFrom || !dateTo) {
            resultBox.style.display = 'none';
            detailsBox.style.display = 'none';
            return;
        }

        dateTo.setHours(23, 59, 59, 999);

        let totalHours = 0;
        const locationHours = {};
        const breakdown = [];

        allData.forEach(report => {
            const [day, month, year] = report.date.split('.');
            const reportDate = new Date(year, month - 1, day);
            const shift = report.employees?.[name];
            if (!shift || reportDate < dateFrom || reportDate > dateTo) return;

            const hours = calculateHours(shift);
            totalHours += hours;
            locationHours[report.location] = (locationHours[report.location] || 0) + hours;
            breakdown.push({
                date: report.date,
                dateObj: reportDate,
                location: report.location,
                shift,
                hours,
                amount: hours * rate
            });
        });

        breakdown.sort((left, right) => left.dateObj - right.dateObj);

        resultBox.style.display = 'flex';
        document.getElementById('resHours').innerText = `${totalHours.toFixed(1)} h`;
        document.getElementById('resMoney').innerText = formatMoney(totalHours * rate);

        detailsBox.style.display = 'block';
        const locationEntries = Object.entries(locationHours).sort((left, right) => right[1] - left[1]);
        const maxHours = locationEntries.length ? locationEntries[0][1] : 0;
        const summaryHtml = locationEntries.map(([location, hours]) => `
            <div class="calc-breakdown-pill ${hours === maxHours && hours > 0 ? 'is-main' : ''}">
                <span>${location}</span>
                <strong>${hours.toFixed(1)} h</strong>
            </div>
        `).join('');

        const rowsHtml = breakdown.map(day => `
            <tr>
                <td>${formatCalcDate(day.date)}</td>
                <td>${day.location}</td>
                <td>${day.shift}</td>
                <td class="val-cell">${day.hours.toFixed(1)} h</td>
                <td class="val-cell">${formatMoney(day.amount)}</td>
            </tr>
        `).join('');

        detailsBox.innerHTML = `
            <div class="calc-breakdown-summary">
                <div class="calc-breakdown-card">
                    <span class="calc-breakdown-label">Liczba zmian</span>
                    <strong>${breakdown.length}</strong>
                </div>
                <div class="calc-breakdown-card">
                    <span class="calc-breakdown-label">Średnio na zmianę</span>
                    <strong>${breakdown.length ? (totalHours / breakdown.length).toFixed(1) : '0.0'} h</strong>
                </div>
                <div class="calc-breakdown-card">
                    <span class="calc-breakdown-label">Stawka</span>
                    <strong>${rate.toFixed(2)} PLN</strong>
                </div>
            </div>

            <div class="calc-breakdown-pills">${summaryHtml}</div>

            <details class="calc-breakdown-report" open>
                <summary>
                    Mini-raport wypłaty
                    <span>${breakdown.length} dni / ${totalHours.toFixed(1)} h / ${formatMoney(totalHours * rate)}</span>
                </summary>
                <div class="calc-breakdown-table-wrap">
                    <table class="calc-breakdown-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Lokal</th>
                                <th>Zmiana</th>
                                <th>Godziny</th>
                                <th>Kwota</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </div>
            </details>
        `;
    };

    ['change', 'input'].forEach(eventName => {
        select.addEventListener(eventName, recalc);
        document.getElementById('calcRate').addEventListener(eventName, recalc);
        document.getElementById('calcDateFrom').addEventListener(eventName, recalc);
        document.getElementById('calcDateTo').addEventListener(eventName, recalc);
    });
}
