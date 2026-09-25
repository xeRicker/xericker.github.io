import { escapeHtml, formatMoney, renderMaterialIcon } from '../utils.js';
import { cardClass } from './components/Card.js';
import { resolveEmployee } from '../services/employees.js';
import { formatPaymentDate, getPaymentKindLabel } from '../services/payments.js?v=102';

const LOCATION_COLOR_TOKENS = [
    '--app-chart-1',
    '--app-chart-2',
    '--app-chart-3',
    '--app-chart-4',
    '--app-chart-5'
];

const MOVING_AVERAGE_WINDOW = 7;
const MOVING_AVERAGE_MIN_POINTS = 14;

const plural = (count, one, few, many) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (count === 1) return one;
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
    return many;
};

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
        const labels = sorted.map(day => `${day.dateStr.slice(0, 5)} (${day.dayOfWeek.slice(0, 3)})`);
        const chartMode = options.chartMode === 'split' ? 'split' : 'combined';

        if (this.chart) this.chart.destroy();

        const locationColors = LOCATION_COLOR_TOKENS.map((token, index) =>
            getDesignToken(token, ['#D4521A', '#7DCE82', '#7AB8FF', '#F6C85F', '#C58CFF'][index])
        );

        Chart.defaults.font.family = getDesignToken('--font-body', 'sans-serif');
        Chart.defaults.color = getDesignToken('--text-secondary', '#C8BAB3');

        const dayContext = this.buildDayContext(sorted);
        const datasets = chartMode === 'split'
            ? this.buildLocationDatasets(sorted, type, locationColors, options)
            : this.buildCombinedDatasets(sorted, type, locationColors, options);
        const scales = {
            y: {
                beginAtZero: true,
                grid: { color: getDesignToken('--border-color', 'rgba(255, 244, 238, 0.14)') },
                ticks: {
                    callback: value => this.formatAxisMoney(value)
                }
            },
            x: { grid: { display: false } }
        };
        this.chart = new Chart(ctx, {
            type,
            data: { labels, datasets },
            plugins: [this.buildDayContextPlugin(sorted, dayContext)],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            font: { family: getDesignToken('--font-heading', 'sans-serif'), size: 14 }
                        }
                    },
                    tooltip: {
                        enabled: false,
                        external: context => this.handleChartTooltip(context, options, sorted)
                    }
                },
                scales
            }
        });
    }

    buildDayContext(sorted) {
        const eventsByDate = this.getEventsByDate(sorted.map(day => day.dateObj));
        return sorted.map(day => {
            const events = eventsByDate.get(day.dateStr) || [];
            const dayOff = events.find(event => event.type === 'Dzień wolny od pracy');
            return {
                isWeekend: day.dayOfWeek === 'sobota' || day.dayOfWeek === 'niedziela',
                isDayOff: Boolean(dayOff),
                holiday: dayOff?.name || '',
                events
            };
        });
    }

    buildDayContextPlugin(sorted, context) {
        const primary = getDesignToken('--primary-color', '#D4521A');
        const muted = getDesignToken('--text-muted', '#94847C');
        return {
            id: 'dayContext',
            beforeDatasetsDraw: chart => {
                const { ctx, chartArea, scales } = chart;
                if (!chartArea || !scales.x) return;
                const step = scales.x.width / sorted.length;
                context.forEach((info, index) => {
                    if (!info.isDayOff && !info.isWeekend) return;
                    const center = scales.x.getPixelForValue(index);
                    ctx.save();
                    ctx.globalAlpha = info.isDayOff ? 0.16 : 0.05;
                    ctx.fillStyle = info.isDayOff ? primary : muted;
                    ctx.fillRect(center - step / 2, chartArea.top, step, chartArea.bottom - chartArea.top);
                    ctx.restore();
                });
            }
        };
    }

    getEventsByDate(dates) {
        const years = new Set(dates.filter(Boolean).map(date => date.getFullYear()));
        const map = new Map();
        years.forEach(year => {
            this.getCalendarEvents(year).forEach(event => {
                const key = this.formatDate(event.date);
                if (!map.has(key)) map.set(key, []);
                map.get(key).push(event);
            });
        });
        return map;
    }

    getDayContext(dateObj, dayOfWeek) {
        const events = dateObj ? this.getEventsByDate([dateObj]).get(this.formatDate(dateObj)) || [] : [];
        const dayOff = events.find(event => event.type === 'Dzień wolny od pracy');
        return {
            events,
            dayOff,
            isWeekend: dayOfWeek === 'sobota' || dayOfWeek === 'niedziela'
        };
    }

    buildLocationDatasets(sorted, type, locationColors, options) {
        const locations = this.getVisibleLocations(sorted);
        return locations.map((location, index) => ({
            label: this.buildDatasetLabel(location, options),
            locationKey: location,
            data: sorted.map(day => this.getMetricValue(day.locations?.[location], options.viewMode)),
            backgroundColor: locationColors[index % locationColors.length],
            borderColor: locationColors[index % locationColors.length],
            borderWidth: 2,
            tension: 0.32,
            fill: false,
            pointRadius: type === 'line' ? 4 : 0,
            pointHoverRadius: 6
        }));
    }

    buildCombinedDatasets(sorted, type, locationColors, options) {
        const values = sorted.map(day => this.getMetricValue(day, options.viewMode));
        const datasets = [{
            label: `Razem • ${this.getViewLabel(options.viewMode)}`,
            data: values,
            backgroundColor: locationColors[0],
            borderColor: locationColors[0],
            borderWidth: 2,
            tension: 0.32,
            fill: false,
            pointRadius: type === 'line' ? 4 : 0,
            pointHoverRadius: 6
        }];

        if (values.length >= MOVING_AVERAGE_MIN_POINTS) {
            datasets.push({
                type: 'line',
                label: `Średnia ${MOVING_AVERAGE_WINDOW} dni`,
                data: this.movingAverage(values, MOVING_AVERAGE_WINDOW),
                borderColor: getDesignToken('--text-muted', '#9a9a9a'),
                borderDash: [6, 4],
                borderWidth: 2,
                tension: 0.32,
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 0
            });
        }

        return datasets;
    }

    movingAverage(values, windowSize) {
        return values.map((_, index) => {
            const slice = values.slice(Math.max(0, index - windowSize + 1), index + 1);
            return slice.reduce((sum, value) => sum + value, 0) / slice.length;
        });
    }

    formatAxisMoney(value) {
        const abs = Math.abs(value);
        if (abs >= 1000000) return `${(value / 1000000).toFixed(1)} mln zł`;
        if (abs >= 1000) return `${Math.round(value / 1000)} tys. zł`;
        return `${Math.round(value)} zł`;
    }

    renderHeatmap(container, data, year, month, options, label = '') {
        container.innerHTML = '';

        if (label) {
            const title = document.createElement('h4');
            title.className = 'heatmap-month-title';
            title.textContent = label;
            container.appendChild(title);
        }

        const grid = document.createElement('div');
        grid.className = 'heatmap-grid';
        container.appendChild(grid);
        this.renderHeatmapGrid(grid, data, year, month, options);
    }

    renderHeatmapGrid(grid, data, year, month, options) {
        grid.innerHTML = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']
            .map(day => `<div class="heatmap-day-header">${day}</div>`)
            .join('');

        const monthNumber = Number(month);
        const yearNumber = Number(year);
        const daysInMonth = new Date(yearNumber, monthNumber, 0).getDate();
        const startDay = new Date(yearNumber, monthNumber - 1, 1).getDay() || 7;
        const dataMap = new Map(data.map(day => [day.dateStr, day]));
        for (let offset = 1; offset < startDay; offset++) {
            grid.insertAdjacentHTML('beforeend', `<div class="heatmap-cell heatmap-empty"></div>`);
        }

        for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
            const dateStr = `${String(dayNumber).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
            const entry = dataMap.get(dateStr);

            if (!entry) {
                const emptyCell = document.createElement('div');
                emptyCell.className = 'heatmap-cell heatmap-empty';
                emptyCell.innerHTML = `<span class="heatmap-date">${dayNumber}</span>`;
                grid.appendChild(emptyCell);
                continue;
            }

            const value = this.getMetricValue(entry, options.viewMode);
            const workers = this.getDayWorkers(entry, options.employeeCatalog);
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            const level = value >= 3000 ? 'extra' : value >= 2000 ? 'super' : value >= 1000 ? 'ok' : 'low';
            cell.classList.add(`heatmap-cell--${level}`);
            cell.dataset.heatLevel = level;
            cell.dataset.heatValue = Math.round(value);

            const workersHtml = workers.length
                ? `<span class="heatmap-workers">${workers.slice(0, 4).map(worker => `<b>${escapeHtml(worker)}</b>`).join('')}${workers.length > 4 ? `<b class="heatmap-workers__more">+${workers.length - 4}</b>` : ''}</span>`
                : '';

            cell.innerHTML = `
                <span class="heatmap-date">${dayNumber}</span>
                <span class="heatmap-val">${Math.round(value)} zł</span>
                ${workersHtml}
            `;

            cell.addEventListener('mouseenter', () => this.showTooltip(entry, options));
            cell.addEventListener('mousemove', event => this.moveTooltip(event));
            cell.addEventListener('mouseleave', () => this.hideTooltip());
            grid.appendChild(cell);
        }
    }

    getDayWorkers(entry, catalog) {
        const names = new Set();
        (entry.rawReports || []).forEach(report => {
            Object.keys(report.employees || {}).forEach(name => names.add(name));
        });
        const seen = new Set();
        const initials = [];
        names.forEach(name => {
            const value = this.getInitials(name, catalog);
            if (!value || seen.has(value)) return;
            seen.add(value);
            initials.push(value);
        });
        return initials.sort();
    }

    getInitials(name, catalog) {
        const employee = resolveEmployee(name, catalog);
        if (employee) return `${employee.firstName[0] || ''}${employee.lastName[0] || ''}`.toUpperCase();
        const parts = String(name).replace(/[._\-]+/g, ' ').trim().split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return String(name).slice(0, 2).toUpperCase();
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
        const weekEvents = this.getWeekEvents(data);

        container.innerHTML = `
            <div class="${cardClass('summary', 'summary-box summary-box--primary')} ">
                <span class="summary-kicker">${this.buildSymbolIcon('monitoring', 'summary-icon-badge--revenue')} Utarg</span>
                <p class="highlight">${formatMoney(total)}</p>
                <small>${data.length} dni / średnio ${formatMoney(averageDay)}</small>
            </div>
            <div class="${cardClass('summary', 'summary-box')} ">
                <span class="summary-kicker">${this.buildSymbolIcon('credit_card', 'summary-icon-badge--cards')} Karty</span>
                <p>${formatMoney(cards)}</p>
                <small>${this.formatPercent(cards, total)} całego utargu</small>
            </div>
            <div class="${cardClass('summary', 'summary-box summary-box--glovo')} ">
                <span class="summary-kicker">${this.buildSymbolIcon('takeout_dining', 'summary-icon-badge--glovo')} Glovo</span>
                <p>${formatMoney(glovoNet)}</p>
                <small>Po prowizji Glovo</small>
            </div>
            <div class="${cardClass('summary', 'summary-box')} ">
                <span class="summary-kicker">${this.buildSymbolIcon('savings', 'summary-icon-badge--cash')} Gotówka</span>
                <p>${formatMoney(cashDesk)}</p>
                <small>${this.formatPercent(cashDesk, total)} po odjęciu kart i Glovo</small>
            </div>
            ${this.buildWeekEventsTile(weekEvents)}
        `;

        this.bindWeekEvents(container, weekEvents);
    }

    renderWeeklyOverview(container, weeks, activeKey, viewMode) {
        if (!weeks.length) {
            container.innerHTML = '';
            return;
        }

        const metric = viewMode === 'total' ? '' : ` · ${this.getViewLabel(viewMode)}`;
        const monthTotal = weeks.reduce((sum, week) => sum + week.total, 0);
        container.innerHTML = `
            <div class="${cardClass('chart', 'chart-card weekly-overview-card')}">
                <div class="section-heading">
                    <h3>${renderMaterialIcon('calendar_view_week')} Tygodnie${metric}</h3>
                    <p>${escapeHtml(this.buildWeeklySummary(weeks))}</p>
                </div>
                <div class="weekly-grid">
                    ${weeks.map(week => this.buildWeeklyCard(week, activeKey, monthTotal)).join('')}
                </div>
            </div>
        `;
    }

    buildWeeklySummary(weeks) {
        const compared = weeks.filter(week => week.deltaPercent !== null);
        if (!compared.length) return 'Miesiąc obejmuje tylko jeden tydzień.';
        const improving = compared.filter(week => week.deltaPercent > 0.5).length;
        const best = weeks.find(week => week.isBest);
        const trend = improving
            ? `Wyższa średnia dzienna niż w poprzednim tygodniu w ${improving} z ${compared.length} przypadków.`
            : 'Żaden tydzień nie miał wyższej średniej dziennej niż poprzedni.';
        const leader = best ? ` Najwyższą średnią dzienną miał tydzień ${best.index + 1}.` : '';
        return `${trend}${leader}`;
    }

    buildWeeklyCard(week, activeKey, monthTotal) {
        const delta = week.deltaPercent;
        const tone = delta === null ? 'is-neutral' : delta > 0.5 ? 'is-positive' : delta < -0.5 ? 'is-negative' : 'is-neutral';
        const deltaText = delta === null
            ? ''
            : `${delta > 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')}% średniej vs tydzień ${week.index}`;
        const flags = [
            week.isCurrent ? '<span class="weekly-flag weekly-flag--current">Bieżący</span>' : '',
            week.isTopRevenue ? '<span class="weekly-flag weekly-flag--top">Najlepszy tydzień</span>' : '',
            week.isBest ? '<span class="weekly-flag weekly-flag--best">Najwyższa średnia</span>' : '',
            week.isWorst ? '<span class="weekly-flag weekly-flag--worst">Najniższa średnia</span>' : ''
        ].filter(Boolean).join('');
        const isActive = String(week.key) === String(activeKey);
        const days = `${week.days} ${week.days === 1 ? 'dzień' : 'dni'}`;
        const progress = Math.min(100, Math.round((week.days / 7) * 100));
        const share = monthTotal ? Math.round((week.total / monthTotal) * 100) : 0;

        return `
            <button type="button" class="weekly-card ${isActive ? 'is-active' : ''} ${week.isBest ? 'is-best' : ''}" data-week-key="${escapeHtml(week.key)}">
                <span class="weekly-card__head">
                    <span class="weekly-card__label">Tydzień ${week.index + 1}</span>
                    <span class="weekly-card__range">${escapeHtml(week.start)}–${escapeHtml(week.end)} · ${days}</span>
                </span>
                <span class="weekly-card__flags">${flags}</span>
                <strong class="weekly-card__total">${formatMoney(week.total)}</strong>
                <span class="weekly-card__avg">średnio ${formatMoney(week.averageDay)} / dzień · ${share}% miesiąca</span>
                ${delta === null ? '' : `<span class="weekly-card__delta ${tone}">${escapeHtml(deltaText)}</span>`}
                <span class="weekly-card__bar" aria-hidden="true"><i style="width:${progress}%"></i></span>
            </button>
        `;
    }

    renderPaymentsReminder(container, { summary, upcoming, revenueTotal, itemCount }) {
        if (!container) return;
        const heading = `<h3>${renderMaterialIcon('receipt_long')} Opłaty</h3>`;
        const more = '<button class="btn-back payments-reminder__more" type="button" data-open-payments>Zobacz wszystkie</button>';
        const hasItems = itemCount > 0 || summary.openCount > 0 || summary.paidThisMonth > 0;

        if (!hasItems) {
            container.innerHTML = `
                <div class="${cardClass('chart', 'chart-card payments-reminder payments-reminder--positive')}">
                    <div class="section-heading">${heading}</div>
                    <div class="payments-reminder__state payments-reminder__state--ok">${renderMaterialIcon('task_alt')} Brak zobowiązań — wszystko pod kontrolą.</div>
                    <button class="btn-back payments-reminder__more" type="button" data-open-payments>Dodaj opłatę</button>
                </div>
            `;
            return;
        }

        if (summary.openCount === 0) {
            const paidText = summary.paidThisMonth > 0 ? ` W tym miesiącu zapłacono ${formatMoney(summary.paidThisMonth)}.` : '';
            container.innerHTML = `
                <div class="${cardClass('chart', 'chart-card payments-reminder payments-reminder--positive')}">
                    <div class="section-heading">${heading}<p>Wszystkie zobowiązania rozliczone.</p></div>
                    <div class="payments-reminder__state payments-reminder__state--ok">${renderMaterialIcon('task_alt')} Wszystko zapłacone — brak otwartych zobowiązań.${escapeHtml(paidText)}</div>
                    ${more}
                </div>
            `;
            return;
        }

        const share = revenueTotal > 0 ? (summary.left / revenueTotal) * 100 : null;
        const shareText = share === null
            ? 'Brak utargu w wybranym okresie do porównania z zobowiązaniami.'
            : `Otwarte zobowiązania to ${share.toFixed(1)}% utargu tego okresu.`;
        const shareTone = summary.overdueCount ? 'is-negative' : share !== null && share > 60 ? 'is-watch' : 'is-positive';

        const openHeading = `<h3>${summary.overdueCount ? renderMaterialIcon('warning', 'is-alert') : renderMaterialIcon('receipt_long')} Opłaty</h3>`;
        const rows = upcoming.length
            ? `<div class="payments-reminder__table table-responsive">
                    <table>
                        <thead>
                            <tr><th>Zobowiązanie</th><th class="payments-reminder__amount-col">Kwota</th><th>Termin płatności</th></tr>
                        </thead>
                        <tbody>${upcoming.map(view => this.buildReminderRow(view)).join('')}</tbody>
                    </table>
                </div>`
            : '<div class="payments-reminder__empty">Brak płatności w najbliższych 14 dniach.</div>';

        container.innerHTML = `
            <div class="${cardClass('chart', 'chart-card payments-reminder')}">
                <div class="section-heading">${openHeading}<p>${escapeHtml(shareText)}</p></div>
                <div class="payments-reminder__grid">
                    ${this.buildReminderTile('Przeterminowane', summary.overdueAmount, `${summary.overdueCount} ${plural(summary.overdueCount, 'pozycja', 'pozycje', 'pozycji')}`, 'is-negative')}
                    ${this.buildReminderTile('Do 7 dni', summary.dueSoonAmount, `${summary.dueSoonCount} ${plural(summary.dueSoonCount, 'pozycja', 'pozycje', 'pozycji')}`, 'is-watch')}
                    ${this.buildReminderTile('Pozostało ogółem', summary.left, `${summary.openCount} ${plural(summary.openCount, 'otwarta', 'otwarte', 'otwartych')}`, shareTone)}
                </div>
                ${rows}
                ${more}
            </div>
        `;
    }

    buildReminderTile(label, value, hint, tone) {
        return `
            <div class="payments-reminder__tile ${tone}">
                <span>${escapeHtml(label)}</span>
                <strong>${formatMoney(value)}</strong>
                <span>${escapeHtml(hint)}</span>
            </div>
        `;
    }

    buildReminderRow(view) {
        const dueTone = view.daysLeft === null || view.daysLeft > 7 ? '' : view.daysLeft < 0 ? 'is-negative' : 'is-watch';
        const subtitle = [getPaymentKindLabel(view.kind), view.contractor].filter(Boolean).join(' · ');
        const due = view.dueDate ? `Termin: ${formatPaymentDate(view.dueDate)}` : 'Bez terminu';
        return `
            <tr>
                <td>
                    <div class="payments-reminder__name">
                        <span class="cell-primary">${escapeHtml(view.title)}</span>
                        <span class="cell-secondary">${escapeHtml(subtitle)}</span>
                    </div>
                </td>
                <td class="payments-reminder__amount">${formatMoney(view.amountLeft)}</td>
                <td>
                    <div class="payments-reminder__due ${dueTone}">
                        <span class="cell-primary">${escapeHtml(this.buildReminderDue(view))}</span>
                        <span class="cell-secondary">${escapeHtml(due)}</span>
                    </div>
                </td>
            </tr>
        `;
    }

    buildReminderDue(view) {
        if (!view.dueDateObj) return 'Bez terminu';
        if (view.daysLeft === 0) return 'Dziś';
        if (view.daysLeft < 0) return `${Math.abs(view.daysLeft)} dni po terminie`;
        return `Za ${view.daysLeft} dni`;
    }

    buildDayContextHtml(day) {
        const context = this.getDayContext(day.dateObj, day.dayOfWeek);
        if (context.dayOff) {
            return `<div class="tt-context tt-context--holiday">${renderMaterialIcon('celebration')} ${escapeHtml(context.dayOff.name)} · dzień wolny</div>`;
        }
        if (context.events.length) {
            return `<div class="tt-context">${renderMaterialIcon('event')} ${escapeHtml(context.events[0].name)}</div>`;
        }
        if (context.isWeekend) {
            return `<div class="tt-context">${renderMaterialIcon('weekend')} Weekend</div>`;
        }
        return '';
    }

    buildWeekEventsTile(weekEvents) {
        const leadEvent = weekEvents[0];
        const countLabel = weekEvents.length
            ? `${weekEvents.length} ${this.formatEventCount(weekEvents.length)}`
            : 'Brak wydarzeń';

        return `
            <div class="${cardClass('summary', `summary-box summary-box--events ${weekEvents.length ? 'has-events' : 'is-calm'}`)}" data-week-events="true" data-callout-anchor="week-events">
                <span class="summary-kicker">${this.buildSymbolIcon(weekEvents.length ? 'celebration' : 'event_available', 'summary-icon-badge--event')} Kalendarz tygodnia</span>
                <p class="summary-box__event-title">${leadEvent ? escapeHtml(leadEvent.name) : 'Spokojny tydzień'}</p>
                <small>${leadEvent ? `${escapeHtml(leadEvent.dateStr)} · ${countLabel}` : 'Brak świąt i wydarzeń w tym tygodniu'}</small>
            </div>
        `;
    }

    bindWeekEvents(container, weekEvents) {
        const eventCard = container.querySelector('[data-week-events="true"]');
        if (!eventCard) return;
        eventCard.addEventListener('mouseenter', () => this.showEventsTooltip(weekEvents));
        eventCard.addEventListener('mousemove', event => this.moveTooltip(event));
        eventCard.addEventListener('mouseleave', () => this.hideTooltip());
    }

    renderLocationPerformance(container, data, options) {
        if (!data.length) {
            container.innerHTML = '';
            return;
        }

        const aggregated = this.aggregateLocations(data);
        container.innerHTML = aggregated.map((location, index) => `
            <div class="${cardClass('location', `location-card ${index === 0 ? 'location-card--lead' : ''}`)}">
                <div class="location-card-head">
                    <h3 class="location-card-title">${this.buildSymbolIcon('place')} ${escapeHtml(location.name)}</h3>
                    <span class="location-rank">#${index + 1}</span>
                </div>
                <div class="location-total">${formatMoney(location.total)}</div>
                <div class="location-stats">
                    <div><span>Średnio / dzień</span><strong>${formatMoney(location.avgDay)}</strong></div>
                    <div><span>Karty</span><strong>${formatMoney(location.card)}</strong></div>
                    <div class="location-stat--glovo"><span>Glovo</span><strong>${formatMoney(location.glovoNet)}</strong></div>
                    <div><span>Gotówka</span><strong>${formatMoney(location.cashDesk)}</strong></div>
                </div>
            </div>
        `).join('');
    }

    renderTable(tbody, data, options) {
        tbody.innerHTML = data.map(day => {
            const locationRows = Object.values(day.locations || {})
                .sort((left, right) => right.total - left.total)
                .map(location => `
                    <div class="point-pill point-pill--compact">
                        <span class="point-pill__name">${location.name}</span>
                        <strong>${formatMoney(location.total)}</strong>
                    </div>
                `)
                .join('');

            return `
                <tr>
                    <td class="revenue-day-cell">
                        <div class="cell-primary">${this.capitalize(day.dayOfWeek)}</div>
                        <div class="cell-secondary">${day.dateStr}</div>
                    </td>
                    <td><div class="point-pill-list point-pill-list--compact">${locationRows}</div></td>
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

        const shiftsHtml = this.buildShiftsHtml(data.rawReports);

        return `
            <div class="tt-inner">
                <div class="tt-header">
                    <span>${data.dateStr}</span>
                    <span class="tt-day">${data.dayOfWeek}</span>
                </div>

                ${this.buildDayContextHtml(data)}

                <div class="tt-main-stats">
                    <div class="tt-big-row">
                        <span class="tt-label">${totalLabel}</span>
                        <span class="tt-value-main">${formatMoney(totalValue)}</span>
                    </div>
                    ${options.viewMode === 'total' ? '' : `
                        <div class="tt-big-row">
                            <span class="tt-label">Utarg</span>
                            <span class="tt-value-sub">${formatMoney(data.total)}</span>
                        </div>
                    `}
                    <div class="tt-big-row">
                        <span class="tt-label">Karty</span>
                        <span class="tt-value-sub">${formatMoney(data.cardTotal)}</span>
                    </div>
                    <div class="tt-big-row">
                        <span class="tt-label">Glovo</span>
                        <span class="tt-value-sub">${formatMoney(this.getGlovoDisplayValue(data))}</span>
                    </div>
                    <div class="tt-big-row">
                        <span class="tt-label">Gotówka</span>
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

    buildShiftsHtml(reports) {
        const shifts = [];
        reports?.forEach(report => {
            if (!report.employees) return;
            Object.entries(report.employees).forEach(([name, time]) => shifts.push({ name, time, loc: report.location }));
        });

        if (!shifts.length) {
            return `<div class="tt-divider"></div><div style="font-size:11px; color:var(--text-muted); font-style:italic;">Brak danych o zmianach</div>`;
        }

        return `
            <div class="tt-divider"></div>
            <div class="tt-label" style="margin-bottom:6px;">Zmiany</div>
            <div class="tt-shifts-list">
                ${shifts.map(shift => `
                    <div class="tt-shift-item">
                        <span class="tt-shift-name"><span class="tt-shift-dot"></span>${shift.name} <span style="color:var(--text-muted); font-size:10px; margin-left:4px;">(${shift.loc.slice(0, 3)})</span></span>
                        <span class="tt-shift-time">${shift.time}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    buildLocationTooltipHtml(day, location, options) {
        const metricLabel = this.getViewLabel(options.viewMode);
        const metricValue = this.getMetricValue(location, options.viewMode);
        const reports = (day.rawReports || []).filter(report => report.location === location.name);

        return `
            <div class="tt-inner">
                <div class="tt-header">
                    <span>${day.dateStr}</span>
                    <span class="tt-day">${day.dayOfWeek}</span>
                </div>

                <div class="tt-loc-col">
                    <h5>${location.name}</h5>
                    <div class="tt-big-row">
                        <span class="tt-label">${metricLabel}</span>
                        <span class="tt-value-main">${formatMoney(metricValue)}</span>
                    </div>
                    ${options.viewMode === 'total' ? '' : `
                        <div class="tt-big-row">
                            <span class="tt-label">Utarg</span>
                            <span class="tt-value-sub">${formatMoney(location.total)}</span>
                        </div>
                    `}
                    <div class="tt-big-row">
                        <span class="tt-label">Karty</span>
                        <span class="tt-value-sub">${formatMoney(location.card)}</span>
                    </div>
                    <div class="tt-big-row">
                        <span class="tt-label">Glovo</span>
                        <span class="tt-value-sub">${formatMoney(this.getMetricValue(location, 'glovo'))}</span>
                    </div>
                    <div class="tt-big-row">
                        <span class="tt-label">Gotówka</span>
                        <span class="tt-value-sub">${formatMoney(location.cashDesk)}</span>
                    </div>
                </div>

                ${this.buildShiftsHtml(reports)}
            </div>
        `;
    }

    showTooltip(data, options) {
        const tooltip = document.getElementById('customTooltip');
        if (!tooltip) return;
        tooltip.style.display = 'block';
        tooltip.innerHTML = this.buildTooltipHtml(data, options);
    }

    showLocationTooltip(day, locationKey, options) {
        const location = day.locations?.[locationKey];
        if (!location) {
            this.hideTooltip();
            return;
        }

        const tooltip = document.getElementById('customTooltip');
        if (!tooltip) return;
        tooltip.style.display = 'block';
        tooltip.innerHTML = this.buildLocationTooltipHtml(day, location, options);
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

        const locationKey = chart.data.datasets[point.datasetIndex]?.locationKey;
        if (options.chartMode === 'split' && locationKey) {
            this.showLocationTooltip(entry, locationKey, options);
        } else {
            this.showTooltip(entry, options);
        }

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
        return `${location} • ${this.getViewLabel(options.viewMode)}`;
    }

    getViewLabel(viewMode) {
        if (viewMode === 'cards') return 'Karty';
        if (viewMode === 'glovo') return 'Glovo';
        if (viewMode === 'cash') return 'Gotówka';
        return 'Utarg';
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
            { date: easter, name: 'Wielkanoc', type: 'Dzień wolny od pracy' },
            { date: this.addDays(easter, 1), name: 'Poniedziałek Wielkanocny', type: 'Dzień wolny od pracy' },
            { date: new Date(year, 1, 14), name: 'Walentynki', type: 'Wydarzenie' },
            { date: fatThursday, name: 'Tłusty Czwartek', type: 'Wydarzenie' },
            { date: new Date(year, 2, 8), name: 'Dzień Kobiet', type: 'Wydarzenie' },
            { date: new Date(year, 4, 1), name: 'Święto Pracy', type: 'Dzień wolny od pracy' },
            { date: new Date(year, 4, 3), name: 'Święto Konstytucji 3 Maja', type: 'Dzień wolny od pracy' },
            { date: new Date(year, 4, 26), name: 'Dzień Matki', type: 'Wydarzenie' },
            { date: new Date(year, 5, 1), name: 'Dzień Dziecka', type: 'Wydarzenie' },
            { date: this.addDays(easter, 49), name: 'Zielone Świątki', type: 'Dzień wolny od pracy' },
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
        return `<div class="${cardClass('summary', 'summary-box summary-box--empty')}"><h3>${label}</h3><small>Zmień zakres lub resetuj filtry.</small></div>`;
    }

}

export const adminRender = new AdminRender();
