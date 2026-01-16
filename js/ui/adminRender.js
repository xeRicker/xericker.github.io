import { formatMoney } from '../utils.js';

class AdminRender {
    constructor() {
        this.chart = null;
        this.reqChart = null;
        this.countChart = null;
        this.triviaInterval = null;
    }

    renderChart(ctx, data, type, viewMode) {
        const sorted = [...data].sort((a,b) => a.timestamp - b.timestamp);
        const labels = sorted.map(d => `${d.dateStr.slice(0,5)} (${d.dayOfWeek.slice(0,3)})`);
        const isCard = viewMode === 'cards';
        const dOsw = sorted.map(d => isCard ? d.oswiecimCard : d.oswiecim);
        const dWil = sorted.map(d => isCard ? d.wilamowiceCard : d.wilamowice);

        if(this.chart) this.chart.destroy();

        Chart.defaults.font.family = "'Roboto', sans-serif";
        Chart.defaults.color = "#888";

        this.chart = new Chart(ctx, {
            type: type,
            data: {
                labels,
                datasets: [
                    { label: `OŚWIĘCIM${isCard?' (K)':''}`, data: dOsw, backgroundColor: '#D35400', borderColor: '#D35400', borderWidth: 1 },
                    { label: `WILAMOWICE${isCard?' (K)':''}`, data: dWil, backgroundColor: '#9E9E9E', borderColor: '#9E9E9E', borderWidth: 1 }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            font: { family: "'Oswald', sans-serif", size: 14 }
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#333' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    renderProductStats(reqCtx, countCtx, stats) {
        if(this.reqChart) this.reqChart.destroy();
        if(this.countChart) this.countChart.destroy();

        const commonOptions = {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#333' }, ticks: { color: '#888' } },
                y: { grid: { display: false }, ticks: { color: '#eee', font: { family: "'Roboto', sans-serif" } } }
            }
        };

        this.reqChart = new Chart(reqCtx, {
            type: 'bar',
            data: {
                labels: stats.requests.map(i => i.name),
                datasets: [{
                    data: stats.requests.map(i => i.val),
                    backgroundColor: '#D35400',
                    borderRadius: 4
                }]
            },
            options: commonOptions
        });

        this.countChart = new Chart(countCtx, {
            type: 'bar',
            data: {
                labels: stats.counts.map(i => i.name),
                datasets: [{
                    data: stats.counts.map(i => i.val),
                    backgroundColor: '#27AE60',
                    borderRadius: 4
                }]
            },
            options: commonOptions
        });
    }

    renderHeatmap(container, data, year, month) {
        container.innerHTML = ['PONIEDZIAŁEK','WTOREK','ŚRODA','CZWARTEK','PIĄTEK','SOBOTA','NIEDZIELA'].map(d => `<div class="heatmap-day-header">${d}</div>`).join('');
        const daysInMonth = new Date(year, month, 0).getDate();
        const startDay = new Date(year, month-1, 1).getDay() || 7;

        for(let i=1; i<startDay; i++) container.innerHTML += `<div class="heatmap-cell heatmap-empty"></div>`;

        for(let d=1; d<=daysInMonth; d++) {
            const dateStr = `${String(d).padStart(2,'0')}.${String(month).padStart(2,'0')}.${year}`;
            const entry = data.find(x => x.dateStr === dateStr);
            let cls = 'heatmap-cell';
            let content = `<span class="heatmap-date">${d}</span>`;

            if(entry) {
                const val = entry.total;
                if(val > 4000) cls += ' fire';
                else if(val > 2000) cls += ' warm';
                const alpha = 0.15 + (Math.min(val/6000, 1) * 0.85);
                content += `<span class="heatmap-val">${Math.round(val)}</span>`;

                const el = document.createElement('div');
                el.className = cls;
                el.style.backgroundColor = `rgba(211,84,0,${alpha})`;
                el.innerHTML = content;

                el.addEventListener('mouseenter', () => this.showTooltip(entry));
                el.addEventListener('mousemove', (e) => this.moveTooltip(e));
                el.addEventListener('mouseleave', () => this.hideTooltip());

                container.appendChild(el);
            } else {
                const el = document.createElement('div');
                el.className = cls;
                el.style.background = '#1a1a1a';
                el.innerHTML = content;
                container.appendChild(el);
            }
        }
    }

    showTooltip(data) {
        const tt = document.getElementById('customTooltip');
        if(!tt) return;

        let shiftsHtml = '';
        const shifts = [];

        if (data.rawReports && data.rawReports.length > 0) {
            data.rawReports.forEach(report => {
                if (report.employees) {
                    Object.entries(report.employees).forEach(([name, time]) => {
                        shifts.push({ name, time, loc: report.location });
                    });
                }
            });
        }

        if (shifts.length > 0) {
            shiftsHtml = `<div class="tt-divider"></div>
                          <div class="tt-label" style="margin-bottom:6px;">ZMIANY</div>
                          <div class="tt-shifts-list">
                            ${shifts.map(s => `
                                <div class="tt-shift-item">
                                    <span class="tt-shift-name"><span class="tt-shift-dot"></span>${s.name} <span style="color:#666; font-size:10px; margin-left:4px;">(${s.loc.slice(0,3)})</span></span>
                                    <span class="tt-shift-time">${s.time}</span>
                                </div>
                            `).join('')}
                          </div>`;
        } else {
            shiftsHtml = `<div class="tt-divider"></div><div style="font-size:11px; color:#666; font-style:italic;">Brak danych o zmianach</div>`;
        }

        tt.style.display = 'block';
        tt.innerHTML = `
            <div class="tt-inner">
                <div class="tt-header">
                    <span>${data.dateStr}</span>
                    <span class="tt-day">${data.dayOfWeek}</span>
                </div>

                <div class="tt-main-stats">
                    <div class="tt-big-row">
                        <span class="tt-label">CAŁKOWITY UTARG</span>
                        <span class="tt-value-main">${formatMoney(data.total)}</span>
                    </div>
                    <div class="tt-big-row">
                        <span class="tt-label">W TYM KARTY</span>
                        <span class="tt-value-sub">${formatMoney(data.cardTotal)}</span>
                    </div>
                </div>

                <div class="tt-divider"></div>

                <div class="tt-locations-grid">
                    <div class="tt-loc-col">
                        <h5>OŚWIĘCIM</h5>
                        <div class="tt-loc-row"><span>Suma:</span> <span>${formatMoney(data.oswiecim)}</span></div>
                        <div class="tt-loc-row"><span>Karty:</span> <span>${formatMoney(data.oswiecimCard)}</span></div>
                    </div>
                    <div class="tt-loc-col" style="border-left:1px solid #333; padding-left:15px;">
                        <h5>WILAMOWICE</h5>
                        <div class="tt-loc-row"><span>Suma:</span> <span>${formatMoney(data.wilamowice)}</span></div>
                        <div class="tt-loc-row"><span>Karty:</span> <span>${formatMoney(data.wilamowiceCard)}</span></div>
                    </div>
                </div>

                ${shiftsHtml}
            </div>
        `;
    }

    moveTooltip(e) {
        const tt = document.getElementById('customTooltip');
        if(!tt) return;

        let x = e.clientX + 15;
        let y = e.clientY + 15;

        if (x + 230 > window.innerWidth) x = e.clientX - 240;
        if (y + 160 > window.innerHeight) y = e.clientY - 170;

        tt.style.left = x + 'px';
        tt.style.top = y + 'px';
    }

    hideTooltip() {
        const tt = document.getElementById('customTooltip');
        if(tt) tt.style.display = 'none';
    }

    renderTable(tbody, data) {
        tbody.innerHTML = data.map(r => `
            <tr>
                <td>${r.dateStr}</td>
                <td>${r.dayOfWeek}</td>
                <td class="val-cell">${r.oswiecim?formatMoney(r.oswiecim):'-'}</td>
                <td class="val-cell">${r.wilamowice?formatMoney(r.wilamowice):'-'}</td>
                <td class="val-cell total-cell">${formatMoney(r.total)}</td>
            </tr>
        `).join('');
    }

    renderSummary(container, data) {
        const total = data.reduce((s, d) => s + d.total, 0);
        const osw = data.reduce((s, d) => s + d.oswiecim, 0);
        const wil = data.reduce((s, d) => s + d.wilamowice, 0);
        container.innerHTML = `
            <div class="summary-box"><h3>SUMA</h3><p class="highlight">${formatMoney(total)}</p></div>
            <div class="summary-box"><h3>OŚWIĘCIM</h3><p>${formatMoney(osw)}</p></div>
            <div class="summary-box"><h3>WILAMOWICE</h3><p>${formatMoney(wil)}</p></div>
        `;
    }

    renderEmployeeTable(tbody, stats) {
        tbody.innerHTML = stats.map(s => {
            const pct = (s.hours/160)*100;
            const col = pct>100?'#e74c3c':pct>80?'#27ae60':'#aaa';
            const locEntries = Object.entries(s.locBreakdown);
            let maxH = 0;
            locEntries.forEach(([_, h]) => { if(h > maxH) maxH = h; });
            const locs = locEntries.map(([l,h]) => {
                const isDominant = (h === maxH && h > 0);
                return `<span style="color:${isDominant?'#D35400':'#9E9E9E'}">${l} ${Math.round((h/s.hours)*100)}%</span>`;
            }).join(' • ');

            return `
            <tr>
                <td>${s.name}</td>
                <td class="val-cell" style="color:#D35400">${s.hours.toFixed(1)} h</td>
                <td class="val-cell" style="color:${col}">${pct.toFixed(1)}%</td>
                <td><div class="loc-text">${locs}</div></td>
            </tr>`;
        }).join('');
    }

    renderTriviaCarousel(container, items) {
        if (this.triviaInterval) clearInterval(this.triviaInterval);
        if (!items || items.length === 0) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'block';

        let index = 0;
        const duration = 7000;

        const showItem = (idx) => {
            const item = items[idx % items.length];
            container.innerHTML = `
                <div class="trivia-card-animated anim-fade-in">
                    <div class="trivia-icon">${item.icon}</div>
                    <div class="trivia-content">
                        <h4>${item.title}</h4>
                        <p>${item.text}</p>
                    </div>
                    <div class="trivia-progress"></div>
                </div>
            `;

            const bar = container.querySelector('.trivia-progress');
            setTimeout(() => { if(bar) bar.style.width = '100%'; }, 50);
            bar.style.transitionDuration = `${duration}ms`;
        };

        showItem(index);

        this.triviaInterval = setInterval(() => {
            const card = container.querySelector('.trivia-card-animated');
            if (card) {
                card.classList.remove('anim-fade-in');
                card.classList.add('anim-fade-out');
            }
            setTimeout(() => {
                index++;
                showItem(index);
            }, 500);
        }, duration);
    }
}

export const adminRender = new AdminRender();