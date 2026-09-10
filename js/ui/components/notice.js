/**
 * Wspólny renderer komunikatów.
 *
 * Jeden wygląd dla każdego komunikatu w aplikacji: ikona + kolor wg wariantu,
 * identyczny w widokach inline i w dialogach. Style żyją w
 * `css/components/notice.css` — ten moduł tylko buduje markup.
 */

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

/**
 * @param {{variant?: string, text?: string, title?: string, icon?: string, size?: 'sm'|'md'|'lg', showBar?: boolean}} options
 * @returns {string} HTML komunikatu
 */
export function noticeHtml({ variant = 'info', text = '', title = '', icon = '', size = 'md', showBar = false } = {}) {
    const safeVariant = normalizeVariant(variant);
    const sizeClass = size === 'sm' ? ' notice--sm' : size === 'lg' ? ' notice--lg' : '';
    const iconName = icon || NOTICE_ICONS[safeVariant];
    return `<span class="notice__icon material-symbols-rounded" aria-hidden="true">${iconName}</span>
        <div class="notice__body">${title ? `<span class="notice__title">${title}</span>` : ''}<span class="notice__text">${text}</span></div>
        ${showBar ? '<span class="notice__bar"><i></i></span>' : ''}`;
}

export const noticeService = {
    /** Zwraca kompletny element komunikatu, gotowy do wstawienia w DOM. */
    element(options = {}) {
        const variant = normalizeVariant(options.variant);
        const el = document.createElement('div');
        el.className = `notice notice--${variant}${options.className ? ' ' + options.className : ''}`;
        el.role = variant === 'danger' ? 'alert' : 'status';
        el.innerHTML = noticeHtml(options);
        return el;
    },

    /**
     * Zastępuje treść istniejącego kontenera komunikatem.
     * Pusta treść ukrywa kontener.
     */
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

    /** Wstawia komunikat przed elementem odniesienia (albo na końcu rodzica). */
    insertBefore(reference, options = {}) {
        const el = this.element(options);
        reference.parentNode.insertBefore(el, reference);
        return el;
    }
};
