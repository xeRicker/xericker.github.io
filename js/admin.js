import { apiService } from './services/api.js';
import { analytics } from './services/analytics.js';
import { adminRender } from './ui/adminRender.js?v=2';
import { adminProducts } from './ui/adminProducts.js?v=3';
import { setupPayrollCalculator } from './ui/payrollCalculator.js';
import { escapeHtml, fallbackCopyToClipboard, isLocalhost, parseLocalDateInput } from './utils.js';
import { dialogService, enhanceCustomControls, refreshCustomControls } from './ui/components/customControls.js?v=5';
import { buildReportText } from './services/reportFormatter.js';
import { getActiveProductCatalog, loadProductCatalog } from './services/products.js?v=2';

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
let productCatalog = null;
let selectedListKey = null;

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

    allData = await apiService.fetchAllData();
    if (!allData.length) {
        document.getElementById('loading').innerText = "Brak danych";
        hideGlobalLoader();
        return;
    }

    processedData = analytics.processReports(allData);
    initListsPage();
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
    document.getElementById('lastUpdate').innerText = new Date().toLocaleString('pl-PL');

    hideGlobalLoader();

    initCalculator();
}

function setupAdminPages() {
    document.querySelectorAll('.admin-page-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            await switchAdminPage(tab.dataset.adminTab);
        });
    });
    switchAdminPage('revenue');
}

function initListsPage() {
    populateListLocationFilter();
    setupListListeners();
    renderListsPage();
}

function populateListLocationFilter() {
    const select = document.getElementById('listLocationFilter');
    const locations = Array.from(new Set(allData.map(report => report.location).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, 'pl'));

    select.innerHTML = [
        '<option value="all">Wszystkie punkty</option>',
        ...locations.map(location => `<option value="${escapeHtml(location)}">${escapeHtml(location)}</option>`)
    ].join('');
}

function setupListListeners() {
    document.getElementById('listLocationFilter').addEventListener('change', () => {
        selectedListKey = null;
        renderListsPage();
    });

    document.getElementById('listSearchInput').addEventListener('input', () => {
        selectedListKey = null;
        renderListsPage();
    });

    document.getElementById('adminListsContent').addEventListener('click', async event => {
        const previewButton = event.target.closest('[data-list-preview]');
        const copyButton = event.target.closest('[data-list-copy]');

        if (previewButton) {
            selectedListKey = previewButton.dataset.listPreview;
            renderListsPage();
            return;
        }

        if (copyButton) {
            const report = findReportByKey(copyButton.dataset.listCopy);
            if (!report) return;
            await copyReportText(report, copyButton);
        }
    });
}

function renderListsPage() {
    const container = document.getElementById('adminListsContent');
    const reports = getFilteredListReports();
    const selectedReport = reports.find(report => getReportKey(report) === selectedListKey) || reports[0] || null;
    selectedListKey = selectedReport ? getReportKey(selectedReport) : null;

    if (!reports.length) {
        container.innerHTML = `
            <div class="admin-list-empty">
                <span class="material-symbols-rounded" aria-hidden="true">content_paste_search</span>
                <strong>Brak list</strong>
                <p>Nie znaleziono zapisanych raportów dla wybranych filtrów.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <section class="admin-category-card admin-list-panel">
            <div class="admin-category-head">
                <div class="admin-category-title">
                    <span class="material-symbols-rounded category-icon" aria-hidden="true">content_paste</span>
                    <div>
                        <h4>Zapisane raporty</h4>
                        <span>${reports.length} ${formatListCount(reports.length)}</span>
                    </div>
                </div>
            </div>
            <div class="admin-product-list admin-list-items">
                ${reports.map(report => renderListItem(report, selectedListKey)).join('')}
            </div>
        </section>
        <section class="admin-category-card admin-list-preview">
            ${renderListPreview(selectedReport)}
        </section>
    `;
}

function getFilteredListReports() {
    const location = document.getElementById('listLocationFilter').value;
    const query = document.getElementById('listSearchInput').value.trim().toLowerCase();

    return [...allData]
        .filter(report => report?.date && report?.location)
        .filter(report => location === 'all' || report.location === location)
        .filter(report => {
            if (!query) return true;
            return `${report.location} ${report.date}`.toLowerCase().includes(query);
        })
        .sort((left, right) => parseReportTimestamp(right) - parseReportTimestamp(left));
}

function renderListItem(report, activeKey) {
    const key = getReportKey(report);
    const productsCount = Object.values(report.products || {}).filter(value => Number(value) > 0 || value === true).length;
    const employeesCount = Object.keys(report.employees || {}).length;

    return `
        <button class="admin-product-row admin-list-item ${key === activeKey ? 'is-active' : ''}" type="button" data-list-preview="${escapeHtml(key)}">
            <span class="material-symbols-rounded drag-handle" aria-hidden="true">receipt_long</span>
            <span class="admin-list-item__main">
                <strong>${escapeHtml(report.date)}</strong>
                <span>${escapeHtml(report.location)} / ${employeesCount} prac. / ${productsCount} prod.</span>
            </span>
            <span class="material-symbols-rounded admin-list-item__chevron" aria-hidden="true">chevron_right</span>
        </button>
    `;
}

function renderListPreview(report) {
    if (!report) return '';

    const text = buildReportText(report, productCatalog);

    return `
        <div class="admin-list-preview__head">
            <div>
                <span class="summary-kicker">${adminRender.buildSymbolIcon('receipt_long')} Podgląd listy</span>
                <h3>${escapeHtml(report.location)} / ${escapeHtml(report.date)}</h3>
            </div>
            <button class="btn-back admin-save-btn has-unsaved-changes" type="button" data-list-copy="${escapeHtml(getReportKey(report))}">
                <span class="material-symbols-rounded" aria-hidden="true">content_copy</span>
                Kopiuj
            </button>
        </div>
        <pre class="admin-list-copy-preview">${escapeHtml(text)}</pre>
    `;
}

async function copyReportText(report, button) {
    const text = buildReportText(report, productCatalog);

    try {
        await navigator.clipboard.writeText(text);
    } catch {
        fallbackCopyToClipboard(text);
    }

    button.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">check</span> Skopiowano';
    button.classList.add('is-copied');
    setTimeout(() => {
        button.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">content_copy</span> Kopiuj';
        button.classList.remove('is-copied');
    }, 1800);
}

function getReportKey(report) {
    return `${report.location}|${report.date}`;
}

function findReportByKey(key) {
    if (!key) return null;
    return allData.find(report => getReportKey(report) === key) || null;
}

function parseReportTimestamp(report) {
    const [day, month, year] = report.date.split('.').map(Number);
    return new Date(year, month - 1, day).getTime();
}

function formatListCount(count) {
    if (count === 1) return 'lista';
    if (count >= 2 && count <= 4) return 'listy';
    return 'list';
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

    labels.push('Glovo netto');
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
