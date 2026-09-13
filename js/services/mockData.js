const DEFAULT_LOCATIONS = ['Oświęcim', 'Osiek'];
const DEFAULT_EMPLOYEES = [
    'pawel.komendera',
    'sebastian.mąsior',
    'kacper.jarnot',
    'natalia.duraj'
];
const DEFAULT_PRODUCTS = [
    { name: 'Mięso: Małe', toggle: false },
    { name: 'Mięso: Duże', toggle: false },
    { name: 'Stripsy', toggle: false },
    { name: 'Sałata', toggle: false },
    { name: 'Ogórki', toggle: false },
    { name: 'Bułki', toggle: false },
    { name: 'Frytki', toggle: false },
    { name: 'Sos: Czosnek', toggle: false }
];

/**
 * Localhost-only fallback: fills the last months with report-shaped data so a
 * fresh clone or an empty database folder still renders every admin view.
 */
export function generateMockReports({ months = 3, referenceDate = new Date(), locations, employees, products } = {}) {
    const locationNames = normalizeLocations(locations);
    const employeeKeys = normalizeEmployees(employees);
    const productItems = normalizeProducts(products);

    return buildDateRange(months, referenceDate).flatMap(date =>
        locationNames.map((location, locationIndex) => buildReport({
            date,
            location,
            locationIndex,
            employeeKeys,
            productItems
        }))
    );
}

function buildReport({ date, location, locationIndex, employeeKeys, productItems }) {
    const dateString = formatReportDate(date);
    const random = createRandom(hashSeed(`${location}|${dateString}`));
    const weekday = date.getDay();
    const revenue = buildRevenue(random, weekday, locationIndex);

    return {
        location,
        date: dateString,
        revenue,
        cardRevenue: Math.round(revenue * (0.30 + random() * 0.15)),
        glovoRevenue: Math.round(revenue * (0.04 + random() * 0.14)),
        employees: buildEmployees(random, date, employeeKeys),
        products: buildProducts(random, productItems)
    };
}

function buildRevenue(random, weekday, locationIndex) {
    const weekend = weekday === 5 || weekday === 6;
    const factor = (0.78 + (locationIndex % 3) * 0.16) * (weekday === 0 ? 1.18 : weekend ? 1.42 : 1);
    return Math.round((1300 + random() * 1900) * factor / 10) * 10;
}

function buildEmployees(random, date, employeeKeys) {
    const weekday = date.getDay();
    const count = weekday === 0 || weekday === 5 || weekday === 6 ? 3 : 2;
    const roster = shuffle(random, employeeKeys).slice(0, Math.min(count, employeeKeys.length));
    const shifts = shiftTemplates(date);

    return roster.reduce((acc, key, index) => {
        const shift = shifts[index % shifts.length];
        acc[key] = `${shift.start},${shift.end}`;
        return acc;
    }, {});
}

function shiftTemplates(date) {
    const weekday = date.getDay();
    const late = weekday === 5 || weekday === 6;
    const open = weekday === 0 ? 13 * 60 : 12 * 60;
    const close = late ? 22 * 60 : 21 * 60;

    return [
        { start: minutesToTime(open), end: minutesToTime(close) },
        { start: minutesToTime(open + 180), end: minutesToTime(close + 30) },
        { start: minutesToTime(open + 60), end: minutesToTime(close - 60) }
    ];
}

function buildProducts(random, productItems) {
    return productItems.reduce((acc, item) => {
        if (item.toggle) {
            if (random() > 0.55) acc[item.name] = 1 + Math.floor(random() * 2);
            return acc;
        }
        const cap = item.name.includes('Bułki') ? 45 : 6;
        acc[item.name] = Math.floor(random() * (cap + 1));
        return acc;
    }, {});
}

function buildDateRange(months, referenceDate) {
    const span = Math.max(1, Math.floor(months));
    const dates = [];

    for (let offset = span - 1; offset >= 0; offset -= 1) {
        const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - offset, 1);
        const lastDay = offset === 0
            ? referenceDate.getDate()
            : new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

        for (let day = 1; day <= lastDay; day += 1) {
            dates.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day));
        }
    }

    return dates;
}

function normalizeLocations(input) {
    const list = Array.isArray(input?.locations) ? input.locations : null;
    if (!list) return DEFAULT_LOCATIONS;

    const names = list
        .filter(location => location && location.deleted !== true && location.stats !== false)
        .map(location => String(location.name || '').trim())
        .filter(Boolean);

    return names.length ? names : DEFAULT_LOCATIONS;
}

function normalizeEmployees(input) {
    const list = Array.isArray(input?.employees) ? input.employees : null;
    if (!list) return DEFAULT_EMPLOYEES;

    const keys = list
        .filter(employee => employee && employee.enabled !== false)
        .map(employee => String(employee.id || `${employee.firstName || ''}.${employee.lastName || ''}`).trim())
        .filter(Boolean);

    return keys.length >= 2 ? keys : DEFAULT_EMPLOYEES;
}

function normalizeProducts(input) {
    const categories = Array.isArray(input?.categories) ? input.categories : null;
    if (!categories) return DEFAULT_PRODUCTS;

    const items = categories
        .filter(category => category && category.enabled !== false)
        .flatMap(category => Array.isArray(category.items) ? category.items : [])
        .filter(item => item && item.enabled !== false && item.name)
        .map(item => ({ name: String(item.name), toggle: item.type === 'toggle' || item.type === 's' }));

    return items.length ? items : DEFAULT_PRODUCTS;
}

function shuffle(random, values) {
    const copy = [...values];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(random() * (index + 1));
        [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
}

function createRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function hashSeed(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function minutesToTime(totalMinutes) {
    const minutes = ((totalMinutes % 1440) + 1440) % 1440;
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function formatReportDate(date) {
    return [
        String(date.getDate()).padStart(2, '0'),
        String(date.getMonth() + 1).padStart(2, '0'),
        date.getFullYear()
    ].join('.');
}
