const CARD_VARIANTS = new Set([
    'section', 'chart', 'table', 'summary', 'insight',
    'location', 'product', 'employee-row', 'weather'
]);

export function cardClass(variant = 'section', additionalClass = '') {
    const safeVariant = CARD_VARIANTS.has(variant) ? variant : 'section';
    return ['card', `card--${safeVariant}`, additionalClass].filter(Boolean).join(' ');
}

export function renderCard({ variant = 'section', className = '', tag = 'section', attributes = '', content = '' } = {}) {
    return `<${tag} class="${cardClass(variant, className)}"${attributes ? ` ${attributes}` : ''}>${content}</${tag}>`;
}

export const Card = { cardClass, renderCard };
