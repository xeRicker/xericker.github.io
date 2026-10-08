import { apiService } from './api.js?v=170';

export const DEFAULT_LOCATIONS = [
    { name: 'Oświęcim', path: 'oświęcim', enabled: true, stats: true, deleted: false, aliases: [] },
    { name: 'Osiek', path: 'osiek', enabled: true, stats: true, deleted: false, aliases: [] },
    { name: 'Wilamowice', path: 'wilamowice', enabled: false, stats: true, deleted: false, aliases: [] }
].map((location, index) => ({ ...location, order: index }));

export function normalizeLocationKey(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[łŁ]/g, 'l')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

export function slugifyLocation(value) {
    return normalizeLocationKey(value).replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
}

export function normalizeLocationCatalog(input) {
    const source = Array.isArray(input?.locations) ? input.locations : DEFAULT_LOCATIONS;
    return {
        version: Number(input?.version) || 1,
        updatedAt: input?.updatedAt || null,
        locations: source.map((location = {}, index) => {
            const name = String(location.name ?? location.location ?? '').trim();
            const path = String(location.path ?? location.folder ?? slugifyLocation(name)).trim();
            const aliases = (Array.isArray(location.aliases) ? location.aliases : [])
                .map(alias => String(alias).trim())
                .filter(alias => alias && normalizeLocationKey(alias) !== normalizeLocationKey(name));
            return {
                name,
                path,
                aliases: Array.from(new Set(aliases)),
                enabled: location.enabled !== false,
                stats: location.stats !== false,
                deleted: location.deleted === true,
                order: Number.isFinite(location.order) ? location.order : index
            };
        }).filter(location => location.name && location.path)
    };
}

function sortByOrder(locations) {
    return [...locations].sort((left, right) => left.order - right.order);
}

export function getSelectableLocations(catalog) {
    return sortByOrder(normalizeLocationCatalog(catalog).locations.filter(location => location.enabled && !location.deleted));
}

export function getPanelLocations(catalog) {
    return sortByOrder(normalizeLocationCatalog(catalog).locations.filter(location => !location.deleted));
}

export function createLocationResolver(catalog) {
    const entries = sortByOrder(normalizeLocationCatalog(catalog).locations);
    const index = new Map();
    entries.forEach(entry => {
        [entry.path, entry.name, ...entry.aliases].forEach(value => {
            const key = normalizeLocationKey(value);
            if (key && !index.has(key)) index.set(key, entry);
        });
    });

    const resolve = rawName => {
        const key = normalizeLocationKey(rawName);
        return key ? index.get(key) || null : null;
    };

    return {
        entries,
        resolve,
        nameFor: rawName => resolve(rawName)?.name || String(rawName ?? ''),
        isArchived: rawName => resolve(rawName)?.deleted === true,
        inStatistics: rawName => resolve(rawName)?.stats !== false
    };
}

export async function loadLocationCatalog() {
    return normalizeLocationCatalog(await apiService.fetchLocations());
}
