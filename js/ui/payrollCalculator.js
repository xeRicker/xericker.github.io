import { calculateHours, formatMoney, parseLocalDateInput } from '../utils.js';
import { enhanceCustomControls, refreshCustomControls, setDateMarkers } from './components/customControls.js?v=5';

const DEFAULT_MONTH_HOURS = 160;

export function setupPayrollCalculator(config) {
    const {
        getReports,
        employeeSelectId,
        rateInputId,
        dateFromId,
        dateToId,
        resultBoxId,
        resHoursId,
        resMoneyId,
        detailsBoxId,
        defaultRate = 30.5
    } = config;

    const select = document.getElementById(employeeSelectId);
    const rateInput = document.getElementById(rateInputId);
    const dateFromInput = document.getElementById(dateFromId);
    const dateToInput = document.getElementById(dateToId);
    const resultBox = document.getElementById(resultBoxId);
    const detailsBox = document.getElementById(detailsBoxId);

    let initialized = false;

    const recalc = () => {
        const reports = getReports() || [];
        const name = select.value;
        syncCalendarMarkers(reports, name);

        if (!name) {
            hideResults(resultBox, detailsBox);
            return;
        }

        const rate = parseFloat(rateInput.value) || 0;
        const dateFrom = parseLocalDateInput(dateFromInput.value);
        const dateTo = parseLocalDateInput(dateToInput.value);

        if (!dateFrom || !dateTo) {
            hideResults(resultBox, detailsBox);
            return;
        }

        dateTo.setHours(23, 59, 59, 999);

        let totalHours = 0;
        const locationHours = {};
        const breakdown = [];

        reports.forEach(report => {
            const [day, month, year] = report.date.split('.');
            const reportDate = new Date(year, month - 1, day);
            const shift = report.employees?.[name];
            if (!shift || reportDate < dateFrom || reportDate > dateTo) return;

            const hours = calculateHours(shift);
            totalHours += hours;
            locationHours[report.location] = (locationHours[report.location] || 0) + hours;
            breakdown.push({
                date: report.date,
                dateObj: reportDate,
                location: report.location,
                shift,
                hours,
                amount: hours * rate
            });
        });

        breakdown.sort((left, right) => left.dateObj - right.dateObj);

        resultBox.style.display = 'flex';
        document.getElementById(resHoursId).innerText = `${totalHours.toFixed(1)} h`;
        document.getElementById(resMoneyId).innerText = formatMoney(totalHours * rate);

        detailsBox.style.display = 'block';
        detailsBox.innerHTML = buildDetailsHtml(breakdown, locationHours, totalHours, rate);
    };

    const populateEmployees = () => {
        const reports = getReports() || [];
        const employees = new Set();
        reports.forEach(report => {
            if (!report.employees) return;
            Object.keys(report.employees).forEach(name => employees.add(name));
        });

        const previousValue = select.value;
        select.innerHTML = [
            '<option value="" disabled selected>Wybierz Pracownika</option>',
            ...Array.from(employees)
                .sort((left, right) => left.localeCompare(right, 'pl'))
                .map(name => `<option value="${name}">${name}</option>`)
        ].join('');

        if (previousValue && employees.has(previousValue)) {
            select.value = previousValue;
        }
        const scope = select.closest('.calc-card, .worker-card, .section-card') || document;
        enhanceCustomControls(scope);
        refreshCustomControls(scope);
    };

    const setRate = value => {
        rateInput.value = Number(value).toFixed(2);
    };

    const setDateRange = (from, to) => {
        dateFromInput.value = from;
        dateToInput.value = to;
        refreshCustomControls(dateFromInput.closest('.calc-card, .worker-card, .section-card') || document);
        recalc();
    };

    const refresh = () => {
        populateEmployees();
        recalc();
    };

    if (!initialized) {
        ['change', 'input'].forEach(eventName => {
            select.addEventListener(eventName, recalc);
            rateInput.addEventListener(eventName, recalc);
            dateFromInput.addEventListener(eventName, recalc);
            dateToInput.addEventListener(eventName, recalc);
        });

        setRate(defaultRate);
        initialized = true;
    }

    return {
        refresh,
        recalc,
        setDateRange,
        setRate
    };

    function syncCalendarMarkers(reports, name) {
        const markers = name ? buildEmployeeDayMarkers(reports, name) : {};
        setDateMarkers(dateFromInput, markers);
        setDateMarkers(dateToInput, markers);
    }
}

function hideResults(resultBox, detailsBox) {
    resultBox.style.display = 'none';
    detailsBox.style.display = 'none';
}

function buildDetailsHtml(breakdown, locationHours, totalHours, rate) {
    const locationEntries = Object.entries(locationHours).sort((left, right) => right[1] - left[1]);
    const maxHours = locationEntries.length ? locationEntries[0][1] : 0;
    const shiftCount = breakdown.length;
    const employmentPercent = ((totalHours / DEFAULT_MONTH_HOURS) * 100).toFixed(1);
    const summaryHtml = locationEntries.map(([location, hours]) => `
        <div class="calc-breakdown-pill ${hours === maxHours && hours > 0 ? 'is-main' : ''}">
            <span>${location}</span>
            <strong>${hours.toFixed(1)} h</strong>
        </div>
    `).join('');

    const rowsHtml = breakdown.length ? breakdown.map(day => `
        <tr>
            <td>
                <div class="cell-primary">${formatCalcDate(day.date)}</div>
                <div class="cell-secondary">${day.date}</div>
            </td>
            <td>${day.location}</td>
            <td><span class="point-pill">${day.shift}</span></td>
            <td class="val-cell">${day.hours.toFixed(1)} h</td>
            <td class="val-cell">${formatMoney(day.amount)}</td>
        </tr>
    `).join('') : `
        <tr>
            <td colspan="5">
                <div class="cell-primary">Brak zmian w wybranym okresie</div>
                <div class="cell-secondary">Zmień zakres dat albo wybierz innego pracownika.</div>
            </td>
        </tr>
    `;

    return `
        <div class="calc-breakdown-summary">
            <div class="calc-breakdown-card">
                <span class="calc-breakdown-label">Liczba zmian</span>
                <strong>${shiftCount}</strong>
            </div>
            <div class="calc-breakdown-card">
                <span class="calc-breakdown-label">Średnio na zmianę</span>
                <strong>${shiftCount ? (totalHours / shiftCount).toFixed(1) : '0.0'} h</strong>
            </div>
            <div class="calc-breakdown-card">
                <span class="calc-breakdown-label">% etatu</span>
                <strong>${employmentPercent}%</strong>
            </div>
            <div class="calc-breakdown-card">
                <span class="calc-breakdown-label">Stawka</span>
                <strong>${rate.toFixed(2)} PLN</strong>
            </div>
        </div>

        <div class="calc-breakdown-pills">${summaryHtml}</div>

        <section class="calc-breakdown-report">
            <div class="table-head calc-breakdown-head">
                <div class="section-heading">
                    <h3>Raport Wypłaty</h3>
                    <p>${shiftCount} dni / ${totalHours.toFixed(1)} h / ${formatMoney(totalHours * rate)}</p>
                </div>
            </div>
            <div class="table-responsive">
                <table class="calc-breakdown-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Lokal</th>
                            <th>Zmiana</th>
                            <th>Godziny</th>
                            <th>Kwota</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        </section>
    `;
}

function formatCalcDate(date) {
    const [day, month] = date.split('.');
    return `${day}.${month}`;
}

function buildEmployeeDayMarkers(reports, name) {
    return reports.reduce((markers, report) => {
        const shift = report.employees?.[name];
        if (!shift) return markers;

        const iso = reportDateToIso(report.date);
        if (!iso) return markers;

        markers[iso] = (markers[iso] || 0) + calculateHours(shift);
        return markers;
    }, {});
}

function reportDateToIso(date) {
    const [day, month, year] = date.split('.');
    if (!day || !month || !year) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
