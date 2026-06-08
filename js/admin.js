import { apiService } from './services/api.js';
import { analytics } from './services/analytics.js';
import { adminRender } from './ui/adminRender.js?v=4';
import { adminProducts } from './ui/adminProducts.js?v=3';
import { createAdminListsPage } from './ui/adminLists.js';
import { setupPayrollCalculator } from './ui/payrollCalculator.js?v=3';
import { escapeHtml, formatMoney, isLocalhost, parseLocalDateInput, renderMaterialIcon } from './utils.js';
import { dialogService, enhanceCustomControls, refreshCustomControls } from './ui/components/customControls.js?v=5';
import { getActiveProductCatalog, loadProductCatalog } from './services/products.js?v=2';

const PASSWORD = "xdxdxd123";
const WEEKDAYS = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'];
const DEFAULT_DATA_MONTHS = 2;
const PAYROLL_RATE = 30.5;

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
let productCatalog = null;
let adminListsPage = null;
let isFullDataLoaded = false;
let isLoadingFullData = false;
let monthlyReportCharts = [];
let monthlyReportGenerated = false;

document.addEventListener('DOMContentLoaded', async () => {
    if (!isLocalhost()) {
        document.body.style.display = 'block';
        const pass = await dialogService.prompt("Podaj hasło administratora.", "Burbone Admin", { type: 'password' });
        if (pass !== PASSWORD) return location.href = "index.html";
    }
    document.body.style.display = 'block';

    setupAdminPages();
    productCatalog = getActiveProductCatalog(await loadProductCatalog());
    await adminProducts.init(document.getElementById('adminProductsPage'));
    adminListsPage = createAdminListsPage({
        getAllData: () => allData,
        getProductCatalog: () => productCatalog,
        buildSymbolIcon: (...args) => adminRender.buildSymbolIcon(...args)
    });

    allData = await apiService.fetchAllData({ recentMonths: DEFAULT_DATA_MONTHS });
    if (!allData.length) {
        document.getElementById('loading').innerText = "Brak danych";
        hideGlobalLoader();
        return;
    }

    processedData = analytics.processReports(allData);
    adminListsPage.init();
    initUI(processedData);
});

function initUI(data) {
    populateMonthFilter(data);
    populateLocationFilter(data);
    populateWeekdayFilter();
    enhanceCustomControls();
    setupListeners();

    const monthSelect = document.getElementById('monthFilter');
    if (monthSelect.options.length > 0) {
        monthSelect.selectedIndex = 0;
        handleMonthChange(data);
    }

    document.getElementById('loading').style.display = 'none';
    document.getElementById('revenueTable').style.display = 'table';
    hideGlobalLoader();

    initCalculator();
}

function setupAdminPages() {
    document.getElementById('loadAllDataBtn')?.addEventListener('click', loadFullDataInBackground);
    document.querySelectorAll('.admin-page-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            await switchAdminPage(tab.dataset.adminTab);
        });
    });
    switchAdminPage('revenue');
}

async function loadFullDataInBackground() {
    if (isLoadingFullData || isFullDataLoaded) return;

    const button = document.getElementById('loadAllDataBtn');
    isLoadingFullData = true;
    setLoadAllButtonState(button, 'Pobieranie 0%', true);

    try {
        const fullData = await apiService.fetchAllData({
            onProgress: progress => {
                setLoadAllButtonState(button, `Pobieranie ${progress.percent}%`, true);
            }
        });

        if (!fullData.length) {
            setLoadAllButtonState(button, 'Brak danych', false);
            return;
        }

        isFullDataLoaded = true;
        applyLoadedData(fullData);
        setLoadAllButtonState(button, 'Pobrano wszystko', false, true);
    } catch (error) {
        console.error(error);
        setLoadAllButtonState(button, 'Błąd pobierania', false);
    } finally {
        isLoadingFullData = false;
    }
}

function setLoadAllButtonState(button, label, busy, done = false) {
    if (!button) return;
    button.disabled = busy || done;
    button.classList.toggle('is-saving', busy);
    button.classList.toggle('is-clean', done);
    button.innerHTML = `
        <span class="material-symbols-rounded admin-load-all-icon ${busy || done ? '' : 'is-attention'}" aria-hidden="true">${done ? 'check' : 'database'}</span>
        ${escapeHtml(label)}
    `;
}

function applyLoadedData(data) {
    const activeMonth = document.getElementById('monthFilter')?.value || '';

    allData = data;
    processedData = analytics.processReports(allData);
    currentData = [];
    currentWeeks = [];
    activeWeekKey = 'all';

    populateMonthFilter(processedData);
    restoreMonthSelection(activeMonth);
    populateLocationFilter(processedData);
    adminListsPage.refresh();
    refreshCustomControls();

    if (document.getElementById('monthFilter').options.length > 0) {
        handleMonthChange(processedData);
    }

    payrollCalculator?.refresh();
    if (monthlyReportGenerated) generateMonthlyReport({ skipFetch: true });
}

function restoreMonthSelection(value) {
    const select = document.getElementById('monthFilter');
    if (!select) return;
    if (value && Array.from(select.options).some(option => option.value === value)) {
        select.value = value;
        return;
    }
    select.selectedIndex = 0;
}

async function switchAdminPage(pageName) {
    const currentTab = document.querySelector('.admin-page-tab.is-active')?.dataset.adminTab;
    if (currentTab === pageName) return;
    if (currentTab === 'products' && !(await adminProducts.confirmDiscardChanges())) return;

    document.querySelectorAll('.admin-page-tab').forEach(tab => {
        const active = tab.dataset.adminTab === pageName;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    document.querySelectorAll('[data-admin-page]').forEach(section => {
        section.hidden = section.dataset.adminPage !== pageName;
    });

    if (pageName === 'monthlyReport' && !monthlyReportGenerated) {
        await generateMonthlyReport();
    }
}

function hideGlobalLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.style.display = 'none', 500);
    }
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
    refreshCustomControls();
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

    ['dateFromFilter', 'dateToFilter', 'locationFilter', 'weekdayFilter'].forEach(id => {
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

        const [year, month] = document.getElementById('monthFilter').value.split('-');
        syncDateFiltersToMonth(year, month);
        revenueSort = { key: 'date', direction: 'desc' };
        syncSortSelect();
        refreshCustomControls();
        updateView();
    });
}

function syncSortSelect() {
    const select = document.getElementById('sortFilter');
    const value = `${revenueSort.key}_${revenueSort.direction}`;
    if (Array.from(select.options).some(option => option.value === value)) {
        select.value = value;
        refreshCustomControls(select.parentElement || document);
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

async function generateMonthlyReport(options = {}) {
    const { skipFetch = false } = options;
    const status = document.getElementById('monthlyReportStatus');
    const content = document.getElementById('monthlyReportContent');
    const button = document.getElementById('generateMonthlyReportBtn');
    if (!status || !content) return;

    setMonthlyReportStatus('Przygotowuję raport...', 'loading');
    if (button) button.disabled = true;

    try {
        if (!skipFetch) await ensureMonthlyReportData();

        const report = buildMonthlyReport(processedData);
        if (!report.current.days.length || !report.previous.days.length) {
            destroyMonthlyReportCharts();
            content.innerHTML = '';
            setMonthlyReportStatus('Brakuje danych z jednego z porównywanych miesięcy.', 'empty');
            return;
        }

        renderMonthlyReport(report);
        monthlyReportGenerated = true;
        setMonthlyReportStatus('', 'ready');
    } catch (error) {
        console.error(error);
        setMonthlyReportStatus('Nie udało się wygenerować raportu.', 'error');
    } finally {
        if (button) button.disabled = false;
    }
}

async function ensureMonthlyReportData() {
    const { current, previous } = getReportMonthPair();
    const monthKeys = new Set(processedData.map(day => getMonthKey(day.dateObj)));
    if (monthKeys.has(current.key) && monthKeys.has(previous.key)) return;

    const button = document.getElementById('loadAllDataBtn');
    isLoadingFullData = true;
    setLoadAllButtonState(button, 'Pobieranie 0%', true);
    setMonthlyReportStatus('Pobieram pełną historię, żeby porównać dwa zamknięte miesiące...', 'loading');

    try {
        const fullData = await apiService.fetchAllData({
            onProgress: progress => setLoadAllButtonState(button, `Pobieranie ${progress.percent}%`, true)
        });

        if (!fullData.length) throw new Error('No reports available');
        isFullDataLoaded = true;
        applyLoadedData(fullData);
        setLoadAllButtonState(button, 'Pobrano wszystko', false, true);
    } finally {
        isLoadingFullData = false;
    }
}

function buildMonthlyReport(data) {
    const pair = getReportMonthPair();
    const currentDays = analytics.filterByMonth(data, pair.current.year, pair.current.month);
    const previousDays = analytics.filterByMonth(data, pair.previous.year, pair.previous.month);

    const current = summarizeMonth(pair.current, currentDays);
    const previous = summarizeMonth(pair.previous, previousDays);
    const employeeRows = mergeNamedRows(current.employees, previous.employees, 'hours')
        .sort((left, right) => right.current - left.current)
        .slice(0, 12);
    const productRows = mergeNamedRows(current.products, previous.products, 'quantity')
        .sort((left, right) => right.current - left.current)
        .slice(0, 12);

    return { current, previous, employeeRows, productRows };
}

function summarizeMonth(month, days) {
    const total = days.reduce((sum, day) => sum + day.total, 0);
    const card = days.reduce((sum, day) => sum + day.cardTotal, 0);
    const glovo = days.reduce((sum, day) => sum + day.glovoNetTotal, 0);
    const cashDesk = days.reduce((sum, day) => sum + day.cashDeskTotal, 0);
    const employees = analytics.calculateEmployeeStats(days)
        .map(employee => ({
            ...employee,
            payroll: employee.hours * PAYROLL_RATE
        }));
    const products = aggregateProducts(days);
    const locations = adminRender.aggregateLocations(days);
    const bestDay = [...days].sort((left, right) => right.total - left.total)[0];
    const worstDay = [...days].sort((left, right) => left.total - right.total)[0];

    return {
        ...month,
        days,
        label: formatMonthLabel(month.year, month.month),
        total,
        card,
        glovo,
        cashDesk,
        averageDay: days.length ? total / days.length : 0,
        employees,
        products,
        locations,
        bestDay,
        worstDay
    };
}

function aggregateProducts(days) {
    const map = new Map();
    days.forEach(day => {
        day.rawReports?.forEach(report => {
            Object.entries(report.products || {}).forEach(([name, value]) => {
                const quantity = Number(value) || 0;
                if (!quantity) return;
                map.set(name, (map.get(name) || 0) + quantity);
            });
        });
    });

    return Array.from(map.entries())
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((left, right) => right.quantity - left.quantity);
}

function mergeNamedRows(currentRows, previousRows, valueKey) {
    const names = new Set([...currentRows.map(row => row.name), ...previousRows.map(row => row.name)]);
    return Array.from(names).map(name => {
        const current = currentRows.find(row => row.name === name);
        const previous = previousRows.find(row => row.name === name);
        const currentValue = current?.[valueKey] || 0;
        const previousValue = previous?.[valueKey] || 0;
        return {
            name,
            current: currentValue,
            previous: previousValue,
            delta: currentValue - previousValue,
            currentRow: current,
            previousRow: previous
        };
    });
}

function renderMonthlyReport(report) {
    const content = document.getElementById('monthlyReportContent');
    if (!content) return;

    destroyMonthlyReportCharts();
    content.innerHTML = `
        <div class="monthly-report-range">
            <span>${renderMaterialIcon('calendar_month', 'summary-icon-badge')} Analizowany okres</span>
            <strong>${escapeHtml(report.previous.label)} → ${escapeHtml(report.current.label)}</strong>
            <p>Porównanie pokazuje zmianę w nowszym miesiącu względem wcześniejszego.</p>
        </div>

        <div class="monthly-report-summary">
            ${renderMonthlyKpi('Utarg', report.current.total, report.previous.total, 'monitoring', true)}
            ${renderMonthlyKpi('Średnio / dzień', report.current.averageDay, report.previous.averageDay, 'calendar_month', true)}
            ${renderMonthlyKpi('Karty', report.current.card, report.previous.card, 'credit_card', true)}
            ${renderMonthlyKpi('Glovo', report.current.glovo, report.previous.glovo, 'takeout_dining', true)}
            ${renderMonthlyKpi('Wypłaty 30.50', getPayrollTotal(report.current), getPayrollTotal(report.previous), 'payments', true)}
            ${renderMonthlyKpi('Utarg / roboczogodzina', getRevenuePerHour(report.current), getRevenuePerHour(report.previous), 'speed', true)}
        </div>

        <div class="monthly-report-grid">
            <div class="chart-card monthly-report-chart">
                <div class="section-heading">
                    <h3>Utarg dzień do dnia</h3>
                    <p>${escapeHtml(report.previous.label)} jako baza, ${escapeHtml(report.current.label)} jako miesiąc porównywany.</p>
                </div>
                <div class="chart-wrapper"><canvas id="monthlyRevenueChart"></canvas></div>
            </div>
            <div class="chart-card monthly-report-chart">
                <div class="section-heading">
                    <h3>Karty i gotówka</h3>
                    <p>Porównanie głównych form płatności w obu miesiącach.</p>
                </div>
                <div class="chart-wrapper"><canvas id="monthlyChannelsChart"></canvas></div>
            </div>
        </div>

        <div class="monthly-report-grid">
            <div class="chart-card monthly-report-chart monthly-report-chart--glovo">
                <div class="section-heading">
                    <h3>Glovo dzień do dnia</h3>
                    <p>Wartości po odjęciu 30% prowizji.</p>
                </div>
                <div class="chart-wrapper"><canvas id="monthlyGlovoChart"></canvas></div>
            </div>
            ${renderMonthlyEfficiencyPanel(report)}
        </div>

        <div class="monthly-report-grid monthly-report-grid--three">
            ${renderMonthlyHighlights(report)}
            ${renderMonthlyLocationTable(report)}
            ${renderMonthlyPayrollTable(report)}
        </div>

        <div class="monthly-report-grid">
            <div class="chart-card monthly-report-chart">
                <div class="section-heading">
                    <h3>Najczęściej zamawiane produkty</h3>
                    <p>Ilości z list produktów zapisanych w raportach.</p>
                </div>
                <div class="chart-wrapper"><canvas id="monthlyProductsChart"></canvas></div>
            </div>
            ${renderMonthlyProductTable(report)}
        </div>
    `;

    renderMonthlyCharts(report);
}

function renderMonthlyKpi(label, current, previous, icon, money = false) {
    const delta = current - previous;
    const deltaClass = getDeltaClass(delta);
    const display = money ? formatMoney(current) : current.toFixed(1);
    return `
        <div class="summary-box monthly-kpi">
            <span class="summary-kicker">${renderMaterialIcon(icon, 'summary-icon-badge')} ${escapeHtml(label)}</span>
            <p>${display}</p>
            <small><span class="monthly-delta ${deltaClass}">${formatSignedValue(delta, money)}</span> / ${formatPercentDelta(current, previous)}</small>
        </div>
    `;
}

function renderMonthlyHighlights(report) {
    const currentLeader = report.current.employees[0];
    const previousLeader = report.previous.employees[0];
    return `
        <div class="chart-card monthly-report-panel">
            <div class="section-heading">
                <h3>Najważniejsze sygnały</h3>
            </div>
            <div class="monthly-highlight-list">
                ${renderHighlight('Najlepszy dzień', report.current.bestDay ? `${report.current.bestDay.dateStr} / ${formatMoney(report.current.bestDay.total)}` : '-')}
                ${renderHighlight('Najsłabszy dzień', report.current.worstDay ? `${report.current.worstDay.dateStr} / ${formatMoney(report.current.worstDay.total)}` : '-')}
                ${renderHighlight('Najwięcej godzin', currentLeader ? `${currentLeader.name} / ${currentLeader.hours.toFixed(1)} h` : '-')}
                ${renderHighlight('Lider poprzednio', previousLeader ? `${previousLeader.name} / ${previousLeader.hours.toFixed(1)} h` : '-')}
            </div>
        </div>
    `;
}

function renderMonthlyEfficiencyPanel(report) {
    const currentPayrollShare = getPayrollShare(report.current);
    const previousPayrollShare = getPayrollShare(report.previous);
    const currentHours = getEmployeeHoursTotal(report.current);
    const previousHours = getEmployeeHoursTotal(report.previous);
    const currentProductUnits = getProductUnitsTotal(report.current);
    const previousProductUnits = getProductUnitsTotal(report.previous);
    const currentProductsPerHour = getProductsPerHour(report.current);
    const previousProductsPerHour = getProductsPerHour(report.previous);
    const currentDailyLaborCost = getDailyLaborCost(report.current);
    const previousDailyLaborCost = getDailyLaborCost(report.previous);
    const currentBestLocation = report.current.locations[0];
    const previousBestLocation = report.previous.locations.find(location => location.name === currentBestLocation?.name);

    return `
        <div class="chart-card monthly-report-panel">
            <div class="section-heading">
                <h3>Efektywność operacyjna</h3>
                <p>Wskaźniki pokazujące, czy sprzedaż rosła szybciej niż czas pracy i koszty zmian.</p>
            </div>
            <div class="monthly-efficiency-grid">
                ${renderEfficiencyCard(
                    'Utarg / roboczogodzina',
                    formatMoney(getRevenuePerHour(report.current)),
                    getRevenuePerHour(report.current) - getRevenuePerHour(report.previous),
                    true,
                    'Ile utargu przypada na jedną przepracowaną godzinę. Wyżej oznacza, że zespół robi większy obrót tym samym czasem pracy.'
                )}
                ${renderEfficiencyCard(
                    'Udział wypłat w utargu',
                    `${currentPayrollShare.toFixed(1)}%`,
                    currentPayrollShare - previousPayrollShare,
                    false,
                    'Szacowany koszt wypłat przy stawce 30.50 jako procent utargu. Niżej jest lepiej, bo mniej obrotu idzie na godziny pracy.',
                    ' pp',
                    true
                )}
                ${renderEfficiencyCard(
                    'Średni koszt zmian / dzień',
                    formatMoney(currentDailyLaborCost),
                    currentDailyLaborCost - previousDailyLaborCost,
                    true,
                    'Średnia dzienna kwota wypłat w analizowanym miesiącu. Pomaga sprawdzić, czy grafiki nie urosły szybciej niż sprzedaż.',
                    '',
                    true
                )}
                ${renderEfficiencyCard(
                    'Przepracowane godziny',
                    `${currentHours.toFixed(1)} h`,
                    currentHours - previousHours,
                    false,
                    'Suma godzin wpisanych w raportach. Warto porównać tę zmianę ze zmianą utargu.',
                    ' h'
                )}
                ${renderEfficiencyCard(
                    'Produkty / roboczogodzina',
                    `${currentProductsPerHour.toFixed(1)} szt.`,
                    currentProductsPerHour - previousProductsPerHour,
                    false,
                    'Ile pozycji z list produktów przypada na jedną godzinę pracy. To przybliżony wskaźnik obciążenia operacyjnego.',
                    ' szt.'
                )}
                ${renderEfficiencyCard(
                    currentBestLocation ? `Najmocniejszy punkt: ${currentBestLocation.name}` : 'Najmocniejszy punkt',
                    currentBestLocation ? formatMoney(currentBestLocation.avgDay) : '-',
                    (currentBestLocation?.avgDay || 0) - (previousBestLocation?.avgDay || 0),
                    true,
                    'Średni dzienny utarg najlepszego punktu w nowszym miesiącu w porównaniu do tego samego punktu wcześniej.'
                )}
            </div>
        </div>
    `;
}

function renderEfficiencyCard(label, value, delta, money, description, suffix = '', lowerIsBetter = false) {
    return `
        <div class="monthly-efficiency-card">
            <div class="monthly-efficiency-card__head">
                <span>${escapeHtml(label)}</span>
                <em class="${getDeltaClass(delta, lowerIsBetter)}">${formatSignedValue(delta, money, suffix)}</em>
            </div>
            <strong>${escapeHtml(value)}</strong>
            <p>${escapeHtml(description)}</p>
        </div>
    `;
}

function renderHighlight(label, value) {
    return `
        <div class="monthly-highlight">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
        </div>
    `;
}

function renderMonthlyLocationTable(report) {
    const rows = mergeNamedRows(report.current.locations, report.previous.locations, 'total')
        .sort((left, right) => right.current - left.current);
    return `
        <div class="chart-card monthly-report-panel">
            <div class="section-heading">
                <h3>Punkty</h3>
            </div>
            <div class="monthly-mini-table">
                ${rows.map(row => renderMetricRow(row.name, formatMoney(row.current), row.delta, true)).join('')}
            </div>
        </div>
    `;
}

function renderMonthlyPayrollTable(report) {
    return `
        <div class="chart-card monthly-report-panel">
            <div class="section-heading">
                <h3>Pracownicy i wypłaty</h3>
            </div>
            <div class="monthly-mini-table">
                ${report.employeeRows.map(row => {
                    const payroll = (row.currentRow?.payroll || 0);
                    return renderMetricRow(row.name, `${row.current.toFixed(1)} h / ${formatMoney(payroll)}`, row.delta, false, ' h');
                }).join('')}
            </div>
        </div>
    `;
}

function renderMonthlyProductTable(report) {
    return `
        <div class="chart-card monthly-report-panel">
            <div class="section-heading">
                <h3>Produkty</h3>
            </div>
            <div class="monthly-mini-table monthly-mini-table--products">
                ${report.productRows.map(row => renderMetricRow(row.name, `${Math.round(row.current)} szt.`, row.delta, false, ' szt.')).join('')}
            </div>
        </div>
    `;
}

function renderMetricRow(name, value, delta, money, suffix = '') {
    return `
        <div class="monthly-metric-row">
            <span>${escapeHtml(name)}</span>
            <strong>${escapeHtml(value)}</strong>
            <em class="${getDeltaClass(delta)}">${formatSignedValue(delta, money, suffix)}</em>
        </div>
    `;
}

function renderMonthlyCharts(report) {
    const styles = getComputedStyle(document.documentElement);
    const primary = styles.getPropertyValue('--primary-color').trim();
    const success = styles.getPropertyValue('--success-color').trim();
    const info = styles.getPropertyValue('--app-info').trim();
    const warning = styles.getPropertyValue('--glovo-color').trim();
    const muted = styles.getPropertyValue('--text-muted').trim();
    Chart.defaults.font.family = styles.getPropertyValue('--ds-font-family-body').trim() || 'sans-serif';
    Chart.defaults.color = styles.getPropertyValue('--text-secondary').trim() || '#C8BAB3';

    const dayLabels = buildDayLabels(report);
    monthlyReportCharts.push(new Chart(document.getElementById('monthlyRevenueChart'), {
        type: 'line',
        data: {
            labels: dayLabels,
            datasets: [
                buildMonthlyLineDataset(report.previous, dayLabels, info, 'total'),
                buildMonthlyLineDataset(report.current, dayLabels, primary, 'total')
            ]
        },
        options: buildMonthlyChartOptions()
    }));

    monthlyReportCharts.push(new Chart(document.getElementById('monthlyChannelsChart'), {
        type: 'bar',
        data: {
            labels: ['Karty', 'Gotówka'],
            datasets: [
                {
                    label: report.previous.label,
                    data: [report.previous.card, report.previous.cashDesk],
                    backgroundColor: info
                },
                {
                    label: report.current.label,
                    data: [report.current.card, report.current.cashDesk],
                    backgroundColor: primary
                }
            ]
        },
        options: buildMonthlyChartOptions()
    }));

    monthlyReportCharts.push(new Chart(document.getElementById('monthlyGlovoChart'), {
        type: 'line',
        data: {
            labels: dayLabels,
            datasets: [
                buildMonthlyLineDataset(report.previous, dayLabels, muted, 'glovo'),
                buildMonthlyLineDataset(report.current, dayLabels, warning, 'glovo')
            ]
        },
        options: buildMonthlyChartOptions()
    }));

    monthlyReportCharts.push(new Chart(document.getElementById('monthlyProductsChart'), {
        type: 'bar',
        data: {
            labels: report.productRows.slice(0, 8).map(row => row.name),
            datasets: [
                {
                    label: report.previous.label,
                    data: report.productRows.slice(0, 8).map(row => row.previous),
                    backgroundColor: info
                },
                {
                    label: report.current.label,
                    data: report.productRows.slice(0, 8).map(row => row.current),
                    backgroundColor: success
                }
            ]
        },
        options: {
            ...buildMonthlyChartOptions(),
            plugins: {
                legend: {
                    labels: {
                        font: { family: styles.getPropertyValue('--ds-font-family-heading').trim() || 'sans-serif' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: context => `${context.dataset.label}: ${Math.round(context.raw || 0)} szt.`
                    }
                }
            },
            indexAxis: 'y',
            scales: {
                x: { beginAtZero: true, grid: { color: muted } },
                y: { grid: { display: false } }
            }
        }
    }));
}

function buildMonthlyLineDataset(month, labels, color, metric) {
    const map = new Map(month.days.map(day => [day.dateObj.getDate(), getMonthlyDayMetric(day, metric)]));
    return {
        label: month.label,
        data: labels.map(day => map.get(Number(day)) || null),
        borderColor: color,
        backgroundColor: color,
        borderWidth: 3,
        tension: 0.32,
        pointRadius: 3,
        spanGaps: true
    };
}

function getMonthlyDayMetric(day, metric) {
    if (metric === 'glovo') return day.glovoNetTotal || 0;
    return day.total || 0;
}

function buildMonthlyChartOptions() {
    const styles = getComputedStyle(document.documentElement);
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    font: { family: styles.getPropertyValue('--ds-font-family-heading').trim() || 'sans-serif' }
                }
            },
            tooltip: {
                callbacks: {
                    label: context => `${context.dataset.label}: ${formatMoney(context.raw || 0)}`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: styles.getPropertyValue('--border-color').trim() },
                ticks: { callback: value => `${Math.round(value)} zł` }
            },
            x: { grid: { display: false } }
        }
    };
}

function buildDayLabels(report) {
    const currentDays = new Date(report.current.year, report.current.month, 0).getDate();
    const previousDays = new Date(report.previous.year, report.previous.month, 0).getDate();
    return Array.from({ length: Math.max(currentDays, previousDays) }, (_, index) => String(index + 1));
}

function destroyMonthlyReportCharts() {
    monthlyReportCharts.forEach(chart => chart.destroy());
    monthlyReportCharts = [];
}

function setMonthlyReportStatus(message, state) {
    const status = document.getElementById('monthlyReportStatus');
    if (!status) return;
    status.className = `monthly-report-status monthly-report-status--${state}`;
    status.textContent = message;
}

function getReportMonthPair(referenceDate = new Date()) {
    const currentDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    const previousDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 2, 1);
    return {
        current: toMonthMeta(currentDate),
        previous: toMonthMeta(previousDate)
    };
}

function toMonthMeta(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return {
        year,
        month,
        key: `${year}-${String(month).padStart(2, '0')}`
    };
}

function getMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(year, month) {
    const date = new Date(year, month - 1, 1);
    const label = date.toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

function getPayrollTotal(month) {
    return month.employees.reduce((sum, employee) => sum + employee.payroll, 0);
}

function getEmployeeHoursTotal(month) {
    return month.employees.reduce((sum, employee) => sum + employee.hours, 0);
}

function getRevenuePerHour(month) {
    const hours = getEmployeeHoursTotal(month);
    return hours ? month.total / hours : 0;
}

function getProductsPerHour(month) {
    const hours = getEmployeeHoursTotal(month);
    return hours ? getProductUnitsTotal(month) / hours : 0;
}

function getPayrollShare(month) {
    return month.total ? (getPayrollTotal(month) / month.total) * 100 : 0;
}

function getDailyLaborCost(month) {
    return month.days.length ? getPayrollTotal(month) / month.days.length : 0;
}

function getProductUnitsTotal(month) {
    return month.products.reduce((sum, product) => sum + product.quantity, 0);
}

function formatSignedValue(value, money, suffix = '') {
    const sign = value > 0 ? '+' : '';
    if (money) return `${sign}${formatMoney(value)}`;
    return `${sign}${value.toFixed(1)}${suffix}`;
}

function formatPercentDelta(current, previous) {
    if (!previous) return current ? '+100.0%' : '0.0%';
    const value = ((current - previous) / previous) * 100;
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function getDeltaClass(value, lowerIsBetter = false) {
    if (value > 0) return lowerIsBetter ? 'is-negative' : 'is-positive';
    if (value < 0) return lowerIsBetter ? 'is-positive' : 'is-negative';
    return 'is-neutral';
}

function compareRevenueRows(a, b, sort) {
    const multiplier = sort.direction === 'asc' ? 1 : -1;

    if (sort.key === 'date') return (a.timestamp - b.timestamp) * multiplier;
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
    const from = document.getElementById('dateFromFilter').value;
    const to = document.getElementById('dateToFilter').value;

    labels.push('Glovo');
    if (location !== 'all') labels.push(location);
    if (weekday !== 'all') labels.push(weekday);
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
