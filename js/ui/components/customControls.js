import { escapeHtml, renderMaterialIcon } from '../../utils.js';
import { buildTimeOptions, formatDateLabel, parseIsoDate, renderCalendar } from './customCalendar.js?v=1';
import { closeAllControls, getActiveFloatingControl, repositionOpenControl, toggleControl } from './controlPopover.js?v=1';
import { enhanceCustomInputs, labelText } from './inputEnhance.js?v=1';

const enhancedControls = new WeakMap();
let controlsBootstrapped = false;

export function enhanceCustomControls(root = document) {
    if (!controlsBootstrapped) {
        document.addEventListener('click', event => {
            const activePopover = getActiveFloatingControl()?.popover;
            const clickedPopover = activePopover && event.composedPath().includes(activePopover);
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
    enhanceCustomInputs(root);
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

function applyLabelAsAccessibleName(control, button) {
    const id = control.id;
    const label = id ? document.querySelector(`label[for="${id}"]`) : null;
    const text = (control.getAttribute('aria-label') || labelText(label) || '').trim();
    if (text) button.setAttribute('aria-label', text);
}

function markNativeControlHidden(element) {
    element.classList.add('custom-native-control');
    element.setAttribute('tabindex', '-1');
    element.setAttribute('aria-hidden', 'true');
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
    button.setAttribute('aria-expanded', 'false');
    applyLabelAsAccessibleName(select, button);
    const value = document.createElement('span');
    value.className = 'custom-control__value';
    const chevron = document.createElement('span');
    chevron.className = 'custom-control__chevron material-symbols-rounded';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = 'expand_more';
    const menu = document.createElement('div');
    menu.className = 'custom-control__popover';
    menu.setAttribute('role', 'listbox');

    button.append(value, chevron);
    wrapper.append(button, menu);
    markNativeControlHidden(select);
    select.insertAdjacentElement('afterend', wrapper);

    const render = () => {
        const selected = select.selectedOptions[0];
        value.textContent = selected?.textContent || 'Wybierz';
        button.disabled = select.disabled;
        wrapper.classList.toggle('is-disabled', select.disabled);
        menu.innerHTML = '';
        Array.from(select.options).filter(option => !option.disabled).forEach(option => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'custom-option';
            if (option.dataset.icon) {
                item.classList.add('custom-option--icon');
                item.innerHTML = `${renderMaterialIcon(option.dataset.icon)}<span>${escapeHtml(option.textContent)}</span>`;
            } else {
                item.textContent = option.textContent;
            }
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
        if (select.disabled) return;
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
    button.setAttribute('aria-expanded', 'false');
    markNativeControlHidden(select);

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
    applyLabelAsAccessibleName(input, button);
    const value = button.querySelector('.custom-control__value');
    const popover = document.createElement('div');
    popover.className = 'custom-control__popover custom-calendar';
    wrapper.append(button, popover);
    markNativeControlHidden(input);
    input.insertAdjacentElement('afterend', wrapper);

    let viewDate = input.value ? parseIsoDate(input.value) : new Date();

    const render = () => {
        value.textContent = formatDateLabel(input.value);
        button.disabled = input.disabled;
        wrapper.classList.toggle('is-disabled', input.disabled);
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
        if (input.disabled) return;
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
    applyLabelAsAccessibleName(input, button);
    const value = button.querySelector('.custom-control__value');
    const popover = document.createElement('div');
    popover.className = 'custom-control__popover custom-time__popover';
    wrapper.append(button, popover);
    markNativeControlHidden(input);
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
    symbol.setAttribute('aria-hidden', 'true');
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

export { dialogService } from './dialogService.js?v=1';
