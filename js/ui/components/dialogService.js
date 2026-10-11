import { normalizeVariant, noticeHtml } from './notice.js?v=103';
import { escapeHtml } from '../../utils.js';
import { enhanceCustomInputs } from './inputEnhance.js?v=1';

const NOTICE_VARIANTS = ['info', 'success', 'danger', 'warning', 'muted', 'loading'];

export const dialogService = {

    alert(message, title = 'Komunikat', options = {}) {
        return openDialog({
            title,
            message,
            notice: options.detail ? { variant: options.variant || 'info', text: options.detail } : null,
            actions: [{ label: 'OK', value: true, primary: true }]
        });
    },
    success(message, title = 'Gotowe', options = {}) {
        return this.alert(message, title, { ...options, variant: 'success' });
    },
    error(message, title = 'Błąd', options = {}) {
        return this.alert(message, title, { ...options, variant: 'danger' });
    },
    warning(message, title = 'Uwaga', options = {}) {
        return this.alert(message, title, { ...options, variant: 'warning' });
    },
    confirm(message, title = 'Potwierdź', options = {}) {
        const destructive = Boolean(options.destructive);
        return openDialog({
            title,
            message,
            destructive,
            actions: [
                { label: options.cancelLabel || 'Anuluj', value: false },
                { label: options.confirmLabel || 'OK', value: true, primary: true, danger: destructive }
            ]
        });
    },
    prompt(message, title = 'Wpisz wartość', options = {}) {
        return openDialog({
            title,
            message,
            notice: options.notice,
            size: options.size,
            input: {
                type: options.type || 'text',
                value: options.value || '',
                inputmode: options.inputmode,
                autocomplete: options.autocomplete || 'off',
                autoSubmit: options.autoSubmit,
                autoSubmitDelay: options.autoSubmitDelay,
                label: options.label,
                action: options.action
            },
            actions: [
                { label: 'Anuluj', value: null },
                { label: 'OK', value: 'input', primary: true }
            ]
        });
    }
};

function buildDialogNotice(notice) {
    const variant = normalizeVariant(notice.variant);
    return `<div class="notice notice--${variant} notice--dialog" role="alert">${noticeHtml({ variant, text: notice.text })}</div>`;
}

function buildDialogField(input) {
    const attributes = [
        'class="custom-dialog__input"',
        'id="customDialogInput"',
        `type="${input.type}"`,
        `value="${escapeHtml(input.value)}"`,
        input.inputmode ? `inputmode="${input.inputmode}"` : '',
        input.inputmode === 'numeric' ? ' pattern="[0-9]*"' : '',
        input.autocomplete ? ` autocomplete="${input.autocomplete}"` : ''
    ].filter(Boolean).join(' ');
    const label = input.label ? `<label for="customDialogInput">${input.label}</label>` : '';

    if (!input.action) {
        return `<div class="custom-dialog__field">${label}<input ${attributes}></div>`;
    }

    return `
        <div class="custom-dialog__field">
            ${label}
            <div class="custom-dialog__field-row">
                <input ${attributes}>
                <button type="button" class="custom-dialog__field-action" aria-label="${input.action.label}">
                    <span class="material-symbols-rounded" aria-hidden="true">${input.action.icon}</span>
                </button>
            </div>
        </div>
    `;
}

function openDialog(config) {
    const layer = ensureDialogLayer();
    const dialog = layer.querySelector('.custom-dialog');
    const notice = config.notice?.text ? config.notice : null;
    const input = config.input;
    const variant = notice ? normalizeVariant(notice.variant) : null;
    const isDestructive = Boolean(config.destructive);
    const previousFocus = document.activeElement;
    const previousOverflow = {
        html: document.documentElement.style.overflow,
        body: document.body.style.overflow
    };
    dialog.classList.toggle('custom-dialog--wide', Boolean(input?.action));
    dialog.classList.toggle('custom-dialog--prominent', config.size === 'prominent');
    dialog.classList.toggle('custom-dialog--destructive', isDestructive);
    if (variant) dialog.classList.add(`custom-dialog--${variant}`);
    else dialog.classList.remove(...NOTICE_VARIANTS.map(name => `custom-dialog--${name}`));
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'customDialogTitle');
    dialog.innerHTML = `
        <h3 id="customDialogTitle">${config.title}</h3>
        <p>${config.message}</p>
        ${input ? buildDialogField(input) : ''}
        ${notice ? buildDialogNotice(notice) : ''}
        <div class="custom-dialog__actions"></div>
    `;

    const actions = dialog.querySelector('.custom-dialog__actions');
    const field = dialog.querySelector('.custom-dialog__input');
    if (notice) field?.setAttribute('aria-invalid', 'true');
    enhanceCustomInputs(dialog);
    setDialogScrollLocked(true, previousOverflow);
    layer.classList.add('is-visible');

    return new Promise(resolve => {
        let settled = false;
        let autoSubmitTimer = null;
        const cancelAction = config.actions.find(action => !action.primary);
        const cancelValue = cancelAction ? cancelAction.value : true;

        const onKeydown = event => {
            if (event.key === 'Escape') {
                if (document.querySelector('.custom-control.is-open, .preset-btn-wrapper.is-open')) return;
                event.preventDefault();
                event.stopPropagation();
                finish(cancelValue);
                return;
            }
            if (event.key !== 'Tab') return;
            const focusable = Array.from(dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'))
                .filter(node => node.offsetParent !== null);
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!dialog.contains(document.activeElement)) {
                event.preventDefault();
                first.focus();
                return;
            }
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        const onBackdropClick = event => {
            if (event.target === layer && !input) finish(cancelValue);
        };

        const finish = value => {
            if (settled) return;
            settled = true;
            clearTimeout(autoSubmitTimer);
            layer.classList.remove('is-visible');
            document.removeEventListener('keydown', onKeydown, true);
            layer.removeEventListener('click', onBackdropClick);
            setDialogScrollLocked(false, previousOverflow);
            if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
            resolve(value);
        };

        document.addEventListener('keydown', onKeydown, true);
        layer.addEventListener('click', onBackdropClick);

        config.actions.forEach(action => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = [
                'custom-dialog__button',
                action.primary ? 'custom-dialog__button--primary' : '',
                action.danger ? 'custom-dialog__button--danger' : ''
            ].filter(Boolean).join(' ');
            button.textContent = action.label;
            button.addEventListener('click', () => {
                if (action.value === 'input') {
                    finish(field?.value ?? '');
                    return;
                }
                finish(action.value);
            });
            actions.appendChild(button);
        });

        const fieldAction = dialog.querySelector('.custom-dialog__field-action');
        if (fieldAction && field) {
            fieldAction.addEventListener('click', () => {
                const revealed = field.type === 'text';
                field.type = revealed ? 'password' : 'text';
                fieldAction.setAttribute('aria-label', revealed ? input.action.label : input.action.labelActive);
                fieldAction.querySelector('.material-symbols-rounded').textContent =
                    revealed ? input.action.icon : input.action.iconActive;
                fieldAction.classList.toggle('is-revealed', !revealed);
                field.focus({ preventScroll: true });
            });
        }

        const clearDialogNotice = () => {
            dialog.querySelector('.notice--dialog')?.remove();
            if (variant) dialog.classList.remove(`custom-dialog--${variant}`);
        };

        if (field) {
            field.focus({ preventScroll: true });
            requestAnimationFrame(() => {
                field.focus({ preventScroll: true });
                field.select?.();
            });
            field.addEventListener('input', () => {
                if (field.value !== '') field.removeAttribute('aria-invalid');
                clearDialogNotice();
                if (typeof input.autoSubmit !== 'function') return;
                clearTimeout(autoSubmitTimer);
                const checkedValue = field.value;
                if (!checkedValue) return;
                autoSubmitTimer = setTimeout(async () => {
                    let accepted = false;
                    try {
                        accepted = await input.autoSubmit(checkedValue);
                    } catch (error) {
                        console.error('Nie udało się sprawdzić wpisanej wartości.', error);
                    }
                    if (accepted && field.value === checkedValue) finish(field.value);
                }, Number(input.autoSubmitDelay) || 0);
            });
            field.addEventListener('keydown', event => {
                if (event.key === 'Enter') finish(field.value);
            });
        } else {
            const preferred = isDestructive
                ? actions.querySelector('.custom-dialog__button:not(.custom-dialog__button--primary)')
                : actions.querySelector('.custom-dialog__button--primary');
            (preferred || actions.querySelector('.custom-dialog__button'))?.focus();
        }
    });
}

function setDialogScrollLocked(locked, previous) {
    document.documentElement.style.overflow = locked ? 'hidden' : previous.html;
    document.body.style.overflow = locked ? 'hidden' : previous.body;
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
