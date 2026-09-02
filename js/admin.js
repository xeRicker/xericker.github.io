import { apiService } from './services/api.js?v=63';
import { analytics } from './services/analytics.js';
import { adminRender } from './ui/adminRender.js?v=60';
import { adminProducts } from './ui/adminProducts.js?v=60';
import { createAdminListsPage } from './ui/adminLists.js?v=60';
import { setupPayrollCalculator } from './ui/payrollCalculator.js?v=60';
import { escapeHtml, formatMoney, isLocalhost, parseLocalDateInput, renderMaterialIcon } from './utils.js';
import { dialogService, enhanceCustomControls, refreshCustomControls } from './ui/components/customControls.js?v=67';
import { getActiveProductCatalog, loadProductCatalog } from './services/products.js?v=60';
import { cardClass } from './ui/components/Card.js';
import { getEmployeeDisplayName, loadEmployeeCatalog } from './services/employees.js?v=64';
import { adminEmployees } from './ui/adminEmployees.js?v=64';

const PASSWORD = "1232123";
const ADMIN_AUTH_STORAGE_KEY = 'burbone-admin-access';
const ADMIN_FORCE_LOGIN_STORAGE_KEY = 'burbone-admin-force-login';
const ADMIN_AUTH_DURATION_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'];
const DEFAULT_DATA_MONTHS = 1;
const PAYROLL_RATE = 30;

let allData = [];
let processedData = [];
let currentData = [];
let currentWeeks = [];
let chartType = 'bar';
let viewMode = 'total';
let currentViewData = [];
let activeWeekKey = 'all';
let revenueSort = { key: 'date', direction: 'desc' };
let employeeSort = { key: 'name', direction: 'asc' };
let payrollCalculator = null;
let productCatalog = null;
let adminListsPage = null;
let isFullDataLoaded = false;
let isLoadingFullData = false;
let loadedMonthCount = 0;
let availableMonthCount = 0;
let monthlyReportCharts = [];
let monthlyReportGenerated = false;
let employeeCatalog = null;

document.addEventListener('DOMContentLoaded', async () => {
    setAdminScrollLocked(true);
    try {
        if ((!isLocalhost() || isAdminLogoutRequested()) && !(await hasValidAdminAccess())) {
            document.body.style.display = 'block';
            const pass = await dialogService.prompt("Podaj hasło administratora.", "Burbone Admin", {
                type: 'password',
                inputmode: 'numeric',
                autocomplete: 'current-password',
                autoSubmit: value => value === PASSWORD
            });
            if (pass !== PASSWORD) return location.href = "index.html";
            saveAdminAccess();
        }
        document.body.style.display = 'block';

        allData = await apiService.fetchAllData({ recentMonths: DEFAULT_DATA_MONTHS, onMeta: updateDataLoadInfo });
        if (!allData.length) {
            showAdminUnavailable(new Error('GitHub nie zawiera raportów w wybranym zakresie.'));
            return;
        }

        setupAdminPages();
        productCatalog = getActiveProductCatalog(await loadProductCatalog());
        employeeCatalog = await loadEmployeeCatalog();
        await adminProducts.init(document.getElementById('adminProductsPage'));
        await adminEmployees.init(document.getElementById('adminEmployeesPage'));
        adminListsPage = createAdminListsPage({
            getAllData: () => allData,
            getProductCatalog: () => productCatalog,
            getEmployeeCatalog: () => employeeCatalog,
            buildSymbolIcon: (...args) => adminRender.buildSymbolIcon(...args)
        });

        processedData = analytics.processReports(allData);
        adminListsPage.init();
        initUI(processedData);
    } catch (error) {
        console.error('Admin panel unavailable.', error);
        showAdminUnavailable(error);
    }
});

async function hasValidAdminAccess() {
    try {
        const access = JSON.parse(localStorage.getItem(ADMIN_AUTH_STORAGE_KEY));
        if (Number.isFinite(access?.expiresAt) && access.expiresAt > Date.now()) return true;
        localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    } catch {
        localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    }
    return false;
}

function saveAdminAccess() {
    try {
        localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify({
            expiresAt: Date.now() + ADMIN_AUTH_DURATION_MS
        }));
        localStorage.removeItem(ADMIN_FORCE_LOGIN_STORAGE_KEY);
    } catch (error) {
        console.warn('Nie udało się zapamiętać dostępu do panelu admina.', error);
    }
}

function showAdminUnavailable(error) {
    document.body.style.display = 'block';
    const loader = document.getElementById('globalLoader');
    if (!loader) return;

    const code = error?.status ? `HTTP ${error.status}` : 'Błąd połączenia';
    const details = error?.message || 'Nie udało się pobrać danych z GitHub.';
    loader.classList.remove('hidden');
    loader.innerHTML = `
        <div class="loader-content loader-content--error" role="alert">
            ${renderMaterialIcon('cloud_off', 'loader-error-icon')}
            <h1>Panel jest obecnie niedostępny</h1>
            <p>Nie udało się załadować danych.</p>
            <p class="loader-error-code">Kod błędu: ${escapeHtml(code)}</p>
            <p class="loader-error-details">${escapeHtml(details)}</p>
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

function isAdminLogoutRequested() {
    try {
        return localStorage.getItem(ADMIN_FORCE_LOGIN_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
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

    allData = data;
    processedData = analytics.processReports(allData);
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
    if (currentTab === 'employees' && !(await adminEmployees.confirmDiscardChanges())) return;

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
        setAdminScrollLocked(false);
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

function handleMonthChange(fullData) {
    const [year, month] = document.getElementById('monthFilter').value.split('-');
    currentData = analytics.filterByMonth(fullData, year, month);

    buildWeekTabs(currentData);
    activeWeekKey = 'all';
    updateView();

    const lastDay = new Date(year, month, 0).getDate();
    payrollCalculator?.setDateRange(
        `${year}-${month}-01`,
        `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    );
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
    document.getElementById('monthFilter')?.addEventListener('change', () => handleMonthChange(processedData));

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
    try {
        localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
        if (isLocalhost()) localStorage.setItem(ADMIN_FORCE_LOGIN_STORAGE_KEY, '1');
    } catch (error) {
        console.warn('Nie udało się usunąć zapisanego dostępu do panelu admina.', error);
    }
    window.location.href = 'index.html';
}

function updateView() {
    const ctx = document.getElementById('revenueChart')?.getContext('2d');
    const [year, month] = (document.getElementById('monthFilter')?.value || '').split('-');
    const baseData = getActiveWeekData();

    currentViewData = baseData;

    if (ctx) {
        adminRender.renderSummary(document.getElementById('summarySection'), currentViewData, getRenderOptions());
        adminRender.renderInsights(document.getElementById('insightsSection'), currentViewData, getRenderOptions());
        adminRender.renderChart(ctx, currentViewData, chartType, getRenderOptions());
        adminRender.renderLocationPerformance(
            document.getElementById('locationPerformanceSection'),
            currentViewData,
            getRenderOptions()
        );
        adminRender.renderHeatmap(document.getElementById('heatmapContainer'), currentViewData, year, month, getRenderOptions());
        const employeeStats = analytics.calculateEmployeeStats(currentViewData).sort(compareEmployees);
        adminRender.renderEmployeeTable(document.querySelector('#employeeTable tbody'), employeeStats);
    }

    renderRevenueTable();
}

function getActiveWeekData() {
    if (activeWeekKey === 'all') return currentData;
    return currentWeeks[Number(activeWeekKey)] || currentData;
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

    setMonthlyReportStatus('Przygotowuję listę miesięczną...', 'loading');
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
        setMonthlyReportStatus('Nie udało się wygenerować listy.', 'error');
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
    setMonthlyReportStatus('Pobieram dane, żeby porównać dwa zamknięte miesiące...', 'loading');

    try {
        const comparisonData = await apiService.fetchAllData({
            recentMonths: 2,
            onMeta: updateDataLoadInfo,
            onProgress: progress => setLoadAllButtonState(button, `Pobieranie ${progress.percent}%`, true)
        });

        if (!comparisonData.length) throw new Error('No reports available');
        applyLoadedData(comparisonData);
        setLoadAllButtonState(button, 'Dane załadowane', false);
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
    const current = report.current;
    const previous = report.previous;
    const currentHours = getEmployeeHoursTotal(current);
    const currentPayroll = getPayrollTotal(current);
    const revenuePerHour = getRevenuePerHour(current);
    const payrollShare = getPayrollShare(current);
    const totalDelta = current.total - previous.total;
    const hoursDelta = currentHours - getEmployeeHoursTotal(previous);
    const currentLeader = current.locations[0];
    const assessment = totalDelta > 0 && (hoursDelta <= 0 || revenuePerHour >= getRevenuePerHour(previous))
        ? { tone: 'positive', title: 'Miesiąc wygląda zdrowo', text: 'Sprzedaż rośnie bez proporcjonalnego zwiększania obciążenia zespołu.' }
        : totalDelta > 0
            ? { tone: 'watch', title: 'Sprzedaż rośnie, ale pilnuj kosztu pracy', text: 'Wynik jest lepszy, jednak warto sprawdzić, czy dodatkowe godziny dają odpowiedni zwrot.' }
            : { tone: 'negative', title: 'Potrzebna jest szybka reakcja', text: 'Wynik spadł względem poprzedniego miesiąca. Najpierw sprawdź punkty i dni z największą różnicą.' };

    content.innerHTML = `
        <div class="monthly-report-range">
            <span>${renderMaterialIcon('calendar_month', 'summary-icon-badge')} RAPORT ZARZĄDCZY</span>
            <strong>${escapeHtml(current.label)}</strong>
            <p>Porównanie z ${escapeHtml(previous.label)} pokazuje, co realnie zmieniło się w firmie.</p>
        </div>

        <div class="monthly-assessment monthly-assessment--${assessment.tone}">
            <div><strong>${assessment.title}</strong><p>${assessment.text}</p></div>
        </div>

        <div class="monthly-command-grid">
            ${renderDecisionMetric('Utarg netto', formatMoney(current.total), totalDelta, true, getDecisionHint('revenue', totalDelta))}
            ${renderDecisionMetric('Średnio dziennie', formatMoney(current.averageDay), current.averageDay - previous.averageDay, true, getDecisionHint('average', current.averageDay - previous.averageDay))}
            ${renderDecisionMetric('Utarg / godzina', formatMoney(revenuePerHour), revenuePerHour - getRevenuePerHour(previous), true, getDecisionHint('hour', revenuePerHour - getRevenuePerHour(previous)))}
            ${renderDecisionMetric('Udział wypłat', `${payrollShare.toFixed(1)}%`, payrollShare - getPayrollShare(previous), false, getDecisionHint('payroll', payrollShare - getPayrollShare(previous)))}
        </div>

        <div class="monthly-report-grid monthly-report-grid--decision">
            <div class="${cardClass('chart', 'chart-card monthly-report-panel')}">
                <div class="section-heading"><h3>Jak radzą sobie punkty</h3><p>Ranking według średniego dziennego utargu — łatwiej porównać punkty o różnej liczbie dni.</p></div>
                <div class="monthly-location-list">
                    ${current.locations.map(location => {
                        const old = previous.locations.find(item => item.name === location.name);
                        const delta = location.avgDay - (old?.avgDay || 0);
                        return `<div class="monthly-location-row"><div><strong>${escapeHtml(location.name)}</strong><span>${formatMoney(location.avgDay)} średnio / dzień</span></div><em class="${getDeltaClass(delta)}">${formatSignedValue(delta, true)} / ${old ? formatPercentDelta(location.avgDay, old.avgDay) : 'nowy'}</em></div>`;
                    }).join('')}
                </div>
            </div>
            <div class="${cardClass('chart', 'chart-card monthly-report-panel')}">
                <div class="section-heading"><h3>Zespół i obciążenie</h3><p>Najważniejsze informacje o czasie pracy i koszcie zespołu.</p></div>
                <div class="monthly-focus-list">
                    <div><span>Przepracowane godziny</span><strong>${currentHours.toFixed(1)} h <em class="${getDeltaClass(hoursDelta)}">${formatSignedValue(hoursDelta, false, ' h')}</em></strong></div>
                    <div><span>Szacowany koszt wypłat</span><strong>${formatMoney(currentPayroll)} <em class="is-neutral">stawka 30 PLN</em></strong></div>
                    <div><span>Najmocniejszy punkt</span><strong>${currentLeader ? escapeHtml(currentLeader.name) : '-'} <em class="is-neutral">${currentLeader ? formatMoney(currentLeader.avgDay) + ' / dzień' : ''}</em></strong></div>
                </div>
            </div>
        </div>

        <div class="monthly-report-grid monthly-report-grid--details">
            ${renderMonthlyHighlights(report)}
            ${renderMonthlyEfficiencyPanel(report)}
        </div>

        <div class="monthly-report-grid monthly-report-grid--details">
            ${renderMonthlyPayrollTable(report)}
            ${renderMonthlyProductTable(report)}
        </div>
    `;
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
        ZAŁADUJ DANE
    `;
}

function renderDecisionMetric(label, value, delta, money, description) {
    const lowerIsBetter = label === 'Udział wypłat';
    return `<div class="${cardClass('summary', 'summary-box monthly-decision-metric')}"><span class="summary-kicker">${escapeHtml(label)}</span><p>${escapeHtml(value)}</p><small class="${getDeltaClass(delta, lowerIsBetter)}">${formatSignedValue(delta, money)} względem poprzedniego miesiąca</small><span class="monthly-decision-metric__hint"><span class="material-symbols-rounded" aria-hidden="true">chat_bubble</span>${escapeHtml(description)}</span></div>`;
}

function getDecisionHint(type, delta) {
    if (type === 'payroll') {
        if (delta < -0.4) return 'Koszt zespołu spadł względem utargu — to dobry sygnał, o ile nie ucierpiała obsada.';
        if (delta > 0.4) return 'Wypłaty zajmują większą część utargu. Sprawdź, czy dodatkowe godziny przełożyły się na sprzedaż.';
        return 'Udział wypłat jest stabilny. Na ten moment koszty pracy są pod kontrolą.';
    }
    if (delta > 0) return type === 'hour'
        ? 'Każda godzina zespołu przyniosła więcej utargu — grafik pracuje efektywniej.'
        : type === 'average'
            ? 'Typowy dzień był mocniejszy, więc wynik nie opiera się wyłącznie na jednym rekordzie.'
            : 'Firma zrobiła więcej niż wcześniej. Warto sprawdzić, który punkt napędził wzrost.';
    if (delta < 0) return type === 'hour'
        ? 'Godzina pracy daje mniej utargu. To pierwszy kandydat do przeglądu grafików i słabszych dni.'
        : type === 'average'
            ? 'Słabszy był przeciętny dzień. Poszukaj powtarzalnego problemu, nie tylko najsłabszej daty.'
            : 'Łączny wynik spadł. Zacznij od punktu z największym spadkiem średniej dziennej.';
    return 'Wynik jest stabilny. Najwięcej powie porównanie z kolejnym miesiącem.';
}

function renderMonthlyKpi(label, current, previous, icon, money = false) {
    const delta = current - previous;
    const deltaClass = getDeltaClass(delta);
    const display = money ? formatMoney(current) : current.toFixed(1);
    return `
        <div class="${cardClass('summary', 'summary-box monthly-kpi')} ">
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
            <div class="${cardClass('chart', 'chart-card monthly-report-panel')}">
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
            <div class="${cardClass('chart', 'chart-card monthly-report-panel')}">
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
                    'Szacowany koszt wypłat przy stawce 30 jako procent utargu. Niżej jest lepiej, bo mniej obrotu idzie na godziny pracy.',
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
                    'Suma godzin wpisanych na listach. Warto porównać tę zmianę ze zmianą utargu.',
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
            <div class="${cardClass('chart', 'chart-card monthly-report-panel')}">
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
            <div class="${cardClass('chart', 'chart-card monthly-report-panel')}">
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
            <div class="${cardClass('chart', 'chart-card monthly-report-panel')}">
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
    Chart.defaults.font.family = styles.getPropertyValue('--font-body').trim() || 'sans-serif';
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
                        font: { family: styles.getPropertyValue('--font-heading').trim() || 'sans-serif' }
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
                    font: { family: styles.getPropertyValue('--font-heading').trim() || 'sans-serif' }
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
    if (!message) {
        status.innerHTML = '';
        return;
    }
    status.innerHTML = state === 'loading'
        ? `<span class="material-symbols-rounded" aria-hidden="true">progress_activity</span><span>${message}</span><span class="monthly-report-status__bar"><i></i></span>`
        : `<span class="material-symbols-rounded" aria-hidden="true">${state === 'error' ? 'error' : 'info'}</span><span>${message}</span>`;
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
        getReports: () => allData,
        employeeSelectId: 'calcEmployee',
        rateInputId: 'calcRate',
        dateFromId: 'calcDateFrom',
        dateToId: 'calcDateTo',
        resultBoxId: 'calcResult',
        resHoursId: 'resHours',
        resMoneyId: 'resMoney',
        detailsBoxId: 'calcDetails',
        defaultRate: 30,
        employeeLabel: name => getEmployeeDisplayName(name, employeeCatalog)
    });

    payrollCalculator.refresh();
}
