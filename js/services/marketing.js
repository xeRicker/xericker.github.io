import {
    MARKETING_BRAND,
    BURGER_MARKETING,
    MARKETING_HOOKS,
    MARKETING_BODIES,
    MARKETING_INSTAGRAM,
    MARKETING_PROMPTS,
    MARKETING_TYPE_HASHTAGS,
    MARKETING_BASE_HASHTAGS
} from '../config/marketing.js?v=2';

const EXCLUDED_INGREDIENTS = new Set(['bun', 'sauce']);

const HOOK_EMOJI = { burger: '🍔', locations: '📍', glovo: '🛵', promo: '🔥', behind: '🔥' };

export async function loadMarketingBurgers() {
    const response = await fetch('database/burgers.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Nie udało się wczytać database/burgers.json.');
    const config = await response.json();
    return Object.entries(config.presets).map(([id, preset]) => ({
        id,
        label: preset.label,
        description: BURGER_MARKETING[id]?.description || describePreset(preset, config.products)
    }));
}

function describePreset(preset, products) {
    const names = [...new Set((preset?.ingredients || [])
        .filter(entry => !EXCLUDED_INGREDIENTS.has(entry.id))
        .map(entry => ingredientLabel(entry.id, products))
        .filter(Boolean))];
    if (!names.length) return '';
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} i ${names[names.length - 1]}` : names[0];
    return `W środku: ${list}.`;
}

function ingredientLabel(id, products) {
    if (id === 'beef') return 'wołowina';
    const label = products?.[id]?.label;
    return label ? label.toLocaleLowerCase('pl') : '';
}

export function buildMarketingPost({ type, burgerId = '', burger = '', promo = '', description = '', options = {}, brand = MARKETING_BRAND }) {
    const copy = BURGER_MARKETING[burgerId] || null;
    const hookPool = type === 'burger' && copy?.hooks?.length ? copy.hooks : MARKETING_HOOKS[type];
    const hookText = fillTemplate(pickRandom(hookPool), {
        label: burger || 'nasze burgery',
        promo: promo || 'wyjątkowa oferta',
        locations: brand.locations.map(location => location.name).join(' i ')
    });
    const hook = withEmoji(HOOK_EMOJI[type], hookText, options.includeEmoji);
    const action = pickRandom(MARKETING_BODIES[type]);
    const facebookBody = type === 'burger' && description ? `${description}\n\n${action}` : action;
    const instagramBody = type === 'burger' && copy?.short ? copy.short : pickRandom(MARKETING_INSTAGRAM[type]);
    const prompt = options.includeCommentPrompt ? pickRandom(MARKETING_PROMPTS) : '';
    const footer = buildFooter(brand, options);

    return {
        facebook: joinSections([hook, facebookBody, prompt, footer, buildHashtags(brand, options, type, burger, 6)]),
        instagram: joinSections([hook, instagramBody, prompt, footer, buildHashtags(brand, options, type, burger, 15)])
    };
}

function buildFooter(brand, options) {
    const lines = [];
    if (options.includeLocations) {
        brand.locations.forEach(location => {
            const details = [];
            if (options.includeHours) details.push(location.hours);
            if (options.includePhones) details.push(`tel. ${location.phone}`);
            lines.push(withEmoji('📍', `${location.name}${details.length ? ' · ' + details.join(' · ') : ''}`, options.includeEmoji));
        });
    } else if (options.includeHours) {
        lines.push(withEmoji('🕒', brand.locations.map(location => `${location.name} ${location.hours}`).join(' · '), options.includeEmoji));
    }
    if (options.includeGlovo) {
        const glovoLocations = brand.locations.filter(location => location.glovo).map(location => location.name);
        if (glovoLocations.length) {
            lines.push(withEmoji('🛵', `Zamów przez Glovo — dostawa: ${glovoLocations.join(' i ')}.`, options.includeEmoji));
        }
    }
    return lines.join('\n');
}

function buildHashtags(brand, options, type, burger, limit) {
    if (!options.includeHashtags) return '';
    const tags = [
        brand.name,
        'Burgery',
        ...(burger ? [burger] : []),
        ...(MARKETING_TYPE_HASHTAGS[type] || []),
        ...brand.locations.flatMap(location => [location.name, fold(location.name)]),
        ...MARKETING_BASE_HASHTAGS
    ];
    return [...new Set(tags.map(tag => tag.replace(/\s+/g, '')))]
        .slice(0, limit)
        .map(tag => `#${tag}`)
        .join(' ');
}

function fold(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function fillTemplate(template, values) {
    return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template || '');
}

function withEmoji(emoji, text, includeEmoji) {
    return includeEmoji && emoji ? `${emoji} ${text}` : text;
}

function pickRandom(list) {
    if (!Array.isArray(list) || !list.length) return '';
    return list[Math.floor(Math.random() * list.length)];
}

function joinSections(sections) {
    return sections.filter(Boolean).join('\n\n');
}
