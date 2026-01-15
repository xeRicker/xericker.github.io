import { formatMoney } from '../utils.js';

class AdminRender {
    constructor() {
        this.chart = null;
        this.triviaInterval = null;
    }

    renderChart(ctx, data, type, viewMode) {
        const sorted = [...data].sort((a,b) => a.timestamp - b.timestamp);
        const labels = sorted.map(d => `${d.dateStr.slice(0,5)} (${d.dayOfWeek.slice(0,3)})`);
        const isCard = viewMode === 'cards';
        const dOsw = sorted.map(d => isCard ? d.oswiecimCard : d.oswiecim);
        const dWil = sorted.map(d => isCard ? d.wilamowiceCard : d.wilamowice);

        if(this.chart) this.chart.destroy();

        this.chart = new Chart(ctx, {
            type: type,
            data: {
                labels,
                datasets: [
                    { label: `Oświęcim${isCard?' (K)':''}`, data: dOsw, backgroundColor: '#D35400', borderColor: '#D35400', borderWidth: 1 },
                    { label: `Wilamowice${isCard?' (K)':''}`, data: dWil, backgroundColor: '#9E9E9E', borderColor: '#9E9E9E', borderWidth: 1 }
                ]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true, grid: { color: '#333' } }, x: { grid: { display: false } } } }
        });
    }

    renderHeatmap(container, data, year, month) {
        container.innerHTML = ['Pn','Wt','Śr','Cz','Pt','So','Nd'].map(d => `<div class="heatmap-day-header">${d}</div>`).join('');
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
                container.innerHTML += `<div class="${cls}" style="background:#1a1a1a">${content}</div>`;
            }
        }
    }

    showTooltip(data) {
        const tt = document.getElementById('customTooltip');
        if(!tt) return;
        tt.style.display = 'block';
        tt.innerHTML = `
            <div class="tt-header">${data.dateStr}</div>
            <div class="tt-row"><span>Suma:</span> <span class="tt-val highlight">${formatMoney(data.total)}</span></div>
            <div class="tt-row"><span>Karty:</span> <span class="tt-val">${formatMoney(data.cardTotal)}</span></div>
            <div class="tt-sub">Oświęcim: ${formatMoney(data.oswiecim)}</div>
            <div class="tt-sub">Wilamowice: ${formatMoney(data.wilamowice)}</div>
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