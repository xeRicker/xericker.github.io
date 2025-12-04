import { fetchAllData } from './services/githubService.js';

// --- Konfiguracja i Zmienne ---
const PASSWORD = "xdxdxd123";
let allReports = [];
let mergedData = [];
let currentFilteredData = [];
let revenueChart = null;
let currentChartType = 'bar'; // Domyślny typ wykresu

// --- Start ---
document.addEventListener('DOMContentLoaded', () => {
  const enteredPassword = prompt("Podaj hasło administratora:");
  if (enteredPassword === PASSWORD) {
    document.body.style.display = 'block';
    initializeApp();
  } else {
    alert("Błędne hasło.");
    window.location.href = "index.html";
  }
});

async function initializeApp() {
  allReports = await fetchAllData();
  
  if (allReports.length === 0) {
      document.getElementById('loading').innerText = "Brak danych w bazie.";
      return;
  }

  processData();
  populateMonthFilter();
  
  // Event Listenery
  document.getElementById('monthFilter').addEventListener('change', handleMonthChange);
  
  // Obsługa zmiany typu wykresu
  document.querySelectorAll('.chart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
          // Zmiana klasy active
          document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          
          // Zmiana typu i przerysowanie
          currentChartType = e.target.dataset.type;
          renderChart(currentFilteredData);
      });
  });
  
  document.getElementById('lastUpdate').innerText = new Date().toLocaleString('pl-PL');

  // Inicjalizacja widoku
  handleMonthChange();
  
  document.getElementById('loading').style.display = 'none';
  document.getElementById('revenueTable').style.display = 'table';
}

function processData() {
    const dataMap = new Map();

    allReports.forEach(report => {
        const dateKey = report.date;
        if (!dataMap.has(dateKey)) {
            const [d, m, y] = dateKey.split('.');
            const dateObj = new Date(y, m - 1, d);
            
            dataMap.set(dateKey, {
                dateStr: dateKey,
                dateObj: dateObj,
                timestamp: dateObj.getTime(),
                dayOfWeek: dateObj.toLocaleDateString('pl-PL', { weekday: 'long' }),
                oswiecim: 0,
                wilamowice: 0,
                total: 0
            });
        }
        
        const entry = dataMap.get(dateKey);
        const rev = report.revenue || 0;
        
        if (report.location === 'Oświęcim') entry.oswiecim += rev;
        if (report.location === 'Wilamowice') entry.wilamowice += rev;
        entry.total += rev;
    });

    mergedData = Array.from(dataMap.values()).sort((a, b) => b.timestamp - a.timestamp);
}

function populateMonthFilter() {
    const filter = document.getElementById('monthFilter');
    const months = new Set();
    
    mergedData.forEach(item => {
        const d = item.dateObj;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.add(key);
    });

    filter.innerHTML = '';
    Array.from(months).sort().reverse().forEach(monthKey => {
        const [year, monthNum] = monthKey.split('-');
        const date = new Date(year, monthNum - 1);
        const label = date.toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
        const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
        
        const option = document.createElement('option');
        option.value = monthKey;
        option.textContent = formattedLabel;
        filter.appendChild(option);
    });
}

function handleMonthChange() {
    const selectedMonthKey = document.getElementById('monthFilter').value;
    const [year, month] = selectedMonthKey.split('-');
    
    const monthData = mergedData.filter(d => {
        return d.dateObj.getFullYear() == year && (d.dateObj.getMonth() + 1) == month;
    });

    renderWeekTabs(monthData, selectedMonthKey);
    updateView(monthData);
}

function renderWeekTabs(monthData, monthKey) {
    const container = document.getElementById('weekTabsContainer');
    container.innerHTML = '';

    const allBtn = document.createElement('div');
    allBtn.className = 'week-tab active';
    allBtn.textContent = 'Cały miesiąc';
    allBtn.onclick = () => {
        document.querySelectorAll('.week-tab').forEach(t => t.classList.remove('active'));
        allBtn.classList.add('active');
        updateView(monthData);
    };
    container.appendChild(allBtn);

    const sortedAsc = [...monthData].sort((a, b) => a.timestamp - b.timestamp);
    if (sortedAsc.length === 0) return;

    const weeksMap = new Map();
    sortedAsc.forEach(day => {
        const d = new Date(Date.UTC(day.dateObj.getFullYear(), day.dateObj.getMonth(), day.dateObj.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
        
        if(!weeksMap.has(weekNo)) weeksMap.set(weekNo, []);
        weeksMap.get(weekNo).push(day);
    });

    weeksMap.forEach((days, weekNo) => {
        const startDay = days[0].dateStr.substring(0, 5);
        const endDay = days[days.length-1].dateStr.substring(0, 5);
        
        const btn = document.createElement('div');
        btn.className = 'week-tab';
        btn.textContent = `Tydzień ${weekNo} (${startDay} - ${endDay})`;
        
        btn.onclick = () => {
            document.querySelectorAll('.week-tab').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            updateView(days);
        };
        container.appendChild(btn);
    });
}

function updateView(data) {
    currentFilteredData = data; // Zapisz aktualne dane do użycia przy zmianie wykresu
    renderSummary(data);
    renderTable(data);
    renderChart(data);
}

function renderSummary(data) {
    const summaryContainer = document.getElementById('summarySection');
    
    const total = data.reduce((sum, d) => sum + d.total, 0);
    const osw = data.reduce((sum, d) => sum + d.oswiecim, 0);
    const wil = data.reduce((sum, d) => sum + d.wilamowice, 0);
    const avg = data.length > 0 ? total / data.length : 0;

    summaryContainer.innerHTML = `
        <div class="summary-box">
            <h3>Łączny Utarg</h3>
            <p style="color: #6200ee;">${formatMoney(total)}</p>
        </div>
        <div class="summary-box">
            <h3>Oświęcim</h3>
            <p style="color: #03dac6;">${formatMoney(osw)}</p>
        </div>
        <div class="summary-box">
            <h3>Wilamowice</h3>
            <p style="color: #ff4081;">${formatMoney(wil)}</p>
        </div>
        <div class="summary-box">
            <h3>Średnia dniówka</h3>
            <p style="color: #ffab40;">${formatMoney(avg)}</p>
        </div>
    `;
}

function renderTable(data) {
    const tbody = document.querySelector("#revenueTable tbody");
    tbody.innerHTML = '';
    
    const sorted = [...data].sort((a, b) => b.timestamp - a.timestamp);

    sorted.forEach(row => {
        const tr = document.createElement('tr');
        
        const isWeekend = row.dayOfWeek === 'piątek' || row.dayOfWeek === 'sobota' || row.dayOfWeek === 'niedziela';
        if (isWeekend) tr.classList.add('weekend-row');

        tr.innerHTML = `
            <td>${row.dateStr}</td>
            <td class="day-name">${capitalize(row.dayOfWeek)}</td>
            <td class="val-cell">${row.oswiecim > 0 ? formatMoney(row.oswiecim) : '-'}</td>
            <td class="val-cell">${row.wilamowice > 0 ? formatMoney(row.wilamowice) : '-'}</td>
            <td class="val-cell total-cell">${formatMoney(row.total)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderChart(data) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
    
    const labels = sorted.map(d => `${d.dateStr.substring(0, 5)} (${d.dayOfWeek.substring(0, 3)})`);
    const oswData = sorted.map(d => d.oswiecim);
    const wilData = sorted.map(d => d.wilamowice);

    if (revenueChart) revenueChart.destroy();

    const isLine = currentChartType === 'line';

    revenueChart = new Chart(ctx, {
        type: currentChartType,
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Oświęcim',
                    data: oswData,
                    backgroundColor: isLine ? 'rgba(3, 218, 198, 0.2)' : 'rgba(3, 218, 198, 0.8)',
                    borderColor: '#03dac6',
                    borderWidth: 2,
                    borderRadius: 4,
                    tension: 0.3,
                    fill: isLine
                },
                {
                    label: 'Wilamowice',
                    data: wilData,
                    backgroundColor: isLine ? 'rgba(255, 64, 129, 0.2)' : 'rgba(255, 64, 129, 0.8)',
                    borderColor: '#ff4081',
                    borderWidth: 2,
                    borderRadius: 4,
                    tension: 0.3,
                    fill: isLine
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, font: { size: 14 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        footer: (tooltipItems) => {
                            let total = 0;
                            tooltipItems.forEach(t => total += t.raw);
                            return 'Suma: ' + total.toFixed(2) + ' PLN';
                        }
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, grid: { color: '#f0f0f0' } }
            }
        }
    });
}

function formatMoney(amount) {
    return amount.toFixed(2) + ' zł';
}

function capitalize(s) {
    return s && s[0].toUpperCase() + s.slice(1);
}