import { formatMoney } from '../utils.js';

const LOCATION_COLORS = ['#D35400', '#E67E22', '#F39C12', '#9E9E9E', '#27AE60'];

class AdminRender {
    constructor() {
        this.chart = null;
    }

    buildSymbolIcon(name, extraClass = '') {
        const className = ['summary-icon-badge', extraClass].filter(Boolean).join(' ');
        return `<span class="${className} material-symbols-rounded" aria-hidden="true">${name}</span>`;
    }

    renderChart(ctx, data, type, options) {
        const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
        const locations = this.getVisibleLocations(sorted);
        const labels = sorted.map(day => `${day.dateStr.slice(0, 5)} (${day.dayOfWeek.slice(0, 3)})`);

        if (this.chart) this.chart.destroy();

        Chart.defaults.font.family = "'Roboto', sans-serif";
        Chart.defaults.color = "#888";

        this.chart = new Chart(ctx, {
            type,
            data: {
                labels,
                datasets: locations.map((location, index) => ({
                    label: this.buildDatasetLabel(location, options),
                    data: sorted.map(day => this.getMetricValue(day.locations?.[location], options.viewMode)),
                    backgroundColor: LOCATION_COLORS[index % LOCATION_COLORS.length],
                    borderColor: LOCATION_COLORS[index % LOCATION_COLORS.length],
                    borderWidth: 2,
                    tension: 0.32,
                    fill: false,
                    pointRadius: type === 'line' ? 4 : 0,
                    pointHoverRadius: 6
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            font: { family: "'Oswald', sans-serif", size: 14 }
                        }
                    },
                    tooltip: {
                        enabled: false,
                        external: context => this.handleChartTooltip(context, options, sorted)
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#333' },
                        ticks: {
                            callback: value => `${Math.round(value)} zł`
                        }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    renderHeatmap(container, data, year, month, options) {
        container.innerHTML = ['PONIEDZIAŁEK', 'WTOREK', 'ŚRODA', 'CZWARTEK', 'PIĄTEK', 'SOBOTA', 'NIEDZIELA']
            .map(day => `<div class="heatmap-day-header">${day}</div>`)
            .join('');

        const monthNumber = Number(month);
        const yearNumber = Number(year);
        const daysInMonth = new Date(yearNumber, monthNumber, 0).getDate();
        const startDay = new Date(yearNumber, monthNumber - 1, 1).getDay() || 7;
        const monthlyPeak = data.reduce((max, day) => Math.max(max, this.getMetricValue(day, options.viewMode)), 0) || 1;
        const dataMap = new Map(data.map(day => [day.dateStr, day]));

        for (let offset = 1; offset < startDay; offset++) {
            container.innerHTML += `<div class="heatmap-cell heatmap-empty"></div>`;
        }

        for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
            const dateStr = `${String(dayNumber).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
            const entry = dataMap.get(dateStr);

            if (!entry) {
                const emptyCell = document.createElement('div');
                emptyCell.className = 'heatmap-cell heatmap-empty';
                emptyCell.innerHTML = `<span class="heatmap-date">${dayNumber}</span>`;
                container.appendChild(emptyCell);
                continue;
            }

            const value = this.getMetricValue(entry, options.viewMode);
            const intensity = Math.min(value / monthlyPeak, 1);
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            cell.style.setProperty('--heat-intensity', intensity.toFixed(2));

            if (intensity >= 0.78) cell.classList.add('fire');
            else if (intensity >= 0.45) cell.classList.add('warm');

            cell.innerHTML = `
                <span class="heatmap-date">${dayNumber}</span>
                <span class="heatmap-val">${Math.round(value)} zł</span>
            `;

            cell.addEventListener('mouseenter', () => this.showTooltip(entry, options));
            cell.addEventListener('mousemove', event => this.moveTooltip(event));
            cell.addEventListener('mouseleave', () => this.hideTooltip());
            container.appendChild(cell);
        }
    }

    renderSummary(container, data, options) {
        if (!data.length) {
            container.innerHTML = this.buildEmptyState('Brak dni po aktywnych filtrach.');
            return;
        }

        const total = data.reduce((sum, day) => sum + day.total, 0);
        const cards = data.reduce((sum, day) => sum + day.cardTotal, 0);
        const glovoNet = data.reduce((sum, day) => sum + day.glovoNetTotal, 0);
        const cashDesk = data.reduce((sum, day) => sum + day.cashDeskTotal, 0);
        const averageDay = total / data.length;

        container.innerHTML = `
            <div class="summary-box summary-box--primary">
                <span class="summary-kicker">${this.buildSymbolIcon('store')} Utarg lokalu</span>
                <h3>Łączny wynik</h3>
                <p class="highlight">${formatMoney(total)}</p>
                <small>${data.length} dni / średnio ${formatMoney(averageDay)}</small>
            </div>
            <div class="summary-box">
                <span class="summary-kicker">${this.buildSymbolIcon('credit_card')} Płatności</span>
                <h3>Karty</h3>
                <p>${formatMoney(cards)}</p>
                <small>${this.formatPercent(cards, total)} całego utargu</small>
            </div>
            <div class="summary-box summary-box--glovo">
                <span class="summary-kicker">${this.buildSymbolIcon('delivery_dining', 'summary-icon-badge--glovo')} Glovo</span>
                <h3>Glovo netto</h3>
                <p>${formatMoney(glovoNet)}</p>
                <small>Po prowizji Glovo</small>
            </div>
            <div class="summary-box">
                <span class="summary-kicker">${this.buildSymbolIcon('payments')} Kasetka</span>
                <h3>Gotówka na lokalu</h3>
                <p>${formatMoney(cashDesk)}</p>
                <small>${this.formatPercent(cashDesk, total)} po odjęciu kart i Glovo</small>
            </div>
        `;
    }

    renderInsights(container, data, options) {
        if (!data.length) {
            container.innerHTML = '';
            return;
        }

        const strongestDay = [...data].sort((left, right) => right.total - left.total)[0];
        const glovoHeavy = [...data].sort((left, right) => {
            const rightRatio = right.total ? this.getGlovoDisplayValue(right) / right.total : 0;
            const leftRatio = left.total ? this.getGlovoDisplayValue(left) / left.total : 0;
            return rightRatio - leftRatio;
        })[0];
        const leader = this.aggregateLocations(data)[0];

        container.innerHTML = `
            <div class="insight-card">
                <span class="insight-label">${this.buildSymbolIcon('local_fire_department')} Najmocniejszy dzień</span>
                <strong>${strongestDay.dateStr}</strong>
                <p>${formatMoney(strongestDay.total)} / ${strongestDay.dayOfWeek}</p>
            </div>
            <div class="insight-card insight-card--glovo">
                <span class="insight-label">${this.buildSymbolIcon('delivery_dining', 'summary-icon-badge--glovo')} Największy udział Glovo</span>
                <strong>${glovoHeavy.dateStr}</strong>
                <p>${this.formatPercent(this.getGlovoDisplayValue(glovoHeavy), glovoHeavy.total)} dnia</p>
            </div>
            <div class="insight-card insight-card--accent">
                <span class="insight-label">${this.buildSymbolIcon('place')} Lider punktów</span>
                <strong>${leader?.name || 'Brak'}</strong>
                <p>${leader ? `${formatMoney(leader.total)} / średnio ${formatMoney(leader.avgDay)}` : '-'}</p>
            </div>
        `;
    }

    renderLocationPerformance(container, data, options) {
        if (!data.length) {
            container.innerHTML = '';
            return;
        }

        const aggregated = this.aggregateLocations(data);
        container.innerHTML = aggregated.map((location, index) => `
            <div class="location-card ${index === 0 ? 'location-card--lead' : ''}">
                <div class="location-card-head">
                    <div>
                        <span class="summary-kicker">${this.buildSymbolIcon('place')} Punkt</span>
                        <h3>${location.name}</h3>
                    </div>
                    <span class="location-rank">#${index + 1}</span>
                </div>
                <div class="location-total">${formatMoney(location.total)}</div>
                <div class="location-stats">
                    <div><span>Średnio / dzień</span><strong>${formatMoney(location.avgDay)}</strong></div>
                    <div><span>Karty</span><strong>${formatMoney(location.card)}</strong></div>
                    <div class="location-stat--glovo"><span>Glovo netto</span><strong>${formatMoney(location.glovoNet)}</strong></div>
                    <div><span>Gotówka na lokalu</span><strong>${formatMoney(location.cashDesk)}</strong></div>
                </div>
                <div class="location-foot">
                    <span>Najlepszy dzień: ${location.bestDay.dateStr}</span>
                    <strong>${formatMoney(location.bestDay.total)}</strong>
                </div>
            </div>
        `).join('');
    }

    renderTable(tbody, data, options) {
        tbody.innerHTML = data.map(day => {
            const locationRows = Object.values(day.locations || {})
                .sort((left, right) => right.total - left.total)
                .map(location => `
                    <div class="point-pill">
                        <span>${location.name}</span>
                        <strong>${formatMoney(location.total)}</strong>
                    </div>
                `)
                .join('');

            return `
                <tr>
                    <td>
                        <div class="cell-primary">${day.dateStr}</div>
                        <div class="cell-secondary">Utarg dnia: ${formatMoney(day.total)}</div>
                    </td>
                    <td>${day.dayOfWeek}</td>
                    <td><div class="point-pill-list">${locationRows}</div></td>
                    <td class="val-cell">${formatMoney(day.cardTotal)}</td>
                    <td class="val-cell">
                        <div class="cell-primary">${formatMoney(this.getGlovoDisplayValue(day))}</div>
                        <div class="cell-secondary">po prowizji</div>
                    </td>
                    <td class="val-cell total-cell">${formatMoney(day.cashDeskTotal)}</td>
                    <td>${day.weather ? this.buildWeatherCard(day.weather, false) : '<span class="weather-card-empty">Brak danych</span>'}</td>
                </tr>
            `;
        }).join('');
    }

    renderEmployeeTable(tbody, stats) {
        tbody.innerHTML = stats.map(employee => {
            const percent = (employee.hours / 160) * 100;
            const topLocation = Object.entries(employee.locBreakdown).sort((left, right) => right[1] - left[1])[0];
            const locationBadges = Object.entries(employee.locBreakdown)
                .sort((left, right) => right[1] - left[1])
                .map(([location, hours]) => `
                    <span class="point-pill">
                        <span>${location}</span>
                        <strong>${Math.round((hours / employee.hours) * 100)}%</strong>
                    </span>
                `)
                .join('');

            return `
                <tr>
                    <td>
                        <div class="cell-primary">${employee.name}</div>
                        <div class="cell-secondary">${topLocation ? `Głównie: ${topLocation[0]}` : 'Brak lokalizacji'}</div>
                    </td>
                    <td class="val-cell">
                        <div class="cell-primary">${employee.hours.toFixed(1)} h</div>
                        <div class="cell-secondary">Łącznie w okresie</div>
                    </td>
                    <td class="val-cell"><span class="point-pill point-pill--accent"><strong>${percent.toFixed(1)}%</strong></span></td>
                    <td><div class="point-pill-list">${locationBadges}</div></td>
                </tr>
            `;
        }).join('');
    }

    renderActiveFilters(container, labels) {
        container.innerHTML = labels.map(label => `<span class="filter-chip">${label}</span>`).join('');
    }

    buildTooltipHtml(data, options) {
        const totalValue = this.getMetricValue(data, options.viewMode);
        const totalLabel = this.getViewLabel(options.viewMode);
        const locations = Object.values(data.locations || {}).sort((left, right) => right.total - left.total);

        const shifts = [];
        data.rawReports?.forEach(report => {
            if (!report.employees) return;
            Object.entries(report.employees).forEach(([name, time]) => shifts.push({ name, time, loc: report.location }));
        });

        const shiftsHtml = shifts.length
            ? `
                <div class="tt-divider"></div>
                <div class="tt-label" style="margin-bottom:6px;">ZMIANY</div>
                <div class="tt-shifts-list">
                    ${shifts.map(shift => `
                        <div class="tt-shift-item">
                            <span class="tt-shift-name"><span class="tt-shift-dot"></span>${shift.name} <span style="color:#666; font-size:10px; margin-left:4px;">(${shift.loc.slice(0, 3)})</span></span>
                            <span class="tt-shift-time">${shift.time}</span>
                        </div>
                    `).join('')}
                </div>
            `
            : `<div class="tt-divider"></div><div style="font-size:11px; color:#666; font-style:italic;">Brak danych o zmianach</div>`;

        return `
            <div class="tt-inner">
                <div class="tt-header">
                    <span>${data.dateStr}</span>
                    <span class="tt-day">${data.dayOfWeek}</span>
                </div>

                <div class="tt-main-stats">
                    <div class="tt-big-row">
                        <span class="tt-label">${totalLabel}</span>
                        <span class="tt-value-main">${formatMoney(totalValue)}</span>
                    </div>
                    <div class="tt-big-row">
                        <span class="tt-label">UTARG LOKALU</span>
                        <span class="tt-value-sub">${formatMoney(data.total)}</span>
                    </div>
                    <div class="tt-big-row">
                        <span class="tt-label">KARTY</span>
                        <span class="tt-value-sub">${formatMoney(data.cardTotal)}</span>
                    </div>
                    <div class="tt-big-row">
                        <span class="tt-label">GLOVO</span>
                        <span class="tt-value-sub">${formatMoney(this.getGlovoDisplayValue(data))}</span>
                    </div>
                    <div class="tt-big-row">
                        <span class="tt-label">GOTÓWKA NA LOKALU</span>
                        <span class="tt-value-sub">${formatMoney(data.cashDeskTotal)}</span>
                    </div>
                </div>

                <div class="tt-divider"></div>

                <div class="tt-locations-grid">
                    ${locations.map((location, index) => `
                        <div class="tt-loc-col" ${index > 0 ? 'style="border-left:1px solid #333; padding-left:15px;"' : ''}>
                            <h5>${location.name}</h5>
                            <div class="tt-loc-row"><span>Suma:</span> <span>${formatMoney(location.total)}</span></div>
                            <div class="tt-loc-row"><span>Karty:</span> <span>${formatMoney(location.card)}</span></div>
                            <div class="tt-loc-row"><span>Glovo:</span> <span>${formatMoney(this.getMetricValue(location, 'glovo'))}</span></div>
                            <div class="tt-loc-row"><span>Gotówka:</span> <span>${formatMoney(location.cashDesk)}</span></div>
                        </div>
                    `).join('')}
                </div>

                ${data.weather ? `
                    <div class="tt-divider"></div>
                    ${this.buildWeatherCard(data.weather, true)}
                ` : ''}

                ${shiftsHtml}
            </div>
        `;
    }

    showTooltip(data, options) {
        const tooltip = document.getElementById('customTooltip');
        if (!tooltip) return;
        tooltip.style.display = 'block';
        tooltip.innerHTML = this.buildTooltipHtml(data, options);
    }

    moveTooltip(event) {
        const tooltip = document.getElementById('customTooltip');
        if (!tooltip) return;

        let x = event.clientX + 15;
        let y = event.clientY + 15;

        if (x + 260 > window.innerWidth) x = event.clientX - 270;
        if (y + 160 > window.innerHeight) y = event.clientY - 170;

        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }

    hideTooltip() {
        const tooltip = document.getElementById('customTooltip');
        if (tooltip) tooltip.style.display = 'none';
    }

    handleChartTooltip(context, options, sortedData) {
        const { chart, tooltip } = context;
        if (!tooltip || tooltip.opacity === 0) {
            this.hideTooltip();
            return;
        }

        const point = tooltip.dataPoints?.[0];
        if (!point) return;

        const entry = sortedData[point.dataIndex];
        if (!entry) return;

        this.showTooltip(entry, options);
        this.moveTooltip({
            clientX: chart.canvas.getBoundingClientRect().left + tooltip.caretX,
            clientY: chart.canvas.getBoundingClientRect().top + tooltip.caretY
        });
    }

    getVisibleLocations(data) {
        return Array.from(new Set(data.flatMap(day => Object.keys(day.locations || {}))));
    }

    aggregateLocations(data) {
        const map = new Map();

        data.forEach(day => {
            Object.entries(day.locations || {}).forEach(([name, location]) => {
                if (!map.has(name)) {
                    map.set(name, {
                        name,
                        total: 0,
                        card: 0,
                        glovo: 0,
                        glovoNet: 0,
                        cashDesk: 0,
                        days: 0,
                        bestDay: { total: 0, dateStr: '-' }
                    });
                }

                const target = map.get(name);
                target.total += location.total;
                target.card += location.card;
                target.glovo += location.glovo;
                target.glovoNet += location.glovoNet;
                target.cashDesk += location.cashDesk;
                target.days += 1;

                if (location.total > target.bestDay.total) {
                    target.bestDay = { total: location.total, dateStr: day.dateStr };
                }
            });
        });

        return Array.from(map.values())
            .map(location => ({
                ...location,
                avgDay: location.days ? location.total / location.days : 0
            }))
            .sort((left, right) => right.total - left.total);
    }

    getMetricValue(entry, viewMode) {
        if (!entry) return 0;
        if (viewMode === 'cards') return entry.card ?? entry.cardTotal ?? 0;
        if (viewMode === 'glovo') return entry.glovoNet ?? entry.glovoNetTotal ?? 0;
        if (viewMode === 'cash') return entry.cashDesk ?? entry.cashDeskTotal ?? 0;
        return entry.total ?? 0;
    }

    getGlovoDisplayValue(entry) {
        return entry.glovoNetTotal ?? entry.glovoNet ?? 0;
    }

    buildDatasetLabel(location, options) {
        if (options.viewMode === 'cards') return `${location} • karty`;
        if (options.viewMode === 'glovo') return `${location} • Glovo netto`;
        if (options.viewMode === 'cash') return `${location} • gotówka`;
        return `${location} • utarg`;
    }

    getViewLabel(viewMode) {
        if (viewMode === 'cards') return 'KARTY';
        if (viewMode === 'glovo') return 'GLOVO NETTO';
        if (viewMode === 'cash') return 'GOTÓWKA NA LOKALU';
        return 'UTARG LOKALU';
    }

    formatPercent(value, total) {
        if (!total) return '0.0%';
        return `${((value / total) * 100).toFixed(1)}%`;
    }

    buildEmptyState(label) {
        return `<div class="summary-box summary-box--empty"><h3>${label}</h3><small>Zmień zakres lub resetuj filtry.</small></div>`;
    }

    buildWeatherCard(weather, compact = false) {
        const visual = this.getWeatherVisual(weather);
        const tempMin = weather.tempMin?.toFixed(0) ?? '-';
        const tempMax = weather.tempMax?.toFixed(0) ?? '-';
        const precipitation = weather.precipitationSum?.toFixed(1) ?? '0.0';
        const precipitationHours = weather.precipitationHours?.toFixed(1) ?? '0.0';
        const metrics = compact
            ? `
                <div class="weather-card-metrics">
                    <span>${tempMin}° / ${tempMax}°</span>
                    <span>${precipitation} mm</span>
                    <span>${precipitationHours} h</span>
                </div>
            `
            : `
                <div class="weather-card-metrics">
                    <span>${tempMin}° / ${tempMax}°</span>
                    <span>${precipitation} mm</span>
                </div>
            `;

        return `
            <div class="weather-card weather-card--${visual.theme} ${compact ? 'weather-card--compact' : ''}">
                <div class="weather-card-visual">
                    <div class="weather-icon">${visual.icon}</div>
                </div>
                <div class="weather-card-copy">
                    <span class="weather-card-kicker">OŚWIĘCIM</span>
                    <strong>${weather.label}</strong>
                    ${metrics}
                </div>
            </div>
        `;
    }

    getWeatherVisual(weather) {
        const code = weather.code ?? -1;

        if (code === 0 || code === 1) {
            return {
                theme: 'sun',
                icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="12"></circle><path d="M32 8v8M32 48v8M8 32h8M48 32h8M15 15l6 6M43 43l6 6M49 15l-6 6M21 43l-6 6"></path></svg>'
            };
        }

        if (code === 2 || code === 3 || code === 45 || code === 48) {
            return {
                theme: 'cloud',
                icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M22 49h24a11 11 0 0 0 1-22 16 16 0 0 0-30-4A10 10 0 0 0 22 49Z"></path></svg>'
            };
        }

        if ([71, 73, 75, 77, 85, 86].includes(code)) {
            return {
                theme: 'snow',
                icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M22 36h22a10 10 0 0 0 1-20 14 14 0 0 0-26-3A9 9 0 0 0 22 36Z"></path><path d="M21 45h22M26 41l-5 4 5 4M38 41l5 4-5 4M32 39v12"></path></svg>'
            };
        }

        if ([95, 96, 99].includes(code)) {
            return {
                theme: 'storm',
                icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M22 35h23a10 10 0 0 0 1-20 14 14 0 0 0-26-2A9 9 0 0 0 22 35Z"></path><path d="M33 35l-6 11h7l-3 10 10-14h-7l4-7"></path></svg>'
            };
        }

        if ((weather.precipitationHours || 0) >= 4 && (weather.precipitationSum || 0) < 1) {
            return {
                theme: 'wind',
                icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 24h29c6 0 10-3 10-8 0-4-3-7-7-7-5 0-8 3-8 7"></path><path d="M8 34h39c5 0 9 3 9 8 0 4-3 7-7 7-4 0-7-3-7-7"></path><path d="M14 44h20"></path></svg>'
            };
        }

        return {
            theme: 'rain',
            icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M22 34h23a10 10 0 0 0 1-20 14 14 0 0 0-26-2A9 9 0 0 0 22 34Z"></path><path d="M24 40l-3 8M33 40l-3 8M42 40l-3 8"></path></svg>'
        };
    }
}

export const adminRender = new AdminRender();
