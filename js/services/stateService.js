import { APP_CONFIG } from '../config.js';

const STORAGE_KEY = "productList";

export function saveStateToLocalStorage(productMap, employees) {
    const data = { time: Date.now(), products: {}, employees: {} };

    const revenueInput = document.getElementById('revenueInput');
    const cardRevenueInput = document.getElementById('cardRevenueInput');

    if (revenueInput) data.revenue = revenueInput.value;
    if (cardRevenueInput) data.cardRevenue = cardRevenueInput.value;

    productMap.forEach((product, name) => {
        if (product.type === 's') {
            const checkbox = document.getElementById(`checkbox-${name}`);
            if (checkbox) data.products[name] = checkbox.checked ? 1 : 0;
        } else {
            const input = document.getElementById(`input-${name}`);
            if (input) data.products[name] = input.value;
        }
    });

    employees.forEach(name => {
        const id = name.toLowerCase();
        const from = document.getElementById(`${id}_od`).value;
        const to = document.getElementById(`${id}_do`).value;
        if (from || to) {
            data.employees[id] = { from, to };
        }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadStateFromLocalStorage() {
    const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

    if (!savedData.time || Date.now() - savedData.time > APP_CONFIG.LOCAL_STORAGE_EXPIRATION) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
    return savedData;
}