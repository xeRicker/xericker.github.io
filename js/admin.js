import { fetchAllData, isLocalhost } from './services/githubService.js';

const EMPLOYEE_COLORS = {
    "Paweł": "#3498db", "Radek": "#2ecc71", "Sebastian": "#e74c3c",
    "Tomek": "#f1c40f", "Natalia": "#9b59b6", "Kacper": "#e67e22", "Dominik": "#1abc9c"
};

const PASSWORD = "xdxdxd123";
let allReports = [];
let mergedData = [];
let currentFilteredData = [];
let employeeStats = [];
let revenueChart = null;
let currentChartType = 'bar';
let currentDataType = 'total'; // 'total' lub 'cards' - wpływa tylko na wykres

let sortDirection = 1;
window.sortEmpTable = (colIndex) => {
    sortDirection *= -1;
    employeeStats.sort((a, b) => {
        let valA, valB;
        if (colIndex === 0) { valA = a.name; valB = b.name; }
        else if (colIndex === 1 || colIndex === 3) { valA = a.hours; valB = b.hours; }
        else {
            valA = Math.max(...Object.values(a.locBreakdown));
            valB = Math.max(...Object.values(b.locBreakdown));
        }
        if (valA < valB) return -1 * sortDirection;
        if (valA > valB) return 1 * sortDirection;
        return 0;
    });
    renderDetailedEmployeeTable(employeeStats);
};

document.addEventListener('DOMContentLoaded', () => {
    if (isLocalhost()) {
        console.log("LOCALHOST: Login bypassed");
        document.body.style.display = 'block';
        initializeApp();
    } else {
        const enteredPassword = prompt("Podaj hasło administratora:");
        if (enteredPassword === PASSWORD) {
            document.body.style.display = 'block';
            initializeApp();
        } else {
            alert("Błędne hasło.");
            window.location.href = "index.html";
        }
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
    initSalaryCalculator();

    document.getElementById('monthFilter').addEventListener('change', handleMonthChange);

    // Obsługa typu wykresu (Słupkowy / Liniowy)
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentChartType = e.target.dataset.type;
            renderChart(currentFilteredData);
        });
    });

    // Obsługa przełącznika widoku (Total vs Cards) - TYLKO WYKRES
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentDataType = e.currentTarget.dataset.view;

            // Odświeżamy tylko wykres, mapa cieplna pozostaje bez zmian
            renderChart(currentFilteredData);
        });
    });

    document.getElementById('lastUpdate').innerText = new Date().toLocaleString('pl-PL');
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
                total: 0,
                cardTotal: 0,
                oswiecimCard: 0,
                wilamowiceCard: 0,
                rawReports: []
            });
        }

        const entry = dataMap.get(dateKey);
        const rev = report.revenue || 0;
        const cardRev = report.cardRevenue || 0;

        if (report.location === 'Oświęcim') {
            entry.oswiecim += rev;
            entry.oswiecimCard += cardRev;
        }
        if (report.location === 'Wilamowice') {
            entry.wilamowice += rev;
            entry.wilamowiceCard += cardRev;
        }
        entry.total += rev;
        entry.cardTotal += cardRev;
        entry.rawReports.push(report);
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

    const lastDay = new Date(year, month, 0).getDate();
    document.getElementById('calcDateFrom').value = `${year}-${month}-01`;
    document.getElementById('calcDateTo').value = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    calculateSalary();

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
    currentFilteredData = data;
    renderSummary(data);
    renderTable(data);
    renderChart(data);
    employeeStats = processEmployeeData(data);
    renderDetailedEmployeeTable(employeeStats);
    renderHeatmap(data);
}

function calculateHours(timeStr) {
    if (!timeStr) return 0;
    const normalizedTime = timeStr.replace('–', '-');
    if (!normalizedTime.includes('-')) return 0;
    const [start, end] = normalizedTime.split('-').map(t => t.trim());
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let hours = h2 - h1;
    let minutes = m2 - m1;
    if (minutes < 0) { hours--; minutes += 60; }
    if (hours < 0) hours += 24;
    return hours + (minutes / 60);
}

function processEmployeeData(data) {
    const empMap = new Map();
    data.forEach(day => {
        day.rawReports.forEach(report => {
            if (report.employees) {
                Object.entries(report.employees).forEach(([name, hoursStr]) => {
                    const hours = calculateHours(hoursStr);
                    if (!empMap.has(name)) {
                        empMap.set(name, { name: name, hours: 0, revenue: 0, locations: new Set(), locBreakdown: {} });
                    }
                    const emp = empMap.get(name);
                    emp.hours += hours;
                    emp.locations.add(report.location);
                    const rev = report.revenue || 0;
                    emp.revenue += rev;
                    if(!emp.locBreakdown[report.location]) emp.locBreakdown[report.location] = 0;
                    emp.locBreakdown[report.location] += hours;
                });
            }
        });
    });
    return Array.from(empMap.values()).sort((a, b) => b.hours - a.hours);
}

function initSalaryCalculator() {
    const empSelect = document.getElementById('calcEmployee');
    const rateInput = document.getElementById('calcRate');
    const dateFrom = document.getElementById('calcDateFrom');
    const dateTo = document.getElementById('calcDateTo');

    const uniqueEmployees = new Set();
    allReports.forEach(r => {
        if(r.employees) Object.keys(r.employees).forEach(n => uniqueEmployees.add(n));
    });
    Array.from(uniqueEmployees).sort().forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp;
        opt.textContent = emp;
        empSelect.appendChild(opt);
    });

    [empSelect, rateInput, dateFrom, dateTo].forEach(el => {
        el.addEventListener('change', calculateSalary);
        el.addEventListener('input', calculateSalary);
    });
}

function calculateSalary() {
    const name = document.getElementById('calcEmployee').value;
    const rate = parseFloat(document.getElementById('calcRate').value) || 0;
    const dFrom = new Date(document.getElementById('calcDateFrom').value);
    const dTo = new Date(document.getElementById('calcDateTo').value);

    dTo.setHours(23, 59, 59);

    if (!name || isNaN(dFrom.getTime()) || isNaN(dTo.getTime())) return;

    let totalHours = 0;
    const locBreakdown = {};

    allReports.forEach(report => {
        const [d, m, y] = report.date.split('.');
        const rDate = new Date(y, m - 1, d);

        if (rDate >= dFrom && rDate <= dTo) {
            if (report.employees && report.employees[name]) {
                const h = calculateHours(report.employees[name]);
                totalHours += h;
                if (!locBreakdown[report.location]) locBreakdown[report.location] = 0;
                locBreakdown[report.location] += h;
            }
        }
    });

    const totalMoney = totalHours * rate;

    document.getElementById('calcResult').style.display = 'flex';
    document.getElementById('resHours').innerText = totalHours.toFixed(1) + ' h';
    document.getElementById('resMoney').innerText = formatMoney(totalMoney);

    const detailsDiv = document.getElementById('calcDetails');
    detailsDiv.style.display = 'block';
    let detailsHtml = '';
    for (const [loc, h] of Object.entries(locBreakdown)) {
        const money = h * rate;
        detailsHtml += `<div>${loc}: <strong>${h.toFixed(1)} h</strong> (${formatMoney(money)})</div>`;
    }
    detailsDiv.innerHTML = detailsHtml;
}

function renderDetailedEmployeeTable(stats) {
    const tbody = document.querySelector("#employeeTable tbody");
    tbody.innerHTML = '';
    stats.forEach(emp => {
        const tr = document.createElement('tr');

        let locHtml = '';
        let barHtml = '<div class="loc-bar-container">';

        const locEntries = Object.entries(emp.locBreakdown).sort((a,b) => b[1] - a[1]);

        let maxHours = -1;
        locEntries.forEach(([l, h]) => { if(h > maxHours) maxHours = h; });
        const topLocs = locEntries.filter(([l, h]) => h === maxHours).map(x => x[0]);
        const dominantLoc = topLocs.includes('Oświęcim') ? 'Oświęcim' : topLocs[0];

        const textParts = [];

        locEntries.forEach(([loc, hours]) => {
            const pct = (hours / emp.hours) * 100;
            if (pct > 0) {
                const color = (loc === dominantLoc) ? '#D35400' : '#9E9E9E';
                textParts.push(`<span style="color:${color}">${loc} ${Math.round(pct)}%</span>`);
                barHtml += `<div class="loc-bar-segment" style="width:${pct}%; background-color:${color};" title="${loc}: ${hours.toFixed(1)}h"></div>`;
            }
        });
        barHtml += '</div>';
        locHtml = `<span class="loc-text">${textParts.join(' • ')}</span>${barHtml}`;

        const percent = (emp.hours / 160) * 100;
        let percentColor = '#aaa';
        if (percent > 100) percentColor = '#e74c3c';
        else if (percent > 80) percentColor = '#27ae60';

        tr.innerHTML = `
            <td style="font-weight:bold; color:#fff;">${emp.name}</td>
            <td class="val-cell" style="color:var(--primary-color);">${emp.hours.toFixed(1)} h</td>
            <td class="val-cell" style="color:${percentColor}; font-weight:bold;">${percent.toFixed(1)}%</td>
            <td>${locHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderHeatmap(data) {
    const container = document.getElementById('heatmapContainer');
    const tooltip = document.getElementById('customTooltip');
    container.innerHTML = '';

    ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].forEach(d => {
        const h = document.createElement('div');
        h.className = 'heatmap-day-header';
        h.innerText = d;
        container.appendChild(h);
    });

    if (data.length === 0) return;

    const [filterYear, filterMonth] = document.getElementById('monthFilter').value.split('-').map(Number);
    const daysInMonth = new Date(filterYear, filterMonth, 0).getDate();
    const firstDayOfWeek = new Date(filterYear, filterMonth - 1, 1).getDay() || 7;

    for (let i = 1; i < firstDayOfWeek; i++) {
        const empty = document.createElement('div');
        empty.className = 'heatmap-cell heatmap-empty';
        container.appendChild(empty);
    }

    // Mapa zawsze pokazuje całkowity utarg
    const thresholdMid = 2000;
    const thresholdHigh = 4000;
    const maxVal = 6000;

    for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = `${String(day).padStart(2,'0')}.${String(filterMonth).padStart(2,'0')}.${filterYear}`;
        const dayData = data.find(d => d.dateStr === dayStr);
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';

        if (dayData) {
            const value = dayData.total;

            let cssClass = '';
            if (value > thresholdHigh) cssClass = 'fire';
            else if (value > thresholdMid) cssClass = 'warm';

            const intensity = Math.min(value / maxVal, 1);
            cell.style.backgroundColor = `rgba(211, 84, 0, ${0.15 + (intensity * 0.85)})`;
            if(cssClass) cell.classList.add(cssClass);

            cell.innerHTML = `
                <span class="heatmap-date">${day}</span>
                <span class="heatmap-val">${Math.round(value)}</span>
            `;

            cell.addEventListener('mouseenter', () => {
                let html = `<div class="tt-header">${dayStr} - ${dayData.dayOfWeek}</div>`;

                // Zawsze pokazujemy pełne dane
                html += `<div class="tt-row"><span>Suma:</span> <span class="tt-val highlight">${formatMoney(dayData.total)}</span></div>`;
                html += `<div class="tt-row"><span>Karty:</span> <span class="tt-val">${formatMoney(dayData.cardTotal)}</span></div>`;

                html += `<div class="tt-sub">LOKALIZACJE</div>`;

                // Oświęcim
                html += `<div style="margin-top:4px; color: #D35400; font-weight:bold; font-size:13px;">Oświęcim:</div>`;
                html += `<div class="tt-row" style="padding-left:10px; margin-bottom:2px;"><span>Suma:</span> <span class="tt-val">${formatMoney(dayData.oswiecim)}</span></div>`;
                html += `<div class="tt-row" style="padding-left:10px;"><span>Karty:</span> <span class="tt-val" style="color:#aaa;">${formatMoney(dayData.oswiecimCard)}</span></div>`;

                // Wilamowice
                html += `<div style="margin-top:6px; color: #9E9E9E; font-weight:bold; font-size:13px;">Wilamowice:</div>`;
                html += `<div class="tt-row" style="padding-left:10px; margin-bottom:2px;"><span>Suma:</span> <span class="tt-val">${formatMoney(dayData.wilamowice)}</span></div>`;
                html += `<div class="tt-row" style="padding-left:10px;"><span>Karty:</span> <span class="tt-val" style="color:#aaa;">${formatMoney(dayData.wilamowiceCard)}</span></div>`;

                // Pracownicy
                html += `<div class="tt-sub">ZMIANA:</div>`;
                dayData.rawReports.forEach(r => {
                    if(r.employees) {
                        html += `<div style="color:var(--primary-color); font-size:11px; margin-top:2px;">${r.location}:</div>`;
                        Object.entries(r.employees).forEach(([name, hours]) => {
                            html += `<div class="tt-emp"><span class="tt-emp-dot"></span>${name} (${hours})</div>`;
                        });
                    }
                });
                tooltip.innerHTML = html;
                tooltip.style.display = 'block';
            });

            cell.addEventListener('mousemove', (e) => {
                let left = e.pageX + 15;
                let top = e.pageY + 15;
                if (left + 220 > window.innerWidth) left = e.pageX - 220;
                tooltip.style.left = left + 'px';
                tooltip.style.top = top + 'px';
            });

            cell.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });

        } else {
            cell.style.backgroundColor = '#1a1a1a';
            cell.innerHTML = `<span class="heatmap-date" style="opacity:0.3">${day}</span>`;
        }
        container.appendChild(cell);
    }
}

function renderChart(data) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
    const labels = sorted.map(d => `${d.dateStr.substring(0, 5)} (${d.dayOfWeek.substring(0, 3)})`);

    const oswData = sorted.map(d => currentDataType === 'cards' ? d.oswiecimCard : d.oswiecim);
    const wilData = sorted.map(d => currentDataType === 'cards' ? d.wilamowiceCard : d.wilamowice);

    if (revenueChart) revenueChart.destroy();

    const isLine = currentChartType === 'line';
    const colorOsw = '#D35400';
    const colorWil = '#9E9E9E';
    const labelSuffix = currentDataType === 'cards' ? ' (Karty)' : '';

    revenueChart = new Chart(ctx, {
        type: currentChartType,
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Oświęcim' + labelSuffix,
                    data: oswData,
                    backgroundColor: isLine ? 'rgba(211, 84, 0, 0.2)' : 'rgba(211, 84, 0, 0.8)',
                    borderColor: colorOsw,
                    borderWidth: 2,
                    borderRadius: 4,
                    tension: 0.3,
                    fill: isLine
                },
                {
                    label: 'Wilamowice' + labelSuffix,
                    data: wilData,
                    backgroundColor: isLine ? 'rgba(158, 158, 158, 0.2)' : 'rgba(158, 158, 158, 0.7)',
                    borderColor: colorWil,
                    borderWidth: 2,
                    borderRadius: 4,
                    tension: 0.3,
                    fill: isLine
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#eee', usePointStyle: true, font: { family: 'Roboto' } } },
                tooltip: {
                    enabled: false,
                    external: function(context) {
                        let tooltipEl = document.getElementById('customTooltip');
                        const tooltipModel = context.tooltip;
                        if (tooltipModel.opacity === 0) {
                            tooltipEl.style.display = 'none';
                            return;
                        }

                        if (tooltipModel.body) {
                            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
                            const dayData = sorted[dataIndex];

                            if(dayData) {
                                let html = `<div class="tt-header">${dayData.dateStr}</div>`;

                                if (currentDataType === 'cards') {
                                    html += `<div class="tt-row"><span>Suma Dnia (Karty):</span> <span class="tt-val highlight">${formatMoney(dayData.cardTotal)}</span></div>`;
                                    html += `<div class="tt-row"><span>Oświęcim (Karty):</span> <span class="tt-val">${formatMoney(dayData.oswiecimCard)}</span></div>`;
                                    html += `<div class="tt-row"><span>Wilamowice (Karty):</span> <span class="tt-val">${formatMoney(dayData.wilamowiceCard)}</span></div>`;
                                } else {
                                    html += `<div class="tt-row"><span>Suma Dnia:</span> <span class="tt-val highlight">${formatMoney(dayData.total)}</span></div>`;
                                    html += `<div class="tt-row"><span>Oświęcim:</span> <span class="tt-val">${formatMoney(dayData.oswiecim)}</span></div>`;
                                    html += `<div class="tt-row"><span>Wilamowice:</span> <span class="tt-val">${formatMoney(dayData.wilamowice)}</span></div>`;
                                }
                                tooltipEl.innerHTML = html;
                            }
                        }

                        const position = context.chart.canvas.getBoundingClientRect();
                        tooltipEl.style.display = 'block';
                        tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 15 + 'px';
                        tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#888' } },
                y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#888' } }
            }
        }
    });
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
            <p class="highlight">${formatMoney(total)}</p>
        </div>
        <div class="summary-box">
            <h3>Oświęcim</h3>
            <p>${formatMoney(osw)}</p>
        </div>
        <div class="summary-box">
            <h3>Wilamowice</h3>
            <p>${formatMoney(wil)}</p>
        </div>
        <div class="summary-box">
            <h3>Średnia dniówka</h3>
            <p style="color: #aaa;">${formatMoney(avg)}</p>
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
            <td style="font-family: 'Oswald', sans-serif;">${row.dateStr}</td>
            <td style="color: #aaa;">${capitalize(row.dayOfWeek)}</td>
            <td class="val-cell">${row.oswiecim > 0 ? formatMoney(row.oswiecim) : '-'}</td>
            <td class="val-cell">${row.wilamowice > 0 ? formatMoney(row.wilamowice) : '-'}</td>
            <td class="val-cell total-cell">${formatMoney(row.total)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function formatMoney(amount) {
    return amount.toFixed(2) + ' zł';
}

function capitalize(s) {
    return s && s[0].toUpperCase() + s.slice(1);
}