import { formatMoney, renderMaterialIcon } from '../utils.js';

const LOCATION_COLOR_TOKENS = [
    '--app-chart-1',
    '--app-chart-2',
    '--app-chart-3',
    '--app-chart-4',
    '--app-chart-5'
];

const getDesignToken = (name, fallback) => {
    const styles = getComputedStyle(document.documentElement);
    return styles.getPropertyValue(name).trim() || fallback;
};

class AdminRender {
    constructor() {
        this.chart = null;
    }

    buildSymbolIcon(name, extraClass = '') {
        return renderMaterialIcon(name, ['summary-icon-badge', extraClass].filter(Boolean).join(' '));
    }

    renderChart(ctx, data, type, options) {
        const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
        const locations = this.getVisibleLocations(sorted);
        const labels = sorted.map(day => `${day.dateStr.slice(0, 5)} (${day.dayOfWeek.slice(0, 3)})`);

        if (this.chart) this.chart.destroy();

        const locationColors = LOCATION_COLOR_TOKENS.map((token, index) =>
            getDesignToken(token, ['#D4521A', '#7DCE82', '#7AB8FF', '#F6C85F', '#C58CFF'][index])
        );

        Chart.defaults.font.family = getDesignToken('--ds-font-family-body', 'ui-sans-serif, system-ui, sans-serif');
        Chart.defaults.color = getDesignToken('--ds-text-subtle', '#A9ABAF');

        this.chart = new Chart(ctx, {
            type,
            data: {
                labels,
                datasets: locations.map((location, index) => ({
                    label: this.buildDatasetLabel(location, options),
                    data: sorted.map(day => this.getMetricValue(day.locations?.[location], options.viewMode)),
                    backgroundColor: locationColors[index % locationColors.length],
                    borderColor: locationColors[index % locationColors.length],
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
                            font: { family: getDesignToken('--ds-font-family-heading', 'ui-sans-serif, system-ui, sans-serif'), size: 14 }
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
                        grid: { color: getDesignToken('--ds-border', '#E3E4F21F') },
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
                <span class="summary-kicker">${this.buildSymbolIcon('monitoring', 'summary-icon-badge--revenue')} Utarg</span>
                <h3>Łączny</h3>
                <p class="highlight">${formatMoney(total)}</p>
                <small>${data.length} dni / średnio ${formatMoney(averageDay)}</small>
            </div>
            <div class="summary-box">
                <span class="summary-kicker">${this.buildSymbolIcon('credit_card', 'summary-icon-badge--cards')} Karty</span>
                <h3>Suma</h3>
                <p>${formatMoney(cards)}</p>
                <small>${this.formatPercent(cards, total)} całego utargu</small>
            </div>
            <div class="summary-box summary-box--glovo">
                <span class="summary-kicker">${this.buildSymbolIcon('takeout_dining', 'summary-icon-badge--glovo')} Glovo</span>
                <h3>Suma</h3>
                <p>${formatMoney(glovoNet)}</p>
                <small>Po prowizji Glovo</small>
            </div>
            <div class="summary-box">
                <span class="summary-kicker">${this.buildSymbolIcon('savings', 'summary-icon-badge--cash')} Gotówka</span>
                <h3>Suma</h3>
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
        const weekEvents = this.getWeekEvents(data);
        const leadEvent = weekEvents[0];

        container.innerHTML = `
            <div class="insight-card">
                <span class="insight-label">${this.buildSymbolIcon('local_fire_department')} Najlepszy dzień</span>
                <strong>${strongestDay.dateStr}</strong>
                <p>${formatMoney(strongestDay.total)} / ${strongestDay.dayOfWeek}</p>
            </div>
            <div class="insight-card insight-card--glovo">
                <span class="insight-label">${this.buildSymbolIcon('takeout_dining', 'summary-icon-badge--glovo')} Największy udział Glovo</span>
                <strong>${glovoHeavy.dateStr}</strong>
                <p>${this.formatPercent(this.getGlovoDisplayValue(glovoHeavy), glovoHeavy.total)} dnia</p>
            </div>
            <div class="insight-card insight-card--accent">
                <span class="insight-label">${this.buildSymbolIcon('place')} Lider punktów</span>
                <strong>${leader?.name || 'Brak'}</strong>
                <p>${leader ? `${formatMoney(leader.total)} / średnio ${formatMoney(leader.avgDay)}` : '-'}</p>
            </div>
            <div class="insight-card insight-card--events" data-week-events="true">
                <span class="insight-label">${this.buildSymbolIcon('event', 'summary-icon-badge--event')} Wydarzenia tygodnia</span>
                <strong>${weekEvents.length ? `${weekEvents.length} ${this.formatEventCount(weekEvents.length)}` : 'Brak'}</strong>
                <p>${leadEvent ? `${leadEvent.dateStr} / ${leadEvent.name}` : 'Brak świąt i wydarzeń w tym tygodniu'}</p>
            </div>
        `;

        const eventCard = container.querySelector('[data-week-events="true"]');
        if (eventCard) {
            eventCard.addEventListener('mouseenter', () => this.showEventsTooltip(weekEvents));
            eventCard.addEventListener('mousemove', event => this.moveTooltip(event));
            eventCard.addEventListener('mouseleave', () => this.hideTooltip());
        }
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
                    <div class="location-stat--glovo"><span>Glovo</span><strong>${formatMoney(location.glovoNet)}</strong></div>
                    <div><span>Gotówka</span><strong>${formatMoney(location.cashDesk)}</strong></div>
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
                        <span class="point-pill__name">${location.name}</span>
                        <strong>${formatMoney(location.total)}</strong>
                    </div>
                `)
                .join('');

            return `
                <tr>
                    <td>
                        <div class="cell-primary">${this.capitalize(day.dayOfWeek)}</div>
                        <div class="cell-secondary">${day.dateStr}</div>
                    </td>
                    <td><div class="point-pill-list point-pill-list--stack">${locationRows}</div></td>
                    <td class="val-cell">${formatMoney(day.cardTotal)}</td>
                    <td class="val-cell">${formatMoney(this.getGlovoDisplayValue(day))}</td>
                    <td class="val-cell cash-cell">${formatMoney(day.cashDeskTotal)}</td>
                    <td class="val-cell total-cell">${formatMoney(day.total)}</td>
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
        container.innerHTML = labels.map(label => `
            <span class="filter-chip filter-chip--status">
                <span class="filter-chip__icon material-symbols-rounded" aria-hidden="true">check_circle</span>
                <span>${label}</span>
            </span>
        `).join('');
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
                    ${options.viewMode === 'total' ? '' : `
                        <div class="tt-big-row">
                            <span class="tt-label">UTARG</span>
                            <span class="tt-value-sub">${formatMoney(data.total)}</span>
                        </div>
                    `}
                    <div class="tt-big-row">
                        <span class="tt-label">KARTY</span>
                        <span class="tt-value-sub">${formatMoney(data.cardTotal)}</span>
                    </div>
                    <div class="tt-big-row">
                        <span class="tt-label">GLOVO</span>
                        <span class="tt-value-sub">${formatMoney(this.getGlovoDisplayValue(data))}</span>
                    </div>
                    <div class="tt-big-row">
                        <span class="tt-label">GOTÓWKA</span>
                        <span class="tt-value-sub">${formatMoney(data.cashDeskTotal)}</span>
                    </div>
                </div>

                <div class="tt-divider"></div>

                <div class="tt-locations-grid">
                    ${locations.map((location, index) => `
                        <div class="tt-loc-col" ${index > 0 ? 'style="border-left:1px solid var(--border-color); padding-left:15px;"' : ''}>
                            <h5>${location.name}</h5>
                            <div class="tt-loc-row"><span>Suma:</span> <span>${formatMoney(location.total)}</span></div>
                            <div class="tt-loc-row"><span>Karty:</span> <span>${formatMoney(location.card)}</span></div>
                            <div class="tt-loc-row"><span>Glovo:</span> <span>${formatMoney(this.getMetricValue(location, 'glovo'))}</span></div>
                            <div class="tt-loc-row"><span>Gotówka:</span> <span>${formatMoney(location.cashDesk)}</span></div>
                        </div>
                    `).join('')}
                </div>

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
        const tooltipWidth = tooltip.offsetWidth || 260;
        const tooltipHeight = tooltip.offsetHeight || 160;

        if (x + tooltipWidth > window.innerWidth) x = event.clientX - tooltipWidth - 10;
        if (y + tooltipHeight > window.innerHeight) y = event.clientY - tooltipHeight - 10;

        tooltip.style.left = `${x + window.scrollX}px`;
        tooltip.style.top = `${y + window.scrollY}px`;
    }

    buildEventsTooltipHtml(events) {
        const rows = events.length
            ? events.map(event => `
                <div class="tt-event-row">
                    <div>
                        <strong>${event.name}</strong>
                        <span>${event.type}</span>
                    </div>
                    <time>${event.dateStr}</time>
                </div>
            `).join('')
            : '<div class="tt-empty-note">Brak świąt i wydarzeń w aktywnym tygodniu.</div>';

        return `
            <div class="tt-inner">
                <div class="tt-header">
                    <span>Wydarzenia tygodnia</span>
                    <span class="tt-day">${events.length || 0}</span>
                </div>
                <div class="tt-events-list">${rows}</div>
            </div>
        `;
    }

    showEventsTooltip(events) {
        const tooltip = document.getElementById('customTooltip');
        if (!tooltip) return;
        tooltip.style.display = 'block';
        tooltip.innerHTML = this.buildEventsTooltipHtml(events);
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
        if (options.viewMode === 'glovo') return `${location} • Glovo`;
        if (options.viewMode === 'cash') return `${location} • gotówka`;
        return `${location} • utarg`;
    }

    getViewLabel(viewMode) {
        if (viewMode === 'cards') return 'KARTY';
        if (viewMode === 'glovo') return 'GLOVO';
        if (viewMode === 'cash') return 'GOTÓWKA';
        return 'UTARG';
    }

    formatPercent(value, total) {
        if (!total) return '0.0%';
        return `${((value / total) * 100).toFixed(1)}%`;
    }

    getWeekEvents(data) {
        const weekRange = this.getCurrentWeekRange(data);
        if (!weekRange) return [];
        const events = [];

        for (const event of this.getCalendarEvents(weekRange.start.getFullYear())) {
            if (event.date >= weekRange.start && event.date <= weekRange.end) {
                events.push({ ...event, dateStr: this.formatDate(event.date) });
            }
        }

        if (weekRange.start.getFullYear() !== weekRange.end.getFullYear()) {
            for (const event of this.getCalendarEvents(weekRange.end.getFullYear())) {
                if (event.date >= weekRange.start && event.date <= weekRange.end) {
                    events.push({ ...event, dateStr: this.formatDate(event.date) });
                }
            }
        }

        return events.sort((left, right) => left.date - right.date);
    }

    getCurrentWeekRange(data) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dataDates = data
            .map(day => day.dateObj)
            .filter(Boolean)
            .map(date => {
                const copy = new Date(date);
                copy.setHours(0, 0, 0, 0);
                return copy;
            });

        const anchor = dataDates.find(date => this.isSameWeek(date, today)) || dataDates[0] || today;
        const start = new Date(anchor);
        const day = start.getDay() || 7;
        start.setDate(start.getDate() - day + 1);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    }

    getCalendarEvents(year) {
        const easter = this.getEasterDate(year);
        const corpusChristi = this.addDays(easter, 60);
        const fatThursday = this.addDays(easter, -52);

        return [
            { date: new Date(year, 0, 1), name: 'Nowy Rok', type: 'Dzień wolny od pracy' },
            { date: new Date(year, 0, 6), name: 'Trzech Króli', type: 'Dzień wolny od pracy' },
            { date: new Date(year, 1, 14), name: 'Walentynki', type: 'Wydarzenie' },
            { date: fatThursday, name: 'Tłusty Czwartek', type: 'Wydarzenie' },
            { date: new Date(year, 2, 8), name: 'Dzień Kobiet', type: 'Wydarzenie' },
            { date: new Date(year, 4, 1), name: 'Święto Pracy', type: 'Dzień wolny od pracy' },
            { date: new Date(year, 4, 3), name: 'Święto Konstytucji 3 Maja', type: 'Dzień wolny od pracy' },
            { date: new Date(year, 4, 26), name: 'Dzień Matki', type: 'Wydarzenie' },
            { date: new Date(year, 5, 1), name: 'Dzień Dziecka', type: 'Wydarzenie' },
            { date: corpusChristi, name: 'Boże Ciało', type: 'Dzień wolny od pracy' },
            { date: new Date(year, 5, 23), name: 'Dzień Ojca', type: 'Wydarzenie' },
            { date: new Date(year, 7, 15), name: 'Wniebowzięcie NMP', type: 'Dzień wolny od pracy' },
            { date: new Date(year, 10, 1), name: 'Wszystkich Świętych', type: 'Dzień wolny od pracy' },
            { date: new Date(year, 10, 11), name: 'Święto Niepodległości', type: 'Dzień wolny od pracy' },
            { date: new Date(year, 11, 24), name: 'Wigilia', type: 'Wydarzenie' },
            { date: new Date(year, 11, 25), name: 'Boże Narodzenie', type: 'Dzień wolny od pracy' },
            { date: new Date(year, 11, 26), name: 'Drugi dzień Świąt', type: 'Dzień wolny od pracy' },
            { date: new Date(year, 11, 31), name: 'Sylwester', type: 'Wydarzenie' }
        ];
    }

    getEasterDate(year) {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(year, month, day);
    }

    addDays(date, days) {
        const copy = new Date(date);
        copy.setDate(copy.getDate() + days);
        return copy;
    }

    isSameWeek(left, right) {
        const range = this.getCurrentWeekRangeFromDate(right);
        return left >= range.start && left <= range.end;
    }

    getCurrentWeekRangeFromDate(date) {
        const start = new Date(date);
        const day = start.getDay() || 7;
        start.setDate(start.getDate() - day + 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    formatDate(date) {
        return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
    }

    formatEventCount(count) {
        if (count === 1) return 'wydarzenie';
        if (count >= 2 && count <= 4) return 'wydarzenia';
        return 'wydarzeń';
    }

    capitalize(value = '') {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    buildEmptyState(label) {
        return `<div class="summary-box summary-box--empty"><h3>${label}</h3><small>Zmień zakres lub resetuj filtry.</small></div>`;
    }

}

export const adminRender = new AdminRender();
