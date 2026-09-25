import { MARKETING_BRAND } from '../config/marketing.js';

const EXCLUDED_INGREDIENTS = new Set(['bun', 'sauce']);

const HOOK_EMOJI = { burger: '🍔', locations: '📍', glovo: '🛵', promo: '🔥' };
const FOOTER_EMOJI = { location: '📍', hours: '🕒', glovo: '🛵' };

const HOOKS = {
    burger: ['Dziś na tapecie: {label}', 'Mamy dziś {label}', '{label} znów melduje się na grillu', 'Czas na {label}'],
    locations: ['Dziś znajdziesz nas w dwóch miejscach', 'Gdzie nas dziś szukać?', 'Oświęcim i Osiek, wybierz gdzie Ci wygodniej'],
    glovo: ['Nie chce Ci się nigdzie ruszać? Zamów nas przez Glovo', 'Glovo dowozi nas w Oświęcimiu', 'Burgery bez wychodzenia z domu? Da się', 'Zamów Burbone z Glovo'],
    promo: ['Promocja: {promo}', 'Dziś w Burbone: {promo}', 'Tylko teraz: {promo}']
};

const ACTIONS = {
    burger: ['Wpadnij i sprawdź, jak smakuje na żywo.', 'Przekonaj się, czy to Twój nowy numer jeden.', 'Czekamy z rozgrzanym grillem.', 'Do zobaczenia przy okienku!'],
    locations: ['Wpadnij do Oświęcimia albo Osieka, na miejscu czeka ten sam Burbone.', 'Oba punkty działają dziś dla Was.', 'Wybierz bliżej siebie, burgery smakują tak samo.'],
    glovo: ['Wpisz Burbone w aplikacji Glovo i czekaj na kuriera.', 'Otwórz Glovo, dodaj burgery do koszyka i tyle.', 'Dostawa działa w Oświęcimiu. Smacznego!'],
    promo: ['Skorzystaj, póki trwa.', 'Wpadnij, zanim się skończy.', 'Nie przegap!']
};

const INSTAGRAM_BODIES = {
    burger: ['Zamów i sprawdź.', 'Dziś w menu.', 'Polecamy na głoda.'],
    locations: ['Oświęcim i Osiek. Czekamy!', 'Dwa punkty, jeden smak.'],
    glovo: ['Glovo dowozi w Oświęcimiu.', 'Zamów z dostawą.'],
    promo: ['Tylko teraz!', 'Wpadnij i skorzystaj.']
};

const COMMENT_PROMPTS = [
    'Napisz w komentarzu, na którego masz ochotę.',
    'A Ty co dziś wybierasz? Daj znać w komentarzu.',
    'Który burger kusi Cię najbardziej? Pisz w komentarzu.'
];

export async function loadMarketingBurgers() {
    const response = await fetch('database/burgers.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Nie udało się wczytać database/burgers.json.');
    const config = await response.json();
    return Object.entries(config.presets).map(([id, preset]) => ({
        id,
        label: preset.label,
        description: describePreset(preset, config.products)
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

export function buildMarketingPost({ type, burger = '', promo = '', description = '', options = {}, brand = MARKETING_BRAND, variantIndex = 0 }) {
    const hookText = fillTemplate(pick(HOOKS[type], variantIndex), { label: burger || 'nasze burgery', promo: promo || 'wyjątkowa oferta' });
    const hook = withEmoji(HOOK_EMOJI[type], hookText, options.includeEmoji);
    const action = pick(ACTIONS[type], variantIndex + 1);
    const body = type === 'burger' ? [description, action].filter(Boolean).join('\n\n') : action;
    const prompt = options.includeCommentPrompt ? pick(COMMENT_PROMPTS, variantIndex + 2) : '';
    const instagramBody = pick(INSTAGRAM_BODIES[type], variantIndex + 1);
    return {
        facebook: joinSections([hook, body, prompt, buildFooter(brand, options), buildHashtags(brand, options, type === 'burger' ? burger : '')]),
        instagram: joinSections([hook, instagramBody, buildHashtags(brand, options, type === 'burger' ? burger : '', 6)])
    };
}

function buildFooter(brand, options) {
    const lines = [];
    if (options.includeLocations) {
        brand.locations.forEach(location => {
            const details = [];
            if (options.includeHours) details.push(location.hours);
            if (options.includePhones) details.push(`tel. ${location.phone}`);
            lines.push(withEmoji(FOOTER_EMOJI.location, `${location.name}${details.length ? ', ' + details.join(', ') : ''}`, options.includeEmoji));
        });
    } else if (options.includeHours) {
        const hours = brand.locations.map(location => `${location.name} ${location.hours}`).join(', ');
        lines.push(withEmoji(FOOTER_EMOJI.hours, hours, options.includeEmoji));
    }
    if (options.includeGlovo) {
        const glovoLocations = brand.locations.filter(location => location.glovo).map(location => location.name);
        if (glovoLocations.length) {
            const scope = glovoLocations.length === brand.locations.length ? '' : `, tylko ${glovoLocations.join(', ')}`;
            lines.push(withEmoji(FOOTER_EMOJI.glovo, `Dostawa Glovo${scope}`, options.includeEmoji));
        }
    }
    return lines.join('\n');
}

function buildHashtags(brand, options, burger, limit = 10) {
    if (!options.includeHashtags) return '';
    const tags = [...brand.hashtags];
    if (burger) tags.push(burger);
    return [...new Set(tags)]
        .slice(0, limit)
        .map(tag => `#${tag.replace(/\s+/g, '')}`)
        .join(' ');
}

function fillTemplate(template, values) {
    return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template || '');
}

function withEmoji(emoji, text, includeEmoji) {
    return includeEmoji && emoji ? `${emoji} ${text}` : text;
}

function pick(list, index) {
    if (!list?.length) return '';
    return list[((index % list.length) + list.length) % list.length];
}

function joinSections(sections) {
    return sections.filter(Boolean).join('\n\n');
}
