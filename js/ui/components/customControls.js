const enhancedControls = new WeakMap();
let controlsBootstrapped = false;
let activeFloatingControl = null;

const pad = value => String(value).padStart(2, '0');
const weekDays = ['Pn', 'Wt', 'Sr', 'Cz', 'Pt', 'So', 'Nd'];

export function enhanceCustomControls(root = document) {
    if (!controlsBootstrapped) {
        document.addEventListener('click', event => {
            const clickedPopover = activeFloatingControl?.popover && event.composedPath().includes(activeFloatingControl.popover);
            if (!clickedPopover && !event.target.closest('.custom-control, .preset-btn-wrapper, .custom-control__popover')) closeAllControls();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') closeAllControls();
        });
        window.addEventListener('resize', repositionOpenControl);
        controlsBootstrapped = true;
    }

    root.querySelectorAll('select').forEach(select => {
        if (select.classList.contains('hidden-preset-select')) {
            enhancePresetSelect(select);
        } else {
            enhanceSelect(select);
        }
    });
    root.querySelectorAll('input[type="date"]').forEach(enhanceDateInput);
    root.querySelectorAll('input[type="time"]').forEach(enhanceTimeInput);
    refreshCustomControls(root);
}

export function refreshCustomControls(root = document) {
    root.querySelectorAll('select, input[type="date"], input[type="time"]').forEach(element => {
        enhancedControls.get(element)?.update?.();
    });
}

export function setDateMarkers(input, markers = {}) {
    input._customDateMarkers = markers;
    enhancedControls.get(input)?.update?.();
}

function closeAllControls(except = null) {
    document.querySelectorAll('.custom-control.is-open, .preset-btn-wrapper.is-open').forEach(control => {
        if (control === except) return;
        control.classList.remove('is-open');
        const popover = control._floatingPopover || control.querySelector('.custom-control__popover');
        if (popover) resetPopoverPosition(popover);
    });
    if (!except) {
        activeFloatingControl = null;
    }
}

function toggleControl(wrapper, popover) {
    const willOpen = !wrapper.classList.contains('is-open');
    closeAllControls(wrapper);
    wrapper.classList.toggle('is-open', willOpen);
    if (willOpen && popover) {
        mountPopover(wrapper, popover);
        activeFloatingControl = { wrapper, popover };
        requestAnimationFrame(() => positionPopover(wrapper, popover));
    } else if (popover) {
        resetPopoverPosition(popover);
        activeFloatingControl = null;
    }
}

function mountPopover(wrapper, popover) {
    popover._returnParent = popover.parentElement;
    popover._returnNextSibling = popover.nextSibling;
    wrapper._floatingPopover = popover;
    document.body.appendChild(popover);
    popover.classList.add('is-open');
    if (!popover._floatingListenersBound) {
        popover.addEventListener('click', stopScrollPropagation);
        popover.addEventListener('pointerdown', stopScrollPropagation);
        popover.addEventListener('wheel', stopScrollPropagation, { passive: true });
        popover.addEventListener('touchmove', stopScrollPropagation, { passive: true });
        popover._floatingListenersBound = true;
    }
}

function positionPopover(wrapper, popover) {
    const button = wrapper.querySelector('.custom-control__button, .btn-preset');
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportGap = 10;
    const desiredWidth = getPopoverWidth(rect, popover, viewportGap);
    const left = Math.min(Math.max(rect.left, viewportGap), window.innerWidth - desiredWidth - viewportGap);
    const spaceBelow = window.innerHeight - rect.bottom - viewportGap;
    const spaceAbove = rect.top - viewportGap;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(180, Math.min(360, (openUp ? spaceAbove : spaceBelow) - 8));

    popover.classList.add('is-floating');
    popover.style.width = `${desiredWidth}px`;
    popover.style.left = `${left + window.scrollX}px`;
    popover.style.right = 'auto';
    popover.style.maxHeight = `${maxHeight}px`;

    if (openUp) {
        popover.style.top = `${rect.top + window.scrollY - popover.offsetHeight - 6}px`;
        popover.style.bottom = 'auto';
    } else {
        popover.style.top = `${rect.bottom + window.scrollY + 6}px`;
        popover.style.bottom = 'auto';
    }
}

function getPopoverWidth(rect, popover, viewportGap) {
    const maxAvailable = window.innerWidth - viewportGap * 2;
    if (popover.classList.contains('custom-time__popover')) {
        return Math.min(Math.max(rect.width, 300), maxAvailable);
    }
    if (popover.classList.contains('custom-calendar')) {
        return Math.min(Math.max(rect.width, 318), maxAvailable);
    }
    if (popover.classList.contains('custom-preset__popover')) {
        return Math.min(Math.max(rect.width, 190), maxAvailable);
    }
    return Math.min(Math.max(rect.width, Math.min(240, maxAvailable)), maxAvailable);
}

function repositionOpenControl() {
    if (!activeFloatingControl?.wrapper?.classList.contains('is-open')) return;
    positionPopover(activeFloatingControl.wrapper, activeFloatingControl.popover);
}

function stopScrollPropagation(event) {
    event.stopPropagation();
}

function resetPopoverPosition(popover) {
    const wrapper = popover._returnParent?.closest?.('.custom-control, .preset-btn-wrapper');
    popover.classList.remove('is-floating');
    popover.classList.remove('is-open');
    ['width', 'left', 'right', 'top', 'bottom', 'maxHeight'].forEach(prop => {
        popover.style[prop] = '';
    });

    if (popover._returnParent && popover.parentElement !== popover._returnParent) {
        popover._returnParent.insertBefore(popover, popover._returnNextSibling || null);
    }

    if (wrapper?._floatingPopover === popover) {
        wrapper._floatingPopover = null;
    }

    if (activeFloatingControl?.popover === popover) {
        activeFloatingControl = null;
    }
}

function enhanceSelect(select) {
    if (enhancedControls.has(select)) return;
    removeExistingCustomControl(select);

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-control custom-select';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'custom-control__button';
    button.setAttribute('aria-haspopup', 'listbox');
    const value = document.createElement('span');
    value.className = 'custom-control__value';
    const chevron = document.createElement('span');
    chevron.className = 'custom-control__chevron material-symbols-rounded';
    chevron.textContent = 'expand_more';
    const menu = document.createElement('div');
    menu.className = 'custom-control__popover';
    menu.setAttribute('role', 'listbox');

    button.append(value, chevron);
    wrapper.append(button, menu);
    select.classList.add('custom-native-control');
    select.insertAdjacentElement('afterend', wrapper);

    const render = () => {
        const selected = select.selectedOptions[0];
        value.textContent = selected?.textContent || 'Wybierz';
        menu.innerHTML = '';
        Array.from(select.options).filter(option => !option.disabled).forEach(option => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'custom-option';
            item.textContent = option.textContent;
            item.disabled = option.disabled;
            item.dataset.value = option.value;
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', option.selected ? 'true' : 'false');
            item.classList.toggle('is-selected', option.selected);
            item.addEventListener('click', () => {
                select.value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                render();
                closeAllControls();
            });
            menu.appendChild(item);
        });
    };

    button.addEventListener('click', () => {
        toggleControl(wrapper, menu);
    });
    select.addEventListener('change', render);
    new MutationObserver(render).observe(select, { childList: true, subtree: true, attributes: true });

    enhancedControls.set(select, { update: render });
    render();
}

function enhancePresetSelect(select) {
    if (enhancedControls.has(select)) return;

    const wrapper = select.closest('.preset-btn-wrapper');
    const button = wrapper?.querySelector('.btn-preset');
    if (!wrapper || !button) return;
    wrapper.querySelector('.custom-control__popover')?.remove();

    const menu = document.createElement('div');
    menu.className = 'custom-control__popover custom-preset__popover';
    wrapper.appendChild(menu);
    select.classList.add('custom-native-control');

    const render = () => {
        menu.innerHTML = '';
        Array.from(select.options)
            .filter(option => option.value)
            .forEach(option => {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'custom-option';
                item.textContent = option.textContent;
                item.addEventListener('click', () => {
                    select.value = option.value;
                    applyPresetValue(select, option.value);
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    select.value = '';
                    applyPresetValue(select, option.value);
                    closeAllControls();
                });
                menu.appendChild(item);
            });
    };

    button.addEventListener('click', event => {
        event.preventDefault();
        toggleControl(wrapper, menu);
    });
    new MutationObserver(render).observe(select, { childList: true, subtree: true });

    enhancedControls.set(select, { update: render });
    render();
}

function applyPresetValue(select, value) {
    const id = select.dataset.id;
    const row = select.closest('.employee-row');
    if (!id || !value) return;

    const [start, end] = value.split('-');
    const startInput = document.getElementById(`${id}_od`);
    const endInput = document.getElementById(`${id}_do`);
    if (!startInput || !endInput) return;

    startInput.value = start || '';
    endInput.value = end || '';
    row?.classList.add('active');
    startInput.dispatchEvent(new Event('input', { bubbles: true }));
    endInput.dispatchEvent(new Event('input', { bubbles: true }));
    refreshCustomControls(row || document);
}

function enhanceDateInput(input) {
    if (enhancedControls.has(input)) return;
    removeExistingCustomControl(input);

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-control custom-date';
    const button = buildControlButton('calendar_month');
    const value = button.querySelector('.custom-control__value');
    const popover = document.createElement('div');
    popover.className = 'custom-control__popover custom-calendar';
    wrapper.append(button, popover);
    input.classList.add('custom-native-control');
    input.insertAdjacentElement('afterend', wrapper);

    let viewDate = input.value ? parseIsoDate(input.value) : new Date();

    const render = () => {
        value.textContent = formatDateLabel(input.value);
        renderCalendar(popover, viewDate, input.value, input._customDateMarkers || {}, selectedValue => {
            input.value = selectedValue;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            viewDate = parseIsoDate(selectedValue);
            render();
            closeAllControls();
        }, nextDate => {
            viewDate = nextDate;
            render();
            repositionOpenControl();
        });
    };

    button.addEventListener('click', () => {
        if (input.value) viewDate = parseIsoDate(input.value);
        toggleControl(wrapper, popover);
        render();
    });
    input.addEventListener('change', render);

    enhancedControls.set(input, { update: render });
    render();
}

function enhanceTimeInput(input) {
    if (enhancedControls.has(input)) return;
    removeExistingCustomControl(input);

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-control custom-time';
    const button = buildControlButton('schedule');
    const value = button.querySelector('.custom-control__value');
    const popover = document.createElement('div');
    popover.className = 'custom-control__popover custom-time__popover';
    wrapper.append(button, popover);
    input.classList.add('custom-native-control');
    input.insertAdjacentElement('afterend', wrapper);

    const render = () => {
        value.textContent = input.value || '--:--';
        popover.innerHTML = '<div class="custom-time__grid"></div>';
        const grid = popover.querySelector('.custom-time__grid');
        buildTimeOptions().forEach(time => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'custom-time__option';
            item.textContent = time;
            item.classList.toggle('is-selected', input.value === time);
            item.addEventListener('click', () => {
                input.value = time;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                render();
                closeAllControls();
            });
            grid.appendChild(item);
        });
    };

    button.addEventListener('click', () => {
        toggleControl(wrapper, popover);
        render();
    });
    input.addEventListener('input', render);
    input.addEventListener('change', render);

    enhancedControls.set(input, { update: render });
    render();
}

function buildControlButton(icon) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'custom-control__button';
    const value = document.createElement('span');
    value.className = 'custom-control__value';
    const symbol = document.createElement('span');
    symbol.className = 'custom-control__chevron material-symbols-rounded';
    symbol.textContent = icon;
    button.append(value, symbol);
    return button;
}

function removeExistingCustomControl(element) {
    const next = element.nextElementSibling;
    if (next?.classList?.contains('custom-control')) {
        next.remove();
    }
}

function renderCalendar(container, viewDate, selectedValue, markers, onSelect, onNavigate) {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthStart = new Date(year, month, 1);
    const startOffset = (monthStart.getDay() || 7) - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const label = monthStart.toLocaleString('pl-PL', { month: 'long', year: 'numeric' });

    container.innerHTML = `
        <div class="custom-calendar__header">
            <button class="custom-calendar__nav" type="button" data-dir="-1">‹</button>
            <span class="custom-calendar__month">${label.charAt(0).toUpperCase() + label.slice(1)}</span>
            <button class="custom-calendar__nav" type="button" data-dir="1">›</button>
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
        if (markers[iso]) {
            item.classList.add('has-marker');
            item.insertAdjacentHTML('beforeend', `<span class="custom-calendar__marker">${formatHoursMarker(markers[iso])}</span>`);
        }
        item.addEventListener('click', () => onSelect(iso));
        grid.appendChild(item);
    }
}

function buildTimeOptions() {
    const values = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            values.push(`${pad(hour)}:${pad(minute)}`);
        }
    }
    return values;
}

function parseIsoDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function formatDateLabel(value) {
    if (!value) return 'Wybierz datę';
    return parseIsoDate(value).toLocaleDateString('pl-PL');
}

function formatHoursMarker(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export const dialogService = {
    alert(message, title = 'Komunikat') {
        return openDialog({ title, message, actions: [{ label: 'OK', value: true, primary: true }] });
    },
    confirm(message, title = 'Potwierdź') {
        return openDialog({
            title,
            message,
            actions: [
                { label: 'Anuluj', value: false },
                { label: 'OK', value: true, primary: true }
            ]
        });
    },
    prompt(message, title = 'Wpisz wartość', options = {}) {
        return openDialog({
            title,
            message,
            input: { type: options.type || 'text', value: options.value || '' },
            actions: [
                { label: 'Anuluj', value: null },
                { label: 'OK', value: 'input', primary: true }
            ]
        });
    }
};

function openDialog(config) {
    const layer = ensureDialogLayer();
    const dialog = layer.querySelector('.custom-dialog');
    dialog.innerHTML = `
        <h3>${config.title}</h3>
        <p>${config.message}</p>
        ${config.input ? `<input class="custom-dialog__input" type="${config.input.type}" value="${config.input.value}">` : ''}
        <div class="custom-dialog__actions"></div>
    `;

    const actions = dialog.querySelector('.custom-dialog__actions');
    layer.classList.add('is-visible');

    return new Promise(resolve => {
        const finish = value => {
            layer.classList.remove('is-visible');
            resolve(value);
        };

        config.actions.forEach(action => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `custom-dialog__button ${action.primary ? 'custom-dialog__button--primary' : ''}`;
            button.textContent = action.label;
            button.addEventListener('click', () => {
                if (action.value === 'input') {
                    finish(dialog.querySelector('.custom-dialog__input')?.value ?? '');
                    return;
                }
                finish(action.value);
            });
            actions.appendChild(button);
        });

        const input = dialog.querySelector('.custom-dialog__input');
        if (input) {
            input.focus();
            input.addEventListener('keydown', event => {
                if (event.key === 'Enter') finish(input.value);
            });
        } else {
            actions.querySelector('.custom-dialog__button--primary')?.focus();
        }
    });
}

function ensureDialogLayer() {
    let layer = document.getElementById('customDialogLayer');
    if (layer) return layer;

    layer = document.createElement('div');
    layer.id = 'customDialogLayer';
    layer.className = 'custom-dialog-layer';
    layer.innerHTML = '<div class="custom-dialog" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(layer);
    return layer;
}
