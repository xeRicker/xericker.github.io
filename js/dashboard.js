import { fetchAllData } from './services/githubService.js';
import { generateMonthlyReport } from './services/reportService.js'; // Użyjemy jego logiki do przetwarzania danych

// Globalne referencje do wykresów, aby móc je aktualizować
let charts = {};
let allData = []; // Tutaj będziemy przechowywać wszystkie pobrane dane

document.addEventListener('DOMContentLoaded', async () => {
    // Pokaż loader lub jakiś wskaźnik ładowania
    document.body.style.cursor = 'wait';

    allData = await fetchAllData();
    console.log("Pobrano wpisów:", allData.length);
    
    // Ukryj loader
    document.body.style.cursor = 'default';

    // Inicjalizacja filtrów i pierwszego renderowania
    setupFilters();
    updateDashboard();
});

function setupFilters() {
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const locationFilter = document.getElementById('locationFilter');

    // Ustaw domyślny zakres na ostatnie 30 dni
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    dateTo.value = today.toISOString().split('T')[0];
    dateFrom.value = thirtyDaysAgo.toISOString().split('T')[0];

    // Podpięcie event listenerów
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
        // Konwersja daty z raportu (DD.MM.RRRR) na obiekt Date
        const [day, month, year] = report.date.split('.').map(Number);
        const reportDate = new Date(year, month - 1, day);
        
        const isDateInRange = reportDate >= from && reportDate <= to;
        const isLocationMatch = location === 'all' || report.location === location;

        return isDateInRange && isLocationMatch;
    });
}

function processData(filteredData) {
    // Funkcja z reportService.js jest prawie idealna, ale my chcemy ją zaadaptować.
    // Zamiast importować całą logikę, możemy ją tutaj uprościć i dostosować.
    const stats = {
        employeeHoursTotal: {},
        productQuantities: {},
        hoursByDay: {},
        hoursByLocation: {},
        totalHours: 0,
        workDays: new Set(),
    };

    filteredData.forEach(report => {
        stats.workDays.add(report.date);
        stats.hoursByLocation[report.location] = (stats.hoursByLocation[report.location] || 0);

        for (const [name, timeString] of Object.entries(report.employees)) {
            const hours = calculateHours(timeString);
            stats.employeeHoursTotal[name] = (stats.employeeHoursTotal[name] || 0) + hours;
            stats.hoursByLocation[report.location] += hours;
            stats.totalHours += hours;

            const dateKey = report.date.split('.').reverse().join('-'); // YYYY-MM-DD
            stats.hoursByDay[dateKey] = (stats.hoursByDay[dateKey] || 0) + hours;
        }
        for (const [name, quantity] of Object.entries(report.products)) {
            stats.productQuantities[name] = (stats.productQuantities[name] || 0) + Number(quantity);
        }
    });
    return stats;
}

// Prosta funkcja do liczenia godzin, aby uniknąć problemów z importem
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
    // Wykres godzin w czasie
    const sortedDays = Object.entries(stats.hoursByDay).sort((a, b) => a[0].localeCompare(b[0]));
    renderChart('hoursOverTimeChart', 'line', {
        labels: sortedDays.map(d => d[0]),
        datasets: [{
            label: 'Suma godzin',
            data: sortedDays.map(d => d[1].toFixed(1)),
            borderColor: '#007bff',
            tension: 0.1
        }]
    });

    // Wykres rankingu pracowników
    const sortedEmployees = Object.entries(stats.employeeHoursTotal).sort((a, b) => b[1] - a[1]);
    renderChart('employeeRankingChart', 'bar', {
        labels: sortedEmployees.map(e => e[0]),
        datasets: [{
            label: 'Godziny',
            data: sortedEmployees.map(e => e[1].toFixed(1)),
            backgroundColor: '#28a745'
        }]
    });

    // Wykres podziału lokalizacji
    renderChart('locationSplitChart', 'doughnut', {
        labels: Object.keys(stats.hoursByLocation),
        datasets: [{
            data: Object.values(stats.hoursByLocation),
            backgroundColor: ['#ffc107', '#dc3545', '#17a2b8']
        }]
    });

    // Wykres rankingu produktów
    const sortedProducts = Object.entries(stats.productQuantities).sort((a, b) => b[1] - a[1]).slice(0, 10);
    renderChart('productRankingChart', 'bar', {
        indexAxis: 'y', // poziomy wykres słupkowy
        labels: sortedProducts.map(p => p[0]),
        datasets: [{
            label: 'Ilość',
            data: sortedProducts.map(p => p[1]),
            backgroundColor: '#6c757d'
        }]
    });
}

function renderChart(canvasId, type, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Jeśli wykres już istnieje, zniszcz go przed narysowaniem nowego
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    charts[canvasId] = new Chart(ctx, { type, data, options });
}