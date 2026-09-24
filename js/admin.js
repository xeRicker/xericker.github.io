import { apiService } from './services/api.js?v=69';
import { analytics } from './services/analytics.js';
import { reportDateToIso } from './services/reportDates.js';
import { adminRender } from './ui/adminRender.js?v=69';
import { adminProducts } from './ui/adminProducts.js?v=65';
import { createAdminListsPage } from './ui/adminLists.js?v=65';
import { setupPayrollCalculator } from './ui/payrollCalculator.js?v=65';
import { setupPayslipGenerator } from './ui/payslip.js?v=2';
import { escapeHtml, isLocalhost, renderMaterialIcon } from './utils.js';
import { dialogService, enhanceCustomControls, refreshCustomControls } from './ui/components/customControls.js?v=72';
import { getActiveProductCatalog, loadProductCatalog } from './services/products.js?v=62';
import { getEmployeeDisplayName, isEmployeeVisible, loadEmployeeCatalog, resolveEmployee } from './services/employees.js?v=67';
import { adminEmployees } from './ui/adminEmployees.js?v=70';
import { adminLocations } from './ui/adminLocations.js?v=73';
import { adminPayments } from './ui/adminPayments.js?v=2';
import { createLocationResolver, loadLocationCatalog } from './services/locations.js?v=68';
import { getPaymentViews, getUpcomingPayments, summarizePayments } from './services/payments.js?v=1';
import { clearAdminAccess, hasValidAdminAccess, isAdminLogoutRequested, requestAdminAccess, saveAdminAccess } from './services/adminAccess.js?v=1';

const DEFAULT_DATA_MONTHS = 1;
const REVENUE_PAGE_SIZE = 14;
const HEATMAP_MONTHS_PER_PAGE = 1;

let allData = [];
let sourceData = [];
let statsData = [];
let processedData = [];
let currentData = [];
let currentWeeks = [];
let chartType = 'bar';
let chartDisplayMode = 'combined';
let chartRange = { from: '', to: '' };
let viewMode = 'total';
let currentViewData = [];
let revenuePage = 0;
let heatmapPage = 0;
let activeWeekKey = 'all';
let revenueSort = { key: 'date', direction: 'desc' };
let employeeSort = { key: 'name', direction: 'asc' };
let payrollCalculator = null;
let payslipGenerator = null;
let productCatalog = null;
let adminListsPage = null;
let isFullDataLoaded = false;
let isLoadingFullData = false;
let loadedMonthCount = 0;
let availableMonthCount = 0;
let employeeCatalog = null;
let locationCatalog = null;
let locationResolver = null;
let paymentsCatalog = null;

document.addEventListener('DOMContentLoaded', async () => {
    setAdminScrollLocked(true);
    try {
        if ((!isLocalhost() || isAdminLogoutRequested()) && !(await hasValidAdminAccess())) {
            document.body.style.display = 'block';
            if (!(await requestAdminAccess())) return location.href = "index.html";
            saveAdminAccess();
        }
        document.body.style.display = 'block';

        const rawData = await apiService.fetchAllData({ recentMonths: DEFAULT_DATA_MONTHS, onMeta: updateDataLoadInfo });
        if (!rawData.length) {
            showAdminUnavailable(new Error('GitHub nie zawiera raportów w wybranym zakresie.'));
            return;
        }

        setupAdminPages();
        productCatalog = getActiveProductCatalog(await loadProductCatalog());
        employeeCatalog = await loadEmployeeCatalog();
        locationCatalog = await loadLocationCatalog();
        locationResolver = createLocationResolver(locationCatalog);

        // Katalog punktów tłumaczy nazwy z historycznych list na bieżące nazwy
        // punktów, wycina archiwum i punkty pomijane w statystykach.
        sourceData = rawData;
        allData = applyLocationCatalog(sourceData);
        statsData = applyStatisticsFilter(allData);
        if (!allData.length) {
            showAdminUnavailable(new Error('Wszystkie punkty z wybranego zakresu są w archiwum.'));
            return;
        }

        await adminProducts.init(document.getElementById('adminProductsPage'));
        await adminEmployees.init(document.getElementById('adminEmployeesPage'));
        adminLocations.onSaved = catalog => {
            // Po zapisie katalogu widoki liczymy od nowa z surowych raportów, żeby
            // zmiana nazwy, przełączniki i archiwum działały bez przeładowania
            // strony — i żeby przywrócenie punktu odzyskało jego dane.
            locationCatalog = catalog;
            locationResolver = createLocationResolver(locationCatalog);
            applyLoadedData(sourceData);
        };
        await adminLocations.init(document.getElementById('adminLocationsPage'));
        adminPayments.onSaved = catalog => {
            paymentsCatalog = catalog;
            updateView();
        };
        await adminPayments.init(document.getElementById('adminPaymentsPage'));
        paymentsCatalog = adminPayments.getCatalog();
        adminListsPage = createAdminListsPage({
            getAllData: () => allData,
            getProductCatalog: () => productCatalog,
            getEmployeeCatalog: () => employeeCatalog,
            getLocationCatalog: () => locationCatalog,
            buildSymbolIcon: (...args) => adminRender.buildSymbolIcon(...args)
        });

        processedData = analytics.processReports(statsData);
        adminListsPage.init();
        initUI(processedData);
    } catch (error) {
        console.error('Admin panel unavailable.', error);
        showAdminUnavailable(error);
    }
});

/** Nazwy punktów z raportów sprowadza do katalogu i pomija punkty usunięte. */
function applyLocationCatalog(reports) {
    if (!locationResolver) return reports;
    return reports
        .filter(report => !locationResolver.isArchived(report.location))
        .map(report => {
            const name = locationResolver.nameFor(report.location);
            return name === report.location ? report : { ...report, location: name };
        });
}

/**
 * Zbiór do obliczeń: punkty pomijane w statystykach zostają w zapisanych
 * listach, ale nie wchodzą do utargów, godzin ani kalkulatora wypłat.
 */
function applyStatisticsFilter(reports) {
    if (!locationResolver) return reports;
    return reports.filter(report => locationResolver.inStatistics(report.location));
}

function showAdminUnavailable(error) {
    document.body.style.display = 'block';
    const loader = document.getElementById('globalLoader');
    if (!loader) return;

    const code = error?.status ? `HTTP ${error.status}` : 'Błąd połączenia';
    const details = error?.message || 'Nie udało się pobrać danych z GitHub.';
    loader.classList.remove('hidden');
    loader.innerHTML = `
        <div class="status-card status-card--danger" role="alert">
            ${renderMaterialIcon('cloud_off', 'status-card__icon')}
            <h1 class="status-card__title">Panel jest obecnie niedostępny</h1>
            <p class="status-card__text">Nie udało się załadować danych.</p>
            <p class="status-card__code">Kod błędu: ${escapeHtml(code)}</p>
            <p class="status-card__text">${escapeHtml(details)}</p>
        </div>
    `;
}

function setAdminScrollLocked(locked) {
    document.documentElement.classList.toggle('admin-scroll-locked', locked);
    document.body.classList.toggle('admin-scroll-locked', locked);
    document.documentElement.style.overflow = locked ? 'hidden' : '';
    document.body.style.overflow = locked ? 'hidden' : '';
}

function initUI(data) {
    populateMonthFilter(data);
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
    document.getElementById('loadDataRange')?.addEventListener('change', updateLoadButtonLabel);
    document.querySelectorAll('.admin-page-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            await switchAdminPage(tab.dataset.adminTab);
        });
    });
    switchAdminPage('revenue');
}

async function loadFullDataInBackground() {
    if (isLoadingFullData) return;

    const button = document.getElementById('loadAllDataBtn');
    const topProgressBar = document.getElementById('adminTopProgressBar');
    const selectedRange = Number(document.getElementById('loadDataRange')?.value || 0);
    if (selectedRange && loadedMonthCount >= Math.min(selectedRange, availableMonthCount || selectedRange)) return;
    if (!selectedRange && isFullDataLoaded) return;
    isLoadingFullData = true;
    setDataLoadStatus('', '');
    setLoadAllButtonState(button, 'Pobieranie 0%', true);
    if (topProgressBar) {
        topProgressBar.hidden = false;
        topProgressBar.style.width = '5%';
    }

    try {
        const fullData = await apiService.fetchAllData({
            recentMonths: selectedRange || null,
            onMeta: updateDataLoadInfo,
            onProgress: progress => {
                setLoadAllButtonState(button, `Pobieranie ${progress.percent}%`, true);
                if (topProgressBar) {
                    topProgressBar.style.width = `${Math.max(5, progress.percent)}%`;
                }
            }
        });

        if (!fullData.length) {
            setLoadAllButtonState(button, 'Brak danych', false);
            setDataLoadStatus('GitHub odpowiedział, ale nie znaleziono danych dla wybranego zakresu.', 'empty');
            if (topProgressBar) topProgressBar.hidden = true;
            return;
        }

        if (topProgressBar) topProgressBar.style.width = '100%';
        isFullDataLoaded = !selectedRange || loadedMonthCount >= availableMonthCount;
        applyLoadedData(fullData);
        setLoadAllButtonState(button, isFullDataLoaded ? 'Pobrano wszystko' : 'Dane załadowane', false, isFullDataLoaded);
    } catch (error) {
        console.error(error);
        setLoadAllButtonState(button, 'Błąd pobierania', false);
        setDataLoadStatus(formatDataLoadError(error), 'error');
    } finally {
        isLoadingFullData = false;
        if (topProgressBar) {
            setTimeout(() => {
                topProgressBar.hidden = true;
                topProgressBar.style.width = '0%';
            }, 600);
        }
    }
}

function setLoadAllButtonState(button, label, busy, done = false) {
    if (!button) return;
    button.disabled = busy || done;
    button.classList.toggle('is-saving', busy);
    button.classList.toggle('is-clean', done);
    button.classList.toggle('is-loaded', !busy && !done && label === 'Dane załadowane');
    button.innerHTML = `
        <span class="material-symbols-rounded admin-load-all-icon ${busy || done ? '' : 'is-attention'}" aria-hidden="true">${done || label === 'Dane załadowane' ? 'check' : 'database'}</span>
        ${escapeHtml(label)}
    `;
}

function formatDataLoadError(error) {
    const code = error?.status ? `HTTP ${error.status}` : 'Błąd połączenia';
    return `${code}: ${error?.message || 'Nie udało się połączyć z GitHubem.'}`;
}

function setDataLoadStatus(message, state) {
    const status = document.getElementById('dataLoadStatus');
    if (!status) return;
    status.hidden = !message;
    status.className = `admin-load-status ${state ? `admin-load-status--${state}` : ''}`;
    status.textContent = message;
}

function applyLoadedData(data) {
    const activeMonth = document.getElementById('monthFilter')?.value || '';

    sourceData = data;
    allData = applyLocationCatalog(sourceData);
    statsData = applyStatisticsFilter(allData);
    processedData = analytics.processReports(statsData);
    currentData = [];
    currentWeeks = [];
    activeWeekKey = 'all';

    populateMonthFilter(processedData);
    restoreMonthSelection(activeMonth);
    adminListsPage.refresh();
    refreshCustomControls();

    if (document.getElementById('monthFilter').options.length > 0) {
        handleMonthChange(processedData);
    }

    payrollCalculator?.refresh();
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
    if (currentTab === 'employees' && !(await adminEmployees.confirmDiscardChanges())) return;
    if (currentTab === 'locations' && !(await adminLocations.confirmDiscardChanges())) return;
    if (currentTab === 'payments' && !(await adminPayments.confirmDiscardChanges())) return;

    document.querySelectorAll('.admin-page-tab').forEach(tab => {
        const active = tab.dataset.adminTab === pageName;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    document.querySelectorAll('[data-admin-page]').forEach(section => {
        section.hidden = section.dataset.adminPage !== pageName;
    });

    if (pageName === 'lists') adminListsPage?.refresh();
}

function hideGlobalLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.classList.add('hidden');
        setAdminScrollLocked(false);
        setTimeout(() => loader.style.display = 'none', 500);
    }
}

function populateMonthFilter(data) {
    const select = document.getElementById('monthFilter');
    const months = Array.from(new Set(data.map(day => getMonthKey(day.dateObj)))).sort().reverse();

    const monthOptions = months.map(value => {
        const [year, month] = value.split('-');
        const monthName = new Date(year, month - 1, 1).toLocaleString('pl-PL', { month: 'long' });
        const label = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        return `<option value="${value}">${value} (${label})</option>`;
    });

    const allOption = months.length > 1 ? '<option value="all">Wszystkie</option>' : '';
    select.innerHTML = [...monthOptions, allOption].join('');
}

function handleMonthChange(fullData) {
    const value = document.getElementById('monthFilter').value;
    const isAllMonths = value === 'all';
    const [year, month] = value.split('-');

    currentData = isAllMonths
        ? fullData
        : analytics.filterByMonth(fullData, year, month);

    revenuePage = 0;
    heatmapPage = 0;
    populateChartRange(currentData);
    buildWeekTabs(currentData, isAllMonths ? { label: 'CAŁY OKRES', showWeeks: false } : {});
    activeWeekKey = 'all';
    updateView();

    if (isAllMonths) {
        const newest = fullData[0];
        const oldest = fullData[fullData.length - 1];
        if (newest && oldest) {
            payrollCalculator?.setDateRange(reportDateToIso(oldest.dateStr), reportDateToIso(newest.dateStr));
        }
        return;
    }

    const lastDay = new Date(year, month, 0).getDate();
    payrollCalculator?.setDateRange(
        `${year}-${month}-01`,
        `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    );
}

function buildWeekTabs(data, { label = 'CAŁY MIESIĄC', showWeeks = true } = {}) {
    const tabsContainer = document.getElementById('weekTabsContainer');
    tabsContainer.innerHTML = '';
    currentWeeks = [];

    tabsContainer.appendChild(createWeekTab('all', label, true));
    if (!showWeeks) return;

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

function createWeekTab(key, label, isActive = false) {
    const tab = document.createElement('div');
    tab.className = 'week-tab';
    tab.classList.toggle('active', isActive);
    tab.dataset.week = key;
    tab.innerText = label;
    tab.onclick = () => selectWeek(key);
    return tab;
}

function selectWeek(key) {
    activeWeekKey = key;
    document.querySelectorAll('.week-tab').forEach(node => node.classList.toggle('active', node.dataset.week === key));
    revenuePage = 0;
    heatmapPage = 0;
    updateView();
}

function setupListeners() {
    document.getElementById('monthFilter')?.addEventListener('change', () => handleMonthChange(processedData));

    document.getElementById('chartTypeSelect')?.addEventListener('change', event => {
        chartType = event.target.value;
        updateChart();
    });

    document.getElementById('chartDisplaySelect')?.addEventListener('change', event => {
        chartDisplayMode = event.target.value;
        updateChart();
    });

    document.getElementById('chartRangeFrom')?.addEventListener('change', event => {
        chartRange.from = event.target.value;
        if (chartRange.from > chartRange.to) {
            chartRange.to = chartRange.from;
            const toSelect = document.getElementById('chartRangeTo');
            if (toSelect) toSelect.value = chartRange.to;
            refreshCustomControls();
        }
        updateChart();
    });

    document.getElementById('chartRangeTo')?.addEventListener('change', event => {
        chartRange.to = event.target.value;
        if (chartRange.to < chartRange.from) {
            chartRange.from = chartRange.to;
            const fromSelect = document.getElementById('chartRangeFrom');
            if (fromSelect) fromSelect.value = chartRange.from;
            refreshCustomControls();
        }
        updateChart();
    });

    const viewModeButtons = document.querySelectorAll('.view-toggle .view-btn');
    viewModeButtons.forEach(button => {
        button.onclick = event => {
            viewModeButtons.forEach(node => node.classList.remove('active'));
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
            revenuePage = 0;
            renderRevenueTable();
        });
    });

    document.querySelectorAll('#employeeTable thead th[data-employee-sort]').forEach(th => {
        const sortEmployees = () => {
            const key = th.dataset.employeeSort;
            employeeSort.direction = employeeSort.key === key && employeeSort.direction === 'asc' ? 'desc' : 'asc';
            employeeSort.key = key;
            document.querySelectorAll('#employeeTable thead th[data-employee-sort]').forEach(node => {
                node.setAttribute('aria-sort', node === th ? (employeeSort.direction === 'asc' ? 'ascending' : 'descending') : 'none');
            });
            updateView();
        };
        th.addEventListener('click', sortEmployees);
        th.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                sortEmployees();
            }
        });
    });

    const logoutBtn = document.getElementById('adminBackBtn') || document.querySelector('.btn-back[href="index.html"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async event => {
            event.preventDefault();
            if (isLoadingFullData) {
                const confirmed = await dialogService.confirm(
                    'Dane są w trakcie pobierania z bazy. Czy na pewno chcesz się wylogować?',
                    'Trwa pobieranie danych'
                );
                if (confirmed) logoutAdmin();
            } else if (allData && allData.length > 0) {
                const confirmed = await dialogService.confirm(
                    'Czy na pewno chcesz się wylogować? Przy następnym wejściu trzeba będzie ponownie podać hasło.',
                    'Wylogowanie z panelu'
                );
                if (confirmed) logoutAdmin();
            } else {
                logoutAdmin();
            }
        });
    }
}

function logoutAdmin() {
    clearAdminAccess();
    window.location.href = 'index.html';
}

function updateView() {
    const ctx = document.getElementById('revenueChart')?.getContext('2d');
    const monthValue = document.getElementById('monthFilter')?.value || '';
    const baseData = getActiveWeekData();

    currentViewData = baseData;

    if (ctx) {
        adminRender.renderSummary(document.getElementById('summarySection'), currentViewData, getRenderOptions());
        adminRender.renderChart(ctx, getChartData(), chartType, getRenderOptions());
        adminRender.renderLocationPerformance(
            document.getElementById('locationPerformanceSection'),
            currentViewData,
            getRenderOptions()
        );
        renderHeatmapSection(currentViewData, monthValue);
        const employeeStats = analytics.calculateEmployeeStats(currentViewData)
            .filter(employee => isEmployeeVisible(employee.name, employeeCatalog))
            .sort(compareEmployees);
        adminRender.renderEmployeeTable(document.querySelector('#employeeTable tbody'), employeeStats);
    }

    renderPaymentsReminder();
    renderWeeklyOverview();
    renderRevenueTable();
}

function renderPaymentsReminder() {
    const container = document.getElementById('paymentsReminderSection');
    if (!container) return;
    if (!paymentsCatalog) {
        container.innerHTML = '';
        return;
    }

    const views = getPaymentViews(paymentsCatalog);
    const summary = summarizePayments(views);
    const upcoming = getUpcomingPayments(views, 14).slice(0, 5);
    const revenueTotal = currentViewData.reduce((sum, day) => sum + day.total, 0);

    adminRender.renderPaymentsReminder(container, {
        summary,
        upcoming,
        revenueTotal,
        itemCount: paymentsCatalog.items.length
    });
    container.querySelector('[data-open-payments]')?.addEventListener('click', () => switchAdminPage('payments'));
}

function renderWeeklyOverview() {
    const container = document.getElementById('weeklyOverviewSection');
    if (!container) return;
    if (!currentWeeks.length) {
        container.innerHTML = '';
        return;
    }
    adminRender.renderWeeklyOverview(container, buildWeekSummaries(), activeWeekKey, viewMode);
    container.querySelectorAll('[data-week-key]').forEach(card => {
        card.addEventListener('click', () => selectWeek(card.dataset.weekKey));
    });
}

function getWeekMetric(day) {
    if (viewMode === 'cards') return day.cardTotal;
    if (viewMode === 'glovo') return day.glovoNetTotal;
    return day.total;
}

function buildWeekSummaries() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weeks = currentWeeks.map((days, index) => {
        const total = days.reduce((sum, day) => sum + getWeekMetric(day), 0);
        return {
            key: String(index),
            index,
            days: days.length,
            total,
            averageDay: days.length ? total / days.length : 0,
            start: days[0]?.dateStr.slice(0, 5) || '',
            end: days[days.length - 1]?.dateStr.slice(0, 5) || '',
            isCurrent: days.some(day => day.dateObj.getTime() === today.getTime())
        };
    });

    weeks.forEach((week, index) => {
        const previous = weeks[index - 1];
        week.deltaPercent = previous && previous.averageDay
            ? ((week.averageDay - previous.averageDay) / previous.averageDay) * 100
            : null;
    });

    const comparable = weeks.filter(week => week.days >= 5);
    const pool = comparable.length ? comparable : weeks;
    const best = pool.reduce((leader, week) => (!leader || week.averageDay > leader.averageDay ? week : leader), null);
    if (best && weeks.length > 1) best.isBest = true;

    return weeks;
}

function updateChart() {
    const ctx = document.getElementById('revenueChart')?.getContext('2d');
    if (!ctx) return;
    adminRender.renderChart(ctx, getChartData(), chartType, getRenderOptions());
}

function getChartData() {
    const { from, to } = chartRange;
    if (!from && !to) return currentViewData;
    return currentViewData.filter(day => {
        const key = getMonthKey(day.dateObj);
        return (!from || key >= from) && (!to || key <= to);
    });
}

function populateChartRange(data) {
    const wrapper = document.getElementById('chartRangeControls');
    const fromSelect = document.getElementById('chartRangeFrom');
    const toSelect = document.getElementById('chartRangeTo');
    if (!wrapper || !fromSelect || !toSelect) return;

    const keys = Array.from(new Set(data.map(day => getMonthKey(day.dateObj)))).sort();
    if (keys.length <= 1) {
        wrapper.hidden = true;
        chartRange = { from: keys[0] || '', to: keys[0] || '' };
        return;
    }

    const options = keys.map(key => {
        const [year, month] = key.split('-');
        return `<option value="${key}">${formatMonthLabel(year, month)}</option>`;
    }).join('');

    wrapper.hidden = false;
    fromSelect.innerHTML = options;
    toSelect.innerHTML = options;
    chartRange.from = keys[0];
    chartRange.to = keys[keys.length - 1];
    fromSelect.value = chartRange.from;
    toSelect.value = chartRange.to;
    refreshCustomControls();
}

function renderHeatmapSection(data, monthValue) {
    const container = document.getElementById('heatmapContainer');
    const pager = document.getElementById('heatmapPager');
    if (!container) return;

    if (monthValue !== 'all') {
        heatmapPage = 0;
        if (pager) {
            pager.hidden = true;
            pager.innerHTML = '';
        }
        const [year, month] = monthValue.split('-');
        adminRender.renderHeatmap(container, data, year, month, getRenderOptions());
        return;
    }

    const monthKeys = Array.from(new Set(data.map(day => getMonthKey(day.dateObj)))).sort().reverse();
    const totalPages = Math.max(1, Math.ceil(monthKeys.length / HEATMAP_MONTHS_PER_PAGE));
    heatmapPage = Math.min(heatmapPage, totalPages - 1);
    const pageKeys = monthKeys.slice(heatmapPage * HEATMAP_MONTHS_PER_PAGE, (heatmapPage + 1) * HEATMAP_MONTHS_PER_PAGE);
    const pageKey = pageKeys[0];
    if (!pageKey) {
        container.innerHTML = '';
        if (pager) pager.hidden = true;
        return;
    }

    const [year, month] = pageKey.split('-');
    adminRender.renderHeatmap(container, data, year, month, getRenderOptions(), formatMonthLabel(year, month));
    renderPager(pager, {
        page: heatmapPage,
        totalPages,
        label: `${heatmapPage + 1} / ${totalPages}`,
        onPrev: () => {
            heatmapPage -= 1;
            renderHeatmapSection(data, monthValue);
        },
        onNext: () => {
            heatmapPage += 1;
            renderHeatmapSection(data, monthValue);
        }
    });
}

function renderPager(container, { page, totalPages, label, onPrev, onNext }) {
    if (!container) return;
    if (totalPages <= 1) {
        container.hidden = true;
        container.innerHTML = '';
        return;
    }

    container.hidden = false;
    container.innerHTML = `
        <button class="admin-pager__btn" type="button" data-pager="prev" ${page === 0 ? 'disabled' : ''} aria-label="Poprzednia strona">${renderMaterialIcon('chevron_left')}</button>
        <span class="admin-pager__label">${escapeHtml(label)}</span>
        <button class="admin-pager__btn" type="button" data-pager="next" ${page >= totalPages - 1 ? 'disabled' : ''} aria-label="Następna strona">${renderMaterialIcon('chevron_right')}</button>
    `;
    container.querySelector('[data-pager="prev"]')?.addEventListener('click', () => {
        if (page > 0) onPrev();
    });
    container.querySelector('[data-pager="next"]')?.addEventListener('click', () => {
        if (page < totalPages - 1) onNext();
    });
}

function getActiveWeekData() {
    if (activeWeekKey === 'all') return currentData;
    return currentWeeks[Number(activeWeekKey)] || currentData;
}

function renderRevenueTable() {
    const sorted = [...currentViewData].sort((a, b) => compareRevenueRows(a, b, revenueSort));
    const pager = document.getElementById('revenueTablePager');
    const isAllMonths = (document.getElementById('monthFilter')?.value || '') === 'all';
    const totalPages = isAllMonths ? Math.max(1, Math.ceil(sorted.length / REVENUE_PAGE_SIZE)) : 1;
    revenuePage = Math.min(revenuePage, totalPages - 1);
    const pageRows = isAllMonths
        ? sorted.slice(revenuePage * REVENUE_PAGE_SIZE, (revenuePage + 1) * REVENUE_PAGE_SIZE)
        : sorted;

    adminRender.renderTable(document.querySelector('#revenueTable tbody'), pageRows, getRenderOptions());
    renderPager(pager, {
        page: revenuePage,
        totalPages,
        label: `Strona ${revenuePage + 1} z ${totalPages}`,
        onPrev: () => {
            revenuePage -= 1;
            renderRevenueTable();
        },
        onNext: () => {
            revenuePage += 1;
            renderRevenueTable();
        }
    });
}

function updateDataLoadInfo(meta) {
    loadedMonthCount = meta?.loadedMonths || 0;
    availableMonthCount = meta?.availableMonths || 0;
    const info = document.getElementById('dataLoadInfo');
    if (info) info.textContent = `Załadowane: ${loadedMonthCount} / dostępne: ${availableMonthCount} miesięcy`;
}

function updateLoadButtonLabel() {
    const select = document.getElementById('loadDataRange');
    const button = document.getElementById('loadAllDataBtn');
    if (!select || !button || isLoadingFullData) return;
    const label = select.value === '0' ? 'Wszystko' : `Ostatnie ${select.value} mies.`;
    button.title = `Załaduj: ${label}`;
    if (select.value === '0' && isFullDataLoaded) {
        setLoadAllButtonState(button, 'Pobrano wszystko', false, true);
        return;
    }
    button.disabled = false;
    button.classList.remove('is-loaded', 'is-clean');
    button.innerHTML = `
        <span class="material-symbols-rounded admin-load-all-icon is-attention" aria-hidden="true">database</span>
        ZAŁADUJ
    `;
}

function getMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(year, month) {
    const date = new Date(year, month - 1, 1);
    const label = date.toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
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
        viewMode,
        chartMode: chartDisplayMode,
        employeeCatalog
    };
}

function getGlovoDisplayValue(entry) {
    return entry.glovoNetTotal;
}

function compareEmployees(a, b) {
    const multiplier = employeeSort.direction === 'asc' ? 1 : -1;
    if (employeeSort.key === 'name') return a.name.localeCompare(b.name, 'pl') * multiplier;
    if (employeeSort.key === 'hours') return (a.hours - b.hours) * multiplier;
    if (employeeSort.key === 'percent') return ((a.hours / 160) - (b.hours / 160)) * multiplier;
    const aLocations = Object.keys(a.locBreakdown || {}).length;
    const bLocations = Object.keys(b.locBreakdown || {}).length;
    return (aLocations - bLocations) * multiplier;
}

function initCalculator() {
    payrollCalculator = setupPayrollCalculator({
        getReports: () => statsData,
        employeeSelectId: 'calcEmployee',
        rateInputId: 'calcRate',
        dateFromId: 'calcDateFrom',
        dateToId: 'calcDateTo',
        resultBoxId: 'calcResult',
        resHoursId: 'resHours',
        resMoneyId: 'resMoney',
        detailsBoxId: 'calcDetails',
        defaultRate: 30,
        employeeLabel: name => getEmployeeDisplayName(name, employeeCatalog),
        isEmployeeAvailable: name => isEmployeeVisible(name, employeeCatalog),
        showLocationPills: false,
        onRecalc: summary => payslipGenerator?.syncDefaults(summary)
    });

    payrollCalculator.refresh();

    payslipGenerator = setupPayslipGenerator({
        getSummary: () => payrollCalculator.getSummary(),
        buttonId: 'calcPayslipBtn',
        statusBoxId: 'payslipStatus',
        paymentFormId: 'payslipPaymentForm',
        paymentDateId: 'payslipPaymentDate',
        logoUrl: 'favicon.png',
        resolveEmployeeName: rawName => {
            const employee = resolveEmployee(rawName, employeeCatalog);
            return employee ? `${employee.firstName} ${employee.lastName}` : rawName;
        }
    });
    payslipGenerator.syncDefaults(payrollCalculator.getSummary());
}
