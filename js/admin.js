import { fetchAllData } from './services/githubService.js';

// --- Konfiguracja i Zmienne ---
const PASSWORD = "xdxdxd123"; // Pamiętaj, aby zmienić na produkcji
let allReports = [];
let mergedData = []; // Dane zgrupowane po dniach (niezależnie od lokalizacji)
let currentFilteredData = []; // Aktualnie wyświetlane dane (po filtrze miesiąca/tygodnia)
let revenueChart = null;

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

  // Przetworzenie danych na format "Jeden dzień = Jeden wiersz"
  processData();
  
  populateMonthFilter();
  document.getElementById('monthFilter').addEventListener('change', handleMonthChange);
  
  // Ustawienie daty aktualizacji
  document.getElementById('lastUpdate').innerText = new Date().toLocaleString('pl-PL');

  // Domyślny widok
  handleMonthChange();
  
  document.getElementById('loading').style.display = 'none';
  document.getElementById('revenueTable').style.display = 'table';
}

/**
 * Agreguje dane. Zamiast listy raportów, tworzy listę dni z przypisanymi lokalizacjami.
 */
function processData() {
    const dataMap = new Map();

    allReports.forEach(report => {
        const dateKey = report.date; // "DD.MM.YYYY"
        if (!dataMap.has(dateKey)) {
            // Parsowanie daty do obiektu Date dla sortowania
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

    // Konwersja mapy na tablicę i sortowanie od najnowszych
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

    filter.innerHTML = ''; // Reset
    Array.from(months).sort().reverse().forEach(monthKey => {
        const [year, monthNum] = monthKey.split('-');
        const date = new Date(year, monthNum - 1);
        const label = date.toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
        
        // Z dużej litery miesiąc
        const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
        
        const option = document.createElement('option');
        option.value = monthKey;
        option.textContent = formattedLabel;
        filter.appendChild(option);
    });
}

/**
 * Główna funkcja obsługująca zmianę miesiąca.
 * Generuje zakładki tygodniowe i resetuje widok do "Cały miesiąc".
 */
function handleMonthChange() {
    const selectedMonthKey = document.getElementById('monthFilter').value;
    const [year, month] = selectedMonthKey.split('-');
    
    // Filtrujemy dane tylko dla wybranego miesiąca
    const monthData = mergedData.filter(d => {
        return d.dateObj.getFullYear() == year && (d.dateObj.getMonth() + 1) == month;
    });

    // Generuj zakładki tygodniowe
    renderWeekTabs(monthData, selectedMonthKey);
    
    // Pokaż wszystko z tego miesiąca domyślnie
    updateView(monthData);
}

/**
 * Generuje przyciski (zakładki) dla tygodni.
 */
function renderWeekTabs(monthData, monthKey) {
    const container = document.getElementById('weekTabsContainer');
    container.innerHTML = '';

    // Przycisk "Cały miesiąc"
    const allBtn = document.createElement('div');
    allBtn.className = 'week-tab active';
    allBtn.textContent = 'Cały miesiąc';
    allBtn.onclick = () => {
        document.querySelectorAll('.week-tab').forEach(t => t.classList.remove('active'));
        allBtn.classList.add('active');
        updateView(monthData);
    };
    container.appendChild(allBtn);

    // Dzielimy miesiąc na tygodnie (uproszczone: zakresy dat)
    // Sortujemy rosnąco, żeby znaleźć początek miesiąca
    const sortedAsc = [...monthData].sort((a, b) => a.timestamp - b.timestamp);
    if (sortedAsc.length === 0) return;

    // Logika podziału na ISO tygodnie jest skomplikowana,
    // tu zrobimy prościej dla biznesu: Tygodnie zaczynają się od poniedziałku.
    
    const weeksMap = new Map(); // klucz: numer tygodnia w roku lub data startu
    
    sortedAsc.forEach(day => {
        // Oblicz numer tygodnia w roku (prosta implementacja)
        const d = new Date(Date.UTC(day.dateObj.getFullYear(), day.dateObj.getMonth(), day.dateObj.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
        
        if(!weeksMap.has(weekNo)) weeksMap.set(weekNo, []);
        weeksMap.get(weekNo).push(day);
    });

    // Renderowanie przycisków tygodni
    weeksMap.forEach((days, weekNo) => {
        const startDay = days[0].dateStr.substring(0, 5); // "DD.MM"
        const endDay = days[days.length-1].dateStr.substring(0, 5);
        
        const btn = document.createElement('div');
        btn.className = 'week-tab';
        btn.textContent = `Tydzień ${weekNo} (${startDay} - ${endDay})`;
        
        btn.onclick = () => {
            document.querySelectorAll('.week-tab').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            updateView(days); // Pokaż tylko dni z tego tygodnia
        };
        container.appendChild(btn);
    });
}

/**
 * Odświeża tabelę, wykres i kafelki na podstawie przekazanych danych.
 */
function updateView(data) {
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
        <div class="summary-box highlight">
            <h3>Łączny Utarg</h3>
            <p>${formatMoney(total)}</p>
        </div>
        <div class="summary-box">
            <h3>Oświęcim</h3>
            <p>${formatMoney(osw)}</p>
        </div>
        <div class="summary-box">
            <h3>Wilamowice</h3>
            <p>${formatMoney(wil)}</p>
        </div>
        <div class="summary-box" style="background: #e3f2fd;">
            <h3>Średnia dniówka</h3>
            <p style="font-size: 24px; line-height: 1.5;">${formatMoney(avg)}</p>
        </div>
    `;
}

function renderTable(data) {
    const tbody = document.querySelector("#revenueTable tbody");
    tbody.innerHTML = '';
    
    // Sortujemy od najnowszych
    const sorted = [...data].sort((a, b) => b.timestamp - a.timestamp);

    sorted.forEach(row => {
        const tr = document.createElement('tr');
        
        // Wyróżnienie weekendów
        const isWeekend = row.dayOfWeek === 'piątek' || row.dayOfWeek === 'sobota' || row.dayOfWeek === 'niedziela';
        if (isWeekend) tr.classList.add('weekend-row');

        tr.innerHTML = `
            <td>${row.dateStr}</td>
            <td class="day-name">${capitalize(row.dayOfWeek)}</td>
            <td class="val-cell" style="color: #007bff;">${row.oswiecim > 0 ? formatMoney(row.oswiecim) : '-'}</td>
            <td class="val-cell" style="color: #6610f2;">${row.wilamowice > 0 ? formatMoney(row.wilamowice) : '-'}</td>
            <td class="val-cell total-cell">${formatMoney(row.total)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderChart(data) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    // Sortujemy chronologicznie do wykresu
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
    
    const labels = sorted.map(d => `${d.dateStr.substring(0, 5)} (${d.dayOfWeek.substring(0, 3)})`);
    const oswData = sorted.map(d => d.oswiecim);
    const wilData = sorted.map(d => d.wilamowice);

    if (revenueChart) revenueChart.destroy();

    revenueChart = new Chart(ctx, {
        type: 'bar', // Zmiana na słupkowy, lepiej widać porównanie dzienne
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Oświęcim',
                    data: oswData,
                    backgroundColor: 'rgba(0, 123, 255, 0.7)',
                    borderRadius: 4,
                },
                {
                    label: 'Wilamowice',
                    data: wilData,
                    backgroundColor: 'rgba(111, 66, 193, 0.7)',
                    borderRadius: 4,
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
                title: { display: true, text: 'Porównanie utargów w czasie', font: { size: 16 } },
                tooltip: {
                    callbacks: {
                        footer: (tooltipItems) => {
                            let total = 0;
                            tooltipItems.forEach(t => total += t.raw);
                            return 'Suma dnia: ' + total.toFixed(2) + ' PLN';
                        }
                    }
                }
            },
            scales: {
                x: { stacked: false }, // false = słupki obok siebie, true = jeden na drugim
                y: { beginAtZero: true }
            }
        }
    });
}

// --- Helpery ---

function formatMoney(amount) {
    return amount.toFixed(2) + ' zł';
}

function capitalize(s) {
    return s && s[0].toUpperCase() + s.slice(1);
}