import { apiService } from './api.js?v=65';

export const DEFAULT_EMPLOYEES = [
    ['pawel.komendera', 'Paweł', 'Komendera'],
    ['radek.komendera', 'Radek', 'Komendera'],
    ['sebastian.mąsior', 'Sebastian', 'Mąsior'],
    ['tomek.katański', 'Tomek', 'Katański'],
    ['kacper.jarnot', 'Kacper', 'Jarnot'],
    ['natalia.duraj', 'Natalia', 'Duraj'],
    ['dominik.żabiński', 'Dominik', 'Żabiński']
].map(([id, firstName, lastName]) => ({
    id, firstName, lastName, shortName: `${firstName} ${lastName[0]}.`, enabled: true
}));

export function normalizeEmployeeCatalog(input) {
    const source = Array.isArray(input?.employees) ? input.employees : DEFAULT_EMPLOYEES;
    return {
        version: Number(input?.version) || 1,
        updatedAt: input?.updatedAt || null,
        employees: source.map((employee = {}, index) => {
            const firstName = String(employee.firstName || employee.name || '').trim();
            const lastName = String(employee.lastName || '').trim();
            const id = String(employee.id || `${firstName}.${lastName}`.toLowerCase()).trim();
            return {
                id,
                firstName,
                lastName,
                shortName: employee.shortName || `${firstName} ${lastName.charAt(0)}.`,
                enabled: employee.enabled !== false,
                order: Number.isFinite(employee.order) ? employee.order : index
            };
        }).filter(employee => employee.id && employee.firstName && employee.lastName)
    };
}

export function getActiveEmployees(catalog) {
    return normalizeEmployeeCatalog(catalog).employees.filter(employee => employee.enabled);
}

/**
 * Raporty zapisują osobę raz jako identyfikator (`pawel.komendera`), a raz jako
 * samo imię z legacy list, więc dopasowanie musi być odporne na oba zapisy.
 */
function normalizeEmployeeKey(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[łŁ]/g, 'l')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

export function resolveEmployee(rawName, catalog) {
    const key = normalizeEmployeeKey(rawName);
    if (!key) return null;
    const employees = normalizeEmployeeCatalog(catalog).employees;
    return employees.find(employee => normalizeEmployeeKey(employee.id) === key)
        || employees.find(employee => normalizeEmployeeKey(`${employee.firstName} ${employee.lastName}`) === key)
        || employees.find(employee => normalizeEmployeeKey(employee.shortName) === key)
        || employees.find(employee => normalizeEmployeeKey(employee.firstName) === key)
        || null;
}

/**
 * Osoba ukryta w EKIPIE nie pojawia się na listach pracowników (kalulator
 * wynagrodzeń, tabela godzin), ale jej historyczne godziny zostają w danych.
 * Nazwy spoza katalogu (np. jednorazowy pracownik) nie są ukrywane.
 */
export function isEmployeeVisible(rawName, catalog) {
    return resolveEmployee(rawName, catalog)?.enabled !== false;
}

export function getEmployeeDisplayName(id, catalog) {
    const employee = normalizeEmployeeCatalog(catalog).employees.find(item => item.id === id);
    if (employee) return employee.shortName;
    const legacy = {
        'Paweł': 'Paweł K.', 'Radek': 'Radek K.', 'Sebastian': 'Sebastian M.',
        'Tomek': 'Tomek K.', 'Kacper': 'Kacper J.', 'Natalia': 'Natalia D.', 'Dominik': 'Dominik Ż.'
    };
    return legacy[id] || id;
}

export async function loadEmployeeCatalog() {
    return normalizeEmployeeCatalog(await apiService.fetchEmployees());
}
