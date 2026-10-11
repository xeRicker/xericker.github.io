import { renderMaterialIcon } from '../../utils.js';

const enhancedInputs = new WeakSet();

export function enhanceCustomInputs(root = document) {
    root.querySelectorAll('input:not([type]), input[type="text"], input[type="number"], input[inputmode]').forEach(input => {
        if (enhancedInputs.has(input)) return;
        if (input.classList.contains('custom-native-control')) return;
        if (input.closest('.counter-wrapper, .custom-dialog__field-row')) return;
        if (input.dataset.noClear !== undefined) return;
        enhancedInputs.add(input);
        applyInputHints(input);
        wrapWithClearButton(input);
    });
}

export function labelText(label) {
    if (!label) return '';
    const clone = label.cloneNode(true);
    clone.querySelectorAll('[aria-hidden="true"], .material-symbols-rounded').forEach(node => node.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim();
}

function applyInputHints(input) {
    const isNumeric = input.type === 'number'
        || input.inputMode === 'decimal'
        || input.inputMode === 'numeric';

    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('enterkeyhint', 'done');
    if (!isNumeric) return;

    input.setAttribute('autocapitalize', 'none');
    input.addEventListener('focus', () => input.select());
}

function wrapWithClearButton(input) {
    if (input.parentElement?.classList.contains('field-clearable')) return;

    const wrapper = document.createElement('span');
    wrapper.className = 'field-clearable';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'field-clearable__clear';
    button.setAttribute('aria-label', buildClearLabel(input));
    button.innerHTML = renderMaterialIcon('cancel');
    button.hidden = !input.value;

    const syncClearVisibility = () => {
        button.hidden = input.value === '';
    };

    button.addEventListener('click', event => {
        event.preventDefault();
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        syncClearVisibility();
        input.focus({ preventScroll: true });
    });
    wrapper.appendChild(button);

    input.addEventListener('input', syncClearVisibility);
    input.addEventListener('change', syncClearVisibility);
}

function buildClearLabel(input) {
    const id = input.id;
    const label = id ? document.querySelector(`label[for="${id}"]`) : null;
    const name = input.getAttribute('aria-label')
        || labelText(label)
        || labelText(input.closest('label'))
        || input.getAttribute('placeholder')
        || 'pole';
    return `Wyczyść: ${name}`;
}
