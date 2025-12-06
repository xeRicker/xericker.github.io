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
let employeeChart = null;
let currentChartType = 'bar'; 
let currentEmpMetric = 'hours'; 

let sortDirection = 1;
window.sortEmpTable = (colIndex) => {
    sortDirection *= -1;
    employeeStats.sort((a, b) => {
        let valA, valB;
        if (colIndex === 0) { valA = a.name; valB = b.name; }
        else if (colIndex === 1 || colIndex === 3) { valA = a.hours; valB = b.hours; }
        else { valA = Array.from(a.locations).join(', '); valB = Array.from(b.locations).join(', '); }
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
    
    document.getElementById('monthFilter').addEventListener('change', handleMonthChange);
    
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentChartType = e.target.dataset.type;
            renderChart(currentFilteredData);
        });
    });

    document.querySelectorAll('.emp-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.emp-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentEmpMetric = e.target.dataset.type; 
            renderEmployeeChart(employeeStats);
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
                rawReports: [] 
            });
        }
        
        const entry = dataMap.get(dateKey);
        const rev = report.revenue || 0;
        
        if (report.location === 'Oświęcim') entry.oswiecim += rev;
        if (report.location === 'Wilamowice') entry.wilamowice += rev;
        entry.total += rev;
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
    renderEmployeeChart(employeeStats);
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

function renderEmployeeChart(stats) {
    const ctx = document.getElementById('employeeChart').getContext('2d');
    
    const sortedStats = [...stats].sort((a, b) => {
        if(currentEmpMetric === 'hours') return b.hours - a.hours;
        return b.revenue - a.revenue;
    });

    const labels = sortedStats.map(e => e.name);
    const values = sortedStats.map(e => currentEmpMetric === 'hours' ? e.hours : e.revenue);
    
    const bgColors = labels.map(name => EMPLOYEE_COLORS[name] || 'rgba(211, 84, 0, 0.7)');
    const borderColors = labels.map(name => EMPLOYEE_COLORS[name] ? '#fff' : '#D35400');

    if (employeeChart) employeeChart.destroy();

    employeeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: currentEmpMetric === 'hours' ? 'Godziny' : 'Utarg (PLN)',
                data: values,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: { display: false },
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
                            const emp = sortedStats[dataIndex]; 

                            if(emp) {
                                let html = `<div class="tt-header">${emp.name}</div>`;
                                html += `<div class="tt-row"><span>Łącznie godzin:</span> <span class="tt-val">${emp.hours.toFixed(1)}h</span></div>`;
                                html += `<div class="tt-row"><span>Łączny utarg:</span> <span class="tt-val highlight">${formatMoney(emp.revenue)}</span></div>`;
                                html += `<div class="tt-sub">LOKALIZACJE:</div>`;
                                for(let [loc, h] of Object.entries(emp.locBreakdown)) {
                                    html += `<div class="tt-row"><span>${loc}:</span> <span class="tt-val">${h.toFixed(1)}h</span></div>`;
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
                x: { ticks: { color: '#888' }, grid: { color: '#333' } },
                y: { ticks: { color: '#eee', font: { family: 'Roboto', weight: 'bold' } }, grid: { display: false } }
            }
        }
    });
}

function renderDetailedEmployeeTable(stats) {
    const tbody = document.querySelector("#employeeTable tbody");
    tbody.innerHTML = '';
    stats.forEach(emp => {
        const tr = document.createElement('tr');
        const locs = Array.from(emp.locations).join(', ');
        const percent = (emp.hours / 160) * 100;
        let percentColor = '#aaa';
        if (percent > 100) percentColor = '#e74c3c'; 
        else if (percent > 80) percentColor = '#27ae60'; 
        
        tr.innerHTML = `
            <td style="font-weight:bold; color:#fff;">${emp.name}</td>
            <td class="val-cell" style="color:var(--primary-color);">${emp.hours.toFixed(1)} h</td>
            <td class="val-cell" style="color:${percentColor}; font-weight:bold;">${percent.toFixed(1)}%</td>
            <td style="color:#aaa;">${locs}</td>
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

    for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = `${String(day).padStart(2,'0')}.${String(filterMonth).padStart(2,'0')}.${filterYear}`;
        const dayData = data.find(d => d.dateStr === dayStr);
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        
        if (dayData) {
            const revenue = dayData.total;
            let cssClass = '';
            if (revenue > 4000) cssClass = 'fire';
            else if (revenue > 2000) cssClass = 'warm';
            const intensity = Math.min(revenue / 6000, 1);
            cell.style.backgroundColor = `rgba(211, 84, 0, ${0.15 + (intensity * 0.85)})`;
            if(cssClass) cell.classList.add(cssClass);
            
            cell.innerHTML = `
                <span class="heatmap-date">${day}</span>
                <span class="heatmap-val">${Math.round(revenue)}</span>
            `;
            
            cell.addEventListener('mouseenter', () => {
                let html = `<div class="tt-header">${dayStr} - ${dayData.dayOfWeek}</div>`;
                html += `<div class="tt-row"><span>Suma:</span> <span class="tt-val highlight">${formatMoney(revenue)}</span></div>`;
                html += `<div class="tt-row"><span>Oświęcim:</span> <span class="tt-val">${formatMoney(dayData.oswiecim)}</span></div>`;
                html += `<div class="tt-row"><span>Wilamowice:</span> <span class="tt-val">${formatMoney(dayData.wilamowice)}</span></div>`;
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
    const oswData = sorted.map(d => d.oswiecim);
    const wilData = sorted.map(d => d.wilamowice);

    if (revenueChart) revenueChart.destroy();

    const isLine = currentChartType === 'line';
    const colorOsw = '#D35400'; 
    const colorWil = '#9E9E9E'; 

    revenueChart = new Chart(ctx, {
        type: currentChartType,
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Oświęcim',
                    data: oswData,
                    backgroundColor: isLine ? 'rgba(211, 84, 0, 0.2)' : 'rgba(211, 84, 0, 0.8)',
                    borderColor: colorOsw,
                    borderWidth: 2,
                    borderRadius: 4,
                    tension: 0.3,
                    fill: isLine
                },
                {
                    label: 'Wilamowice',
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
                                html += `<div class="tt-row"><span>Suma dnia:</span> <span class="tt-val highlight">${formatMoney(dayData.total)}</span></div>`;
                                html += `<div class="tt-row"><span>Oświęcim:</span> <span class="tt-val">${formatMoney(dayData.oswiecim)}</span></div>`;
                                html += `<div class="tt-row"><span>Wilamowice:</span> <span class="tt-val">${formatMoney(dayData.wilamowice)}</span></div>`;
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