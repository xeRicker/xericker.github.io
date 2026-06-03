import { enhanceCustomControls, refreshCustomControls } from './components/customControls.js?v=5';

const BURGER_DATA_URL = 'database/burgers.json?v=1';

export async function setupBurgerConfigurator(root) {
    const config = await loadBurgerConfig();
    const products = config.products;
    const presets = config.presets;
    const beefConfig = config.beef;
    const state = {
        items: [],
        nextId: 1,
        sortKey: 'calories',
        sortDir: 'desc'
    };

    const presetSelect = root.querySelector('#burgerPreset');
    const sizeSelect = root.querySelector('#burgerSize');
    const sauceSelect = root.querySelector('#burgerSauce');
    const ingredientSelect = root.querySelector('#burgerIngredient');
    const ingredientQty = root.querySelector('#burgerIngredientQty');
    const fatRetention = root.querySelector('#burgerFatRetention');
    const donenessLabel = root.querySelector('#burgerDonenessLabel');
    const list = root.querySelector('#burgerIngredients');
    const summary = root.querySelector('#burgerMacroSummary');
    const details = root.querySelector('#burgerMacroDetails');

    presetSelect.innerHTML = Object.entries(presets)
        .map(([id, preset]) => `<option value="${id}">${preset.label}</option>`)
        .join('');
    ingredientSelect.innerHTML = Object.entries(products)
        .map(([id, product]) => `<option value="${id}">${product.label}</option>`)
        .join('');

    root.querySelector('#burgerApplyPreset').addEventListener('click', () => {
        applyPreset(state, presets, presetSelect.value, sizeSelect.value, sauceSelect.value);
        render();
    });
    root.querySelector('#burgerReset').addEventListener('click', () => {
        state.items = [];
        render();
    });
    root.querySelector('#burgerAddIngredient').addEventListener('click', () => {
        addItem(state, ingredientSelect.value, Number(ingredientQty.value) || 1);
        ingredientQty.value = '1';
        render();
    });
    sizeSelect.addEventListener('change', render);
    sauceSelect.addEventListener('change', render);
    fatRetention.addEventListener('input', render);
    list.addEventListener('click', event => handleIngredientClick(event, state, render));
    summary.addEventListener('click', event => {
        const card = event.target.closest('.burger-macro-card[data-sort-key]');
        if (!card) return;
        updateSortState(state, card.dataset.sortKey);
        render();
    });

    enhanceCustomControls(root);
    render();

    function render() {
        updateDonenessLabel(donenessLabel, Number(fatRetention.value));
        renderIngredientList(list, products, beefConfig, state.items, Number(fatRetention.value));
        const rows = state.items.map(item => calculateItem(products, beefConfig, item, Number(fatRetention.value)));
        const sortedRows = sortRows(rows, state.sortKey, state.sortDir);
        const totals = sumRows(rows);
        renderSummary(summary, totals, state);
        renderDetails(details, sortedRows);
        refreshCustomControls(root);
    }
}

async function loadBurgerConfig() {
    const response = await fetch(BURGER_DATA_URL, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Nie udało się wczytać ${BURGER_DATA_URL}`);
    }

    const config = await response.json();
    validateBurgerConfig(config);
    return config;
}

function validateBurgerConfig(config) {
    if (!config?.products || !config?.presets || !config?.beef) {
        throw new Error('Niepełny plik konfiguracji burgerów.');
    }
}

function applyPreset(state, presets, presetId, size, sauceId) {
    const preset = presets[presetId];
    if (!preset) return;

    state.items = [];
    preset.ingredients.forEach(entry => {
        const resolvedId = resolvePresetProduct(entry.id, size, sauceId);
        const qty = resolveQty(entry.qty, size);
        addItem(state, resolvedId, qty);
    });
}

function resolvePresetProduct(id, size, sauceId) {
    if (id === 'sauce') return sauceId;
    if (id === 'beef') return size === 'large' ? 'beefLarge' : 'beefSmall';
    return id;
}

function resolveQty(qty, size) {
    if (typeof qty === 'number') return qty;
    return qty[size] ?? 0;
}

function addItem(state, productId, qty) {
    const existing = state.items.find(item => item.productId === productId);
    if (existing) {
        existing.qty += qty;
        return;
    }
    state.items.push({ id: state.nextId, productId, qty });
    state.nextId += 1;
}

function handleIngredientClick(event, state, render) {
    const button = event.target.closest('button');
    if (!button) return;

    const row = button.closest('.burger-ingredient-row');
    const item = state.items.find(current => current.id === Number(row?.dataset.itemId));
    if (!item) return;

    if (button.dataset.action === 'remove') {
        state.items = state.items.filter(current => current.id !== item.id);
    } else if (button.dataset.action === 'inc') {
        item.qty += 1;
    } else if (button.dataset.action === 'dec') {
        item.qty = Math.max(0, item.qty - 1);
        if (item.qty === 0) state.items = state.items.filter(current => current.id !== item.id);
    }
    render();
}

function updateSortState(state, sortKey) {
    if (state.sortKey === sortKey) {
        state.sortDir = state.sortDir === 'desc' ? 'asc' : 'desc';
        return;
    }

    state.sortKey = sortKey;
    state.sortDir = 'desc';
}

function calculateItem(products, beefConfig, item, fatRetention) {
    const product = products[item.productId];
    if (!product) {
        return {
            id: item.id,
            label: item.productId,
            qty: item.qty,
            unitLabel: 'szt.',
            grams: 0,
            note: 'brak produktu w database/burgers.json',
            calories: 0,
            fat: 0,
            carbs: 0,
            protein: 0
        };
    }

    const grams = product.unitGrams * item.qty;
    const macros = product.beef
        ? calculateBeefMacros(beefConfig, grams, fatRetention)
        : scaleMacros(product.macros, grams);

    return {
        id: item.id,
        label: product.label,
        qty: item.qty,
        unitLabel: product.unitLabel,
        grams,
        note: product.note,
        ...macros
    };
}

function calculateBeefMacros(beefConfig, grams, fatRetention) {
    const rawFat = grams * Number(beefConfig.fatRatio || 0);
    const retainedFat = rawFat * (fatRetention / 100);
    const protein = grams * Number(beefConfig.proteinRatio || 0);
    const carbs = grams * Number(beefConfig.carbsRatio || 0);
    return {
        calories: retainedFat * 9 + protein * 4 + carbs * 4,
        fat: retainedFat,
        carbs,
        protein
    };
}

function scaleMacros(macros, grams) {
    if (!macros) {
        return { calories: 0, fat: 0, carbs: 0, protein: 0 };
    }

    const factor = grams / 100;
    return {
        calories: macros.calories * factor,
        fat: macros.fat * factor,
        carbs: macros.carbs * factor,
        protein: macros.protein * factor
    };
}

function sumRows(rows) {
    return rows.reduce((totals, row) => ({
        calories: totals.calories + row.calories,
        fat: totals.fat + row.fat,
        carbs: totals.carbs + row.carbs,
        protein: totals.protein + row.protein,
        grams: totals.grams + row.grams
    }), { calories: 0, fat: 0, carbs: 0, protein: 0, grams: 0 });
}

function sortRows(rows, sortKey, sortDir) {
    const direction = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
        const diff = (Number(a[sortKey]) || 0) - (Number(b[sortKey]) || 0);
        if (diff !== 0) return diff * direction;
        return a.label.localeCompare(b.label, 'pl');
    });
}

function renderIngredientList(list, products, beefConfig, items, fatRetention) {
    if (!items.length) {
        list.innerHTML = '<div class="burger-empty">Dodaj preset albo pojedyncze składniki.</div>';
        return;
    }

    list.innerHTML = items.map(item => {
        const product = products[item.productId];
        const row = calculateItem(products, beefConfig, item, fatRetention);
        return `
            <div class="burger-ingredient-row" data-item-id="${item.id}">
                <div class="burger-ingredient-main">
                    <strong>${row.label}</strong>
                    <span>${formatNumber(row.grams)} g · ${item.qty} ${product?.unitLabel || 'szt.'}</span>
                    <div class="burger-ingredient-macros" aria-label="Makro składnika">
                        <span class="macro-chip macro-chip--calories"><span class="material-symbols-rounded" aria-hidden="true">local_fire_department</span>${Math.round(row.calories)}</span>
                        <span class="macro-chip macro-chip--protein"><span class="material-symbols-rounded" aria-hidden="true">fitness_center</span>${formatNumber(row.protein)}</span>
                        <span class="macro-chip macro-chip--fat"><span class="material-symbols-rounded" aria-hidden="true">opacity</span>${formatNumber(row.fat)}</span>
                        <span class="macro-chip macro-chip--carbs"><span class="material-symbols-rounded" aria-hidden="true">grain</span>${formatNumber(row.carbs)}</span>
                    </div>
                </div>
                <div class="burger-row-actions">
                    <button class="burger-icon-action" type="button" data-action="dec" aria-label="Zmniejsz ${row.label}">
                        <span class="material-symbols-rounded" aria-hidden="true">remove</span>
                    </button>
                    <span class="burger-qty">${item.qty}</span>
                    <button class="burger-icon-action" type="button" data-action="inc" aria-label="Zwiększ ${row.label}">
                        <span class="material-symbols-rounded" aria-hidden="true">add</span>
                    </button>
                    <button class="burger-icon-action burger-icon-action--danger" type="button" data-action="remove" aria-label="Usuń ${row.label}">
                        <span class="material-symbols-rounded" aria-hidden="true">delete</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderSummary(summary, totals, state) {
    summary.innerHTML = [
        ['Kalorie', `${Math.round(totals.calories)} kcal`, 'local_fire_department', 'calories'],
        ['Białko', `${formatNumber(totals.protein)} g`, 'fitness_center', 'protein'],
        ['Tłuszcz', `${formatNumber(totals.fat)} g`, 'opacity', 'fat'],
        ['Węgle', `${formatNumber(totals.carbs)} g`, 'grain', 'carbs']
    ].map(([label, value, icon, type]) => `
        <button class="burger-macro-card burger-macro-card--${type} ${state.sortKey === type ? 'is-sorted' : ''}" type="button" data-sort-key="${type}" aria-label="Sortuj według: ${label}">
            <span class="material-symbols-rounded" aria-hidden="true">${icon}</span>
            <small>${label}</small>
            <strong>${value}</strong>
            <span class="burger-sort-indicator material-symbols-rounded" aria-hidden="true">${state.sortKey === type && state.sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
        </button>
    `).join('');
}

function renderDetails(details, rows) {
    if (!rows.length) {
        details.innerHTML = '';
        return;
    }

    details.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Składnik</th>
                    <th><span class="macro-head macro-chip--calories"><span class="material-symbols-rounded" aria-hidden="true">local_fire_department</span></span></th>
                    <th><span class="macro-head macro-chip--protein"><span class="material-symbols-rounded" aria-hidden="true">fitness_center</span></span></th>
                    <th><span class="macro-head macro-chip--fat"><span class="material-symbols-rounded" aria-hidden="true">opacity</span></span></th>
                    <th><span class="macro-head macro-chip--carbs"><span class="material-symbols-rounded" aria-hidden="true">grain</span></span></th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(row => `
                    <tr>
                        <td>
                            <span class="cell-primary">${row.label}</span>
                            <span class="cell-secondary">${formatNumber(row.grams)} g · ${row.qty} ${row.unitLabel}</span>
                            ${row.note ? `<span class="cell-secondary">${row.note}</span>` : ''}
                        </td>
                        <td>${Math.round(row.calories)}</td>
                        <td>${formatNumber(row.protein)}</td>
                        <td>${formatNumber(row.fat)}</td>
                        <td>${formatNumber(row.carbs)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function updateDonenessLabel(label, fatRetention) {
    if (fatRetention >= 85) {
        label.textContent = `Mało wysmażone · zostaje ${fatRetention}% tłuszczu`;
    } else if (fatRetention <= 60) {
        label.textContent = `Mocno wysmażone · zostaje ${fatRetention}% tłuszczu`;
    } else {
        label.textContent = `Średnio · zostaje ${fatRetention}% tłuszczu`;
    }
}

function formatNumber(value) {
    return Number(value).toLocaleString('pl-PL', {
        maximumFractionDigits: value >= 10 ? 0 : 1
    });
}
