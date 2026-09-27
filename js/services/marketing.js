import {
    MARKETING_BRAND,
    MARKETING_TEMPLATES,
    MARKETING_CTAS,
    MARKETING_QUESTIONS,
    MARKETING_INSTAGRAM,
    MARKETING_PROMPTS,
    MARKETING_TYPE_HASHTAGS,
    MARKETING_BASE_HASHTAGS
} from '../config/marketing.js?v=3';
import { BURGER_MARKETING } from '../config/marketingBurgers.js?v=1';

const EXCLUDED_INGREDIENTS = new Set(['bun', 'sauce']);

const POST_EMOJI = { burger: '🍔', locations: '📍', glovo: '🛵', promo: '🔥', behind: '🔥' };

export async function loadMarketingBurgers() {
    const response = await fetch('database/burgers.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Nie udało się wczytać database/burgers.json.');
    const config = await response.json();
    return Object.entries(config.presets).map(([id, preset]) => {
        const descriptions = buildBurgerDescriptions(id, preset, config.products);
        return { id, label: preset.label, descriptions, description: descriptions[0] || '' };
    });
}

function buildBurgerDescriptions(id, preset, products) {
    const configured = BURGER_MARKETING[id]?.descriptions;
    if (configured?.length) return configured;
    const fallback = describePreset(preset, products);
    return fallback ? [fallback] : [];
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
    const values = buildValues({ type, copy, label: burger, promo, description, brand, options });

    return {
        description: values.description,
        facebook: assemblePost(type, MARKETING_TEMPLATES, values, brand, options, burger, 6),
        instagram: assemblePost(type, MARKETING_INSTAGRAM, values, brand, options, burger, 15)
    };
}

function assemblePost(type, pool, values, brand, options, burger, hashtagLimit) {
    return joinSections([
        fillTemplate(pickRandom(pool[type]), values),
        options.includeCommentPrompt ? fillTemplate(pickRandom(MARKETING_PROMPTS), values) : '',
        buildFooter(brand, options),
        buildHashtags(brand, options, type, burger, hashtagLimit)
    ]);
}

function buildValues({ type, copy, label, promo, description, brand, options }) {
    const locations = brand.locations.map(location => location.name);
    const glovoLocations = brand.locations.filter(location => location.glovo).map(location => location.name);
    const sample = pickRandom(brand.locations) || {};

    return {
        emoji: options.includeEmoji ? `${POST_EMOJI[type]} ` : '',
        brand: brand.name,
        label: label || 'nasze burgery',
        description: description || pickRandom(copy?.descriptions) || '',
        hook: pickRandom(copy?.hooks) || '',
        taste: pickRandom(copy?.tastes) || '',
        cta: pickRandom(MARKETING_CTAS[type]) || '',
        question: pickRandom(MARKETING_QUESTIONS[type]) || '',
        promo: promo || 'wyjątkowa oferta',
        locations: locations.join(' i '),
        location: sample.name || '',
        hours: sample.hours || '',
        glovo: glovoLocations.join(' i ')
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
    const text = Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, value ?? ''), template || '');
    return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
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
