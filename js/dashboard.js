import { fetchAllData } from './services/githubService.js';

// Kolory pracowników, aby były spójne z główną aplikacją
const employeeColors = {
  "Paweł": "#3498db", "Radek": "#2ecc71", "Sebastian": "#e74c3c",
  "Tomek": "#f1c40f", "Natalia": "#9b59b6", "Kacper": "#e67e22", "Dominik": "#1abc9c"
};

// Globalne referencje do wykresów, aby móc je aktualizować
let charts = {};
let allData = []; // Tutaj będziemy przechowywać wszystkie pobrane dane

document.addEventListener('DOMContentLoaded', async () => {
    document.body.style.cursor = 'wait';
    allData = await fetchAllData();
    document.body.style.cursor = 'default';
    
    if (allData.length > 0) {
        setupFilters();
        updateDashboard();
    } else {
        document.querySelector('.container').innerHTML += '<h2>Nie udało się załadować danych. Sprawdź konsolę (F12) i odśwież stronę.</h2>';
    }
});

function setupFilters() {
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const locationFilter = document.getElementById('locationFilter');

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    dateTo.value = today.toISOString().split('T')[0];
    dateFrom.value = thirtyDaysAgo.toISOString().split('T')[0];

    dateFrom.addEventListener('change', updateDashboard);
    dateTo.addEventListener('change', updateDashboard);
    locationFilter.addEventListener('change', updateDashboard);
}

function filterData() {
    const from = new Date(document.getElementById('dateFrom').value);
    from.setHours(0,0,0,0);
    const to = new Date(document.getElementById('dateTo').value);
    to.setHours(23,59,59,999);
    const location = document.getElementById('locationFilter').value;

    return allData.filter(report => {
        const [day, month, year] = report.date.split('.').map(Number);
        const reportDate = new Date(year, month - 1, day);
        
        const isDateInRange = reportDate >= from && reportDate <= to;
        const isLocationMatch = location === 'all' || report.location === location;

        return isDateInRange && isLocationMatch;
    });
}

function processData(filteredData) {
    const stats = {
        employeeHoursTotal: {},
        productQuantities: {},
        hoursByDay: {},
        hoursByLocation: {},
        totalHours: 0,
        workDays: new Set(),
        dailyEmployeeHours: {},
        dailyProductUsage: {},
    };

    filteredData.forEach(report => {
        stats.workDays.add(report.date);
        stats.hoursByLocation[report.location] = (stats.hoursByLocation[report.location] || 0);
        const dateKey = report.date.split('.').reverse().join('-');

        for (const [name, timeString] of Object.entries(report.employees)) {
            const hours = calculateHours(timeString);
            stats.employeeHoursTotal[name] = (stats.employeeHoursTotal[name] || 0) + hours;
            stats.hoursByLocation[report.location] += hours;
            stats.totalHours += hours;
            stats.hoursByDay[dateKey] = (stats.hoursByDay[dateKey] || 0) + hours;

            if (!stats.dailyEmployeeHours[dateKey]) stats.dailyEmployeeHours[dateKey] = {};
            stats.dailyEmployeeHours[dateKey][name] = (stats.dailyEmployeeHours[dateKey][name] || 0) + hours;
        }

        for (const [name, quantity] of Object.entries(report.products)) {
            if (name.includes("Bułki")) continue;
                        
            stats.productQuantities[name] = (stats.productQuantities[name] || 0) + Number(quantity);

            if (!stats.dailyProductUsage[dateKey]) stats.dailyProductUsage[dateKey] = {};
            stats.dailyProductUsage[dateKey][name] = (stats.dailyProductUsage[dateKey][name] || 0) + Number(quantity);
        }
    });
    return stats;
}

function calculateHours(timeString) {
  try {
    const [startStr, endStr] = timeString.split('–').map(s => s.trim());
    const [startHours, startMinutes] = startStr.split(':').map(Number);
    const [endHours, endMinutes] = endStr.split(':').map(Number);
    const startDate = new Date(0, 0, 0, startHours, startMinutes);
    let endDate = new Date(0, 0, 0, endHours, endMinutes);
    if (endDate < startDate) endDate.setDate(endDate.getDate() + 1);
    return (endDate - startDate) / (1000 * 60 * 60);
  } catch { return 0; }
}

function updateDashboard() {
    const filteredReports = filterData();
    const stats = processData(filteredReports);

    updateKPIs(stats);
    updateCharts(stats);
}

function updateKPIs(stats) {
    document.getElementById('kpi-total-hours').textContent = `${stats.totalHours.toFixed(1)}h`;
    document.getElementById('kpi-work-days').textContent = stats.workDays.size;
    
    const topEmployee = Object.entries(stats.employeeHoursTotal).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('kpi-top-employee').textContent = topEmployee ? topEmployee[0] : '---';

    const topProduct = Object.entries(stats.productQuantities).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('kpi-top-product').textContent = topProduct ? topProduct[0] : '---';
}

function updateCharts(stats) {
    // Godziny pracy w czasie
    const sortedDays = Object.entries(stats.hoursByDay).sort((a, b) => a[0].localeCompare(b[0]));
    renderChart('hoursOverTimeChart', 'line', {
        labels: sortedDays.map(d => d[0]),
        datasets: [{ label: 'Suma godzin', data: sortedDays.map(d => d[1].toFixed(1)), borderColor: '#007bff', tension: 0.1 }]
    });

    // Ranking pracowników
    const sortedEmployees = Object.entries(stats.employeeHoursTotal).sort((a, b) => b[1] - a[1]);
    renderChart('employeeRankingChart', 'bar', {
        labels: sortedEmployees.map(e => e[0]),
        datasets: [{ label: 'Godziny', data: sortedEmployees.map(e => e[1].toFixed(1)), backgroundColor: '#28a745' }]
    });

    // Podział godzin na lokalizacje
    renderChart('locationSplitChart', 'doughnut', {
        labels: Object.keys(stats.hoursByLocation),
        datasets: [{ data: Object.values(stats.hoursByLocation), backgroundColor: ['#ffc107', '#dc3545', '#17a2b8'] }]
    });

    // Top 10 produktów
    const sortedProducts = Object.entries(stats.productQuantities).sort((a, b) => b[1] - a[1]).slice(0, 10);
    renderChart('productRankingChart', 'bar', {
        indexAxis: 'y',
        labels: sortedProducts.map(p => p[0]),
        datasets: [{ label: 'Ilość', data: sortedProducts.map(p => p[1]), backgroundColor: '#6c757d' }]
    });

    // Podział godzin w poszczególnych dniach
    const sortedDailyData = Object.entries(stats.dailyEmployeeHours).sort((a, b) => a[0].localeCompare(b[0]));
    const allEmployees = [...new Set(Object.values(stats.dailyEmployeeHours).flatMap(day => Object.keys(day)))];
    const dailyDatasets = allEmployees.map(employee => ({
        label: employee,
        data: sortedDailyData.map(([, dailyStats]) => (dailyStats[employee] || 0).toFixed(1)),
        backgroundColor: employeeColors[employee] || '#ccc'
    }));
    renderChart('dailyWorkDistributionChart', 'bar', {
        labels: sortedDailyData.map(([date]) => date),
        datasets: dailyDatasets
    }, { scales: { x: { stacked: true }, y: { stacked: true } } });

    // Zużycie produktów w czasie
    const sortedProductDays = Object.entries(stats.dailyProductUsage).sort((a, b) => a[0].localeCompare(b[0]));
    const top5Products = Object.entries(stats.productQuantities).sort((a,b) => b[1] - a[1]).slice(0, 5).map(p => p[0]);
    const productDatasets = top5Products.map((productName, index) => {
        const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6c757d'];
        return {
            label: productName,
            data: sortedProductDays.map(([, dailyStats]) => dailyStats[productName] || 0),
            borderColor: colors[index % colors.length],
            fill: false,
            tension: 0.1
        };
    });
    renderChart('productUsageOverTimeChart', 'line', {
        labels: sortedProductDays.map(([date]) => date),
        datasets: productDatasets
    });
}

function renderChart(canvasId, type, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (charts[canvasId]) charts[canvasId].destroy();
    charts[canvasId] = new Chart(ctx, { type, data, options });
}