import { fetchAllData } from './services/githubService.js';

// --- Zmienne globalne ---
let allReports = [];
let revenueChart = null;
const PASSWORD = "xdxdxd123";

// --- Inicjalizacja ---
document.addEventListener('DOMContentLoaded', () => {
  const enteredPassword = prompt("Podaj hasło, aby uzyskać dostęp do panelu admina:");
  if (enteredPassword === PASSWORD) {
    document.body.style.display = 'block';
    initializeApp();
  } else {
    alert("Nieprawidłowe hasło. Odmowa dostępu.");
    window.location.href = "index.html";
  }
});

async function initializeApp() {
  allReports = await fetchAllData();
  
  if (allReports.length === 0) {
      document.getElementById('loading').innerText = "Brak danych do wyświetlenia.";
      return;
  }
  
  // Sortowanie danych od najnowszych
  allReports.sort((a, b) => new Date(b.date.split('.').reverse().join('-')) - new Date(a.date.split('.').reverse().join('-')));
  
  populateMonthFilter();
  
  document.getElementById('monthFilter').addEventListener('change', renderFilteredData);
  
  // Wyrenderuj dane dla domyślnie wybranego miesiąca
  renderFilteredData();
  
  document.getElementById('loading').style.display = 'none';
  document.getElementById('revenueTable').style.display = 'table';
}

// --- Filtrowanie i Renderowanie ---

function populateMonthFilter() {
  const filter = document.getElementById('monthFilter');
  const months = new Set();
  
  allReports.forEach(report => {
    const [day, month, year] = report.date.split('.');
    months.add(`${year}-${month}`);
  });

  filter.innerHTML = '<option value="all">Wszystkie miesiące</option>';
  Array.from(months).sort().reverse().forEach(month => {
    const [year, monthNum] = month.split('-');
    const option = document.createElement('option');
    option.value = month;
    option.textContent = `${new Date(year, monthNum - 1).toLocaleString('pl-PL', { month: 'long' })} ${year}`;
    filter.appendChild(option);
  });
}

function renderFilteredData() {
  const selectedMonth = document.getElementById('monthFilter').value;
  let filteredReports;

  if (selectedMonth === 'all') {
    filteredReports = allReports;
  } else {
    const [year, month] = selectedMonth.split('-');
    filteredReports = allReports.filter(r => r.date.endsWith(`.${month}.${year}`));
  }

  renderSummary(filteredReports);
  renderTable(filteredReports);
  renderChart(filteredReports);
}


// --- Komponenty UI ---

function renderSummary(reports) {
    const summaryContainer = document.getElementById('summarySection');
    
    const totalRevenue = reports.reduce((sum, r) => sum + (r.revenue || 0), 0);
    const oswiecimRevenue = reports.filter(r => r.location === 'Oświęcim').reduce((sum, r) => sum + (r.revenue || 0), 0);
    const wilamowiceRevenue = reports.filter(r => r.location === 'Wilamowice').reduce((sum, r) => sum + (r.revenue || 0), 0);
    
    summaryContainer.innerHTML = `
        <div class="summary-box">
            <h3>Utarg Całkowity</h3>
            <p>${totalRevenue.toFixed(2)} PLN</p>
        </div>
        <div class="summary-box">
            <h3>Utarg Oświęcim</h3>
            <p>${oswiecimRevenue.toFixed(2)} PLN</p>
        </div>
        <div class="summary-box">
            <h3>Utarg Wilamowice</h3>
            <p>${wilamowiceRevenue.toFixed(2)} PLN</p>
        </div>
    `;
}

function renderTable(reports) {
  const tbody = document.querySelector("#revenueTable tbody");
  tbody.innerHTML = ''; // Wyczyść tabelę

  reports.forEach(report => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${report.date}</td>
      <td>${report.location}</td>
      <td>${(report.revenue || 0).toFixed(2)}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderChart(reports) {
  const ctx = document.getElementById('revenueChart').getContext('2d');
  
  // Posortuj dane chronologicznie do wykresu
  const sortedReports = [...reports].sort((a, b) => new Date(a.date.split('.').reverse().join('-')) - new Date(b.date.split('.').reverse().join('-')));
  
  const labels = [...new Set(sortedReports.map(r => r.date))]; // Unikalne daty
  
  const oswiecimData = [];
  const wilamowiceData = [];

  labels.forEach(date => {
      const oswiecimReport = sortedReports.find(r => r.date === date && r.location === 'Oświęcim');
      const wilamowiceReport = sortedReports.find(r => r.date === date && r.location === 'Wilamowice');
      
      oswiecimData.push(oswiecimReport ? oswiecimReport.revenue : null);
      wilamowiceData.push(wilamowiceReport ? wilamowiceReport.revenue : null);
  });

  if (revenueChart) {
    revenueChart.destroy();
  }

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Utarg Oświęcim',
          data: oswiecimData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          spanGaps: true, // Łączy punkty mimo 'null'
        },
        {
          label: 'Utarg Wilamowice',
          data: wilamowiceData,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          spanGaps: true,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Wykres utargów w czasie',
          font: { size: 24 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value + ' PLN';
            }
          }
        }
      }
    }
  });
}