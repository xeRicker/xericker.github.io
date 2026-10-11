const NOTICE_ICONS = {
    info: 'info',
    success: 'check_circle',
    danger: 'error',
    warning: 'warning',
    muted: 'info',
    loading: 'progress_activity'
};

const NOTICE_VARIANTS = Object.keys(NOTICE_ICONS);

export function normalizeVariant(variant) {
    return NOTICE_VARIANTS.includes(variant) ? variant : 'info';
}

export function noticeHtml({ variant = 'info', text = '', title = '', icon = '', size = 'md', showBar = false } = {}) {
    const safeVariant = normalizeVariant(variant);
    const sizeClass = size === 'sm' ? ' notice--sm' : size === 'lg' ? ' notice--lg' : '';
    const iconName = icon || NOTICE_ICONS[safeVariant];
    return `<span class="notice__icon material-symbols-rounded" aria-hidden="true">${iconName}</span>
        <div class="notice__body">${title ? `<span class="notice__title">${title}</span>` : ''}<span class="notice__text">${text}</span></div>
        ${showBar ? '<span class="notice__bar"><i></i></span>' : ''}`;
}

let toastLayer = null;
let toastTimer = null;

function ensureToastLayer() {
    if (toastLayer?.isConnected) return toastLayer;
    toastLayer = document.createElement('div');
    toastLayer.className = 'notice-toast-layer';
    document.body.appendChild(toastLayer);
    return toastLayer;
}

function dismissToast(element) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        element.remove();
        return;
    }
    element.classList.add('is-leaving');
    element.addEventListener('animationend', () => element.remove(), { once: true });
    setTimeout(() => element.remove(), 400);
}

function toastDuration(text) {
    const length = String(text || '').length;
    return Math.min(2400 + Math.max(0, length - 40) * 45, 8000);
}

export const noticeService = {

    element(options = {}) {
        const variant = normalizeVariant(options.variant);
        const el = document.createElement('div');
        el.className = `notice notice--${variant}${options.className ? ' ' + options.className : ''}`;
        el.role = variant === 'danger' ? 'alert' : 'status';
        el.innerHTML = noticeHtml(options);
        return el;
    },

    toast(options = {}) {
        const layer = ensureToastLayer();
        clearTimeout(toastTimer);
        const el = this.element({ ...options, className: ['notice--toast', options.className].filter(Boolean).join(' ') });
        el.setAttribute('aria-live', 'polite');
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'notice__close';
        close.setAttribute('aria-label', 'Zamknij komunikat');
        close.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">close</span>';
        close.addEventListener('click', () => dismissToast(el));
        el.appendChild(close);
        layer.replaceChildren(el);
        toastTimer = setTimeout(() => dismissToast(el), Number(options.duration) || toastDuration(options.text));
        return el;
    },

    render(container, options = {}) {
        if (!container) return;
        if (!options.text) {
            container.innerHTML = '';
            container.hidden = true;
            return;
        }
        const variant = normalizeVariant(options.variant);
        container.className = ['notice', `notice--${variant}`, options.className].filter(Boolean).join(' ');
        container.role = variant === 'danger' ? 'alert' : 'status';
        container.innerHTML = noticeHtml(options);
        container.hidden = false;
    },

    insertBefore(reference, options = {}) {
        const el = this.element(options);
        reference.parentNode.insertBefore(el, reference);
        return el;
    }
};
