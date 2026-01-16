import { apiService } from './services/api.js';
import { analytics } from './services/analytics.js';
import { adminRender } from './ui/adminRender.js';
import { triviaService } from './services/trivia.js';
import { calculateHours, formatMoney, isLocalhost } from './utils.js';

const PASSWORD = "xdxdxd123";
let allData = [];
let currentData = [];
let chartType = 'bar';
let viewMode = 'total';

document.addEventListener('DOMContentLoaded', async () => {
    if (!isLocalhost()) {
        const pass = prompt("Hasło:");
        if (pass !== PASSWORD) return location.href = "index.html";
    }
    document.body.style.display = 'block';

    allData = await apiService.fetchAllData();
    if(!allData.length) return document.getElementById('loading').innerText = "Brak danych";

    const processed = analytics.processReports(allData);
    initUI(processed);
});

function initUI(data) {
    populateMonthFilter(data);
    setupListeners();

    const monthSelect = document.getElementById('monthFilter');
    if (monthSelect.options.length > 0) {
        monthSelect.selectedIndex = 0;
        handleMonthChange(data);
    }

    document.getElementById('loading').style.display = 'none';
    const loader = document.getElementById('globalLoader');
    if(loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.style.display = 'none', 500);
    }

    document.getElementById('revenueTable').style.display = 'table';
    document.getElementById('lastUpdate').innerText = new Date().toLocaleString('pl-PL');
    initCalculator();
}

function populateMonthFilter(data) {
    const sel = document.getElementById('monthFilter');
    const months = new Set(data.map(d => `${d.dateObj.getFullYear()}-${String(d.dateObj.getMonth()+1).padStart(2,'0')}`));

    sel.innerHTML = Array.from(months).sort().reverse().map(m => {
        const [year, month] = m.split('-');
        const date = new Date(year, month - 1, 1);
        const monthName = date.toLocaleString('pl-PL', { month: 'long' });
        const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        return `<option value="${m}">${m} (${monthNameCapitalized})</option>`;
    }).join('');
    sel.onchange = () => handleMonthChange(data);
}

function handleMonthChange(fullData) {
    const [y, m] = document.getElementById('monthFilter').value.split('-');
    currentData = analytics.filterByMonth(fullData, y, m);

    // Generowanie zakładek tygodniowych
    const tabsContainer = document.getElementById('weekTabsContainer');
    tabsContainer.innerHTML = `<div class="week-tab active" data-week="all">CAŁY MIESIĄC</div>`;

    // Podział na tygodnie (według niedziel)
    const weeks = [];
    let currentWeek = [];
    // Sortujemy rosnąco dla podziału
    const sortedForWeeks = [...currentData].sort((a,b) => a.timestamp - b.timestamp);

    sortedForWeeks.forEach(d => {
        currentWeek.push(d);
        if (d.dayOfWeek === 'niedziela') {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });
    if (currentWeek.length > 0) weeks.push(currentWeek);

    weeks.forEach((weekData, index) => {
        const start = weekData[0].dateStr.slice(0,5);
        const end = weekData[weekData.length-1].dateStr.slice(0,5);
        const tab = document.createElement('div');
        tab.className = 'week-tab';
        tab.innerText = `TYDZIEŃ ${index + 1} (${start}-${end})`;
        tab.onclick = (e) => {
            document.querySelectorAll('.week-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            updateView(weekData);
        };
        tabsContainer.appendChild(tab);
    });

    tabsContainer.firstChild.onclick = (e) => {
        document.querySelectorAll('.week-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        updateView(currentData);
    };

    updateView(currentData);

    const lastDay = new Date(y, m, 0).getDate();
    document.getElementById('calcDateFrom').value = `${y}-${m}-01`;
    document.getElementById('calcDateTo').value = `${y}-${m}-${lastDay}`;
}

function updateView(data) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    const reqCtx = document.getElementById('productRequestsChart').getContext('2d');
    const countCtx = document.getElementById('productCountsChart').getContext('2d');
    const [y, m] = document.getElementById('monthFilter').value.split('-');

    adminRender.renderSummary(document.getElementById('summarySection'), data);

    const trivia = triviaService.generate(data);
    adminRender.renderTriviaCarousel(document.getElementById('triviaSection'), trivia);

    adminRender.renderChart(ctx, data, chartType, viewMode);

    const productStats = analytics.calculateProductStats(data);
    adminRender.renderProductStats(reqCtx, countCtx, productStats);

    adminRender.renderHeatmap(document.getElementById('heatmapContainer'), data, y, m);
    adminRender.renderTable(document.querySelector('#revenueTable tbody'), data);

    const stats = analytics.calculateEmployeeStats(data);
    adminRender.renderEmployeeTable(document.querySelector('#employeeTable tbody'), stats);
}

function setupListeners() {
    document.querySelectorAll('.chart-btn').forEach(b => b.onclick = (e) => {
        document.querySelectorAll('.chart-btn').forEach(x => x.classList.remove('active'));
        e.target.classList.add('active');
        chartType = e.target.dataset.type;
        const activeTab = document.querySelector('.week-tab.active');
        if(activeTab && activeTab.dataset.week === 'all') {
            updateView(currentData);
        } else {
            activeTab.click();
        }
    });

    document.querySelectorAll('.view-btn').forEach(b => b.onclick = (e) => {
        document.querySelectorAll('.view-btn').forEach(x => x.classList.remove('active'));
        e.currentTarget.classList.add('active');
        viewMode = e.currentTarget.dataset.view;
        const activeTab = document.querySelector('.week-tab.active');
        if(activeTab) activeTab.click(); else updateView(currentData);
    });
}

function initCalculator() {
    const sel = document.getElementById('calcEmployee');
    const emps = new Set();
    allData.forEach(r => r.employees && Object.keys(r.employees).forEach(k => emps.add(k)));

    let opts = `<option value="" disabled selected>Wybierz Pracownika</option>`;
    opts += Array.from(emps).sort().map(e => `<option value="${e}">${e}</option>`).join('');
    sel.innerHTML = opts;

    const recalc = () => {
        const name = sel.value;
        const resultBox = document.getElementById('calcResult');
        const detailsBox = document.getElementById('calcDetails');

        if (!name) {
            resultBox.style.display = 'none';
            detailsBox.style.display = 'none';
            return;
        }

        const rate = parseFloat(document.getElementById('calcRate').value) || 0;
        const d1 = new Date(document.getElementById('calcDateFrom').value);
        const d2 = new Date(document.getElementById('calcDateTo').value); d2.setHours(23,59,59);

        let h = 0;
        const locs = {};

        allData.forEach(r => {
            const [d,m,y] = r.date.split('.');
            const rd = new Date(y,m-1,d);
            if(rd >= d1 && rd <= d2 && r.employees?.[name]) {
                const hours = calculateHours(r.employees[name]);
                h += hours;
                locs[r.location] = (locs[r.location]||0) + hours;
            }
        });

        resultBox.style.display = 'flex';
        document.getElementById('resHours').innerText = h.toFixed(1) + ' h';
        document.getElementById('resMoney').innerText = formatMoney(h * rate);

        detailsBox.style.display = 'block';

        const maxH = Math.max(...Object.values(locs));

        detailsBox.innerHTML = Object.entries(locs).map(([l, v]) => {
            const color = (v === maxH && v > 0) ? '#D35400' : '#888';
            return `<div style="color:${color}; margin-bottom:4px;">${l}: <strong>${v.toFixed(1)}h</strong></div>`;
        }).join('');
    };

    ['change','input'].forEach(ev => {
        sel.addEventListener(ev, recalc);
        document.getElementById('calcRate').addEventListener(ev, recalc);
        document.getElementById('calcDateFrom').addEventListener(ev, recalc);
        document.getElementById('calcDateTo').addEventListener(ev, recalc);
    });
}