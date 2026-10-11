const pad = value => String(value).padStart(2, '0');
const weekDays = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
export function renderCalendar(container, viewDate, selectedValue, markers, onSelect, onNavigate) {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthStart = new Date(year, month, 1);
    const startOffset = (monthStart.getDay() || 7) - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const label = monthStart.toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    container.innerHTML = `
        <div class="custom-calendar__header">
            <button class="custom-calendar__nav" type="button" data-dir="-1" aria-label="Poprzedni miesiąc">‹</button>
            <span class="custom-calendar__month">${label.charAt(0).toUpperCase() + label.slice(1)}</span>
            <button class="custom-calendar__nav" type="button" data-dir="1" aria-label="Następny miesiąc">›</button>
        </div>
        <div class="custom-calendar__grid"></div>
    `;

    container.querySelectorAll('.custom-calendar__nav').forEach(button => {
        button.addEventListener('click', () => onNavigate(new Date(year, month + Number(button.dataset.dir), 1)));
    });

    const grid = container.querySelector('.custom-calendar__grid');
    weekDays.forEach(day => {
        const el = document.createElement('div');
        el.className = 'custom-calendar__weekday';
        el.textContent = day;
        grid.appendChild(el);
    });
    for (let i = 0; i < startOffset; i++) {
        const empty = document.createElement('button');
        empty.type = 'button';
        empty.className = 'custom-calendar__day';
        empty.disabled = true;
        grid.appendChild(empty);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const iso = `${year}-${pad(month + 1)}-${pad(day)}`;
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'custom-calendar__day';
        item.innerHTML = `<span class="custom-calendar__day-number">${day}</span>`;
        item.classList.toggle('is-selected', selectedValue === iso);
        item.classList.toggle('is-today', iso === todayIso);
        if (markers[iso]) {
            item.classList.add('has-marker');
            item.insertAdjacentHTML('beforeend', `<span class="custom-calendar__marker">${formatHoursMarker(markers[iso])}</span>`);
        }
        item.addEventListener('click', () => onSelect(iso));
        grid.appendChild(item);
    }
}

export function buildTimeOptions() {
    const values = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            values.push(`${pad(hour)}:${pad(minute)}`);
        }
    }
    return values;
}

export function parseIsoDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
}

export function formatDateLabel(value) {
    if (!value) return 'Wybierz datę';
    return parseIsoDate(value).toLocaleDateString('pl-PL');
}

function formatHoursMarker(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
