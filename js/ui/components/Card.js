const CARD_VARIANTS = new Set([
    'section', 'chart', 'table', 'summary', 'insight',
    'location', 'product', 'employee-row'
]);

export function cardClass(variant = 'section', additionalClass = '') {
    const safeVariant = CARD_VARIANTS.has(variant) ? variant : 'section';
    return ['card', `card--${safeVariant}`, additionalClass].filter(Boolean).join(' ');
}

