export const CATEGORY_ICON_OPTIONS = [
    'restaurant', 'restaurant_menu', 'local_dining', 'dine_in', 'flatware', 'set_meal',
    'lunch_dining', 'dinner_dining', 'breakfast_dining', 'brunch_dining', 'fastfood',
    'kebab_dining', 'ramen_dining', 'rice_bowl', 'soup_kitchen', 'tapas', 'bento',
    'outdoor_grill', 'local_pizza', 'bakery_dining',
    'cake', 'cookie', 'icecream', 'shaved_ice',
    'coffee', 'coffee_maker', 'emoji_food_beverage', 'free_breakfast', 'local_cafe',
    'local_drink', 'local_bar', 'wine_bar', 'sports_bar', 'liquor', 'nightlife',
    'water_bottle', 'water_drop', 'egg', 'egg_alt',
    'nutrition', 'grass', 'yard', 'agriculture', 'energy_savings_leaf', 'eco', 'compost',
    'potted_plant', 'forest', 'outdoor_garden', 'deck', 'umbrella',
    'kitchen', 'countertops', 'microwave', 'oven_gen', 'blender', 'stockpot', 'skillet_cooktop',
    'multicooker', 'dishwasher', 'table_restaurant', 'chair', 'event_seat',
    'takeout_dining', 'delivery_dining', 'local_shipping',
    'grocery', 'local_convenience_store', 'storefront', 'store', 'shopping_bag',
    'shopping_basket', 'shopping_cart',
    'inventory', 'inventory_2', 'package', 'package_2', 'box', 'all_inbox', 'warehouse', 'shelves',
    'cleaning_services', 'cleaning_bucket', 'wash', 'sanitizer', 'soap', 'dry_cleaning',
    'local_laundry_service', 'local_car_wash',
    'water_heater', 'thermostat', 'ac_unit', 'light_mode', 'bolt', 'electric_bolt',
    'solar_power', 'propane_tank', 'oil_barrel', 'local_fire_department',
    'scale', 'bar_chart', 'point_of_sale', 'payments', 'receipt_long', 'sell', 'price_check',
    'fact_check', 'checklist', 'category', 'widgets',
    'construction', 'build', 'handyman', 'hardware'
];

const FALLBACK_ICON = 'inventory_2';

export function openCategoryIconPicker(currentIcon = FALLBACK_ICON) {
    const layer = ensureIconDialog();
    const dialog = layer.querySelector('.product-icon-dialog');
    const searchInput = dialog.querySelector('.product-icon-search');
    const grid = dialog.querySelector('.product-icon-grid');

    const renderIcons = filter => {
        const normalizedFilter = filter.trim().toLowerCase();
        const matches = CATEGORY_ICON_OPTIONS.filter(icon => icon.includes(normalizedFilter));
        grid.innerHTML = matches.length
            ? matches.map(icon => `
                <button class="product-icon-option ${icon === currentIcon ? 'is-selected' : ''}" type="button" data-icon="${icon}" title="${icon}">
                    <span class="material-symbols-rounded" aria-hidden="true">${icon}</span>
                </button>
            `).join('')
            : '<div class="product-icon-empty">Brak ikon dla tego hasła.</div>';
    };

    renderIcons('');
    searchInput.value = '';
    layer.classList.add('is-visible');
    searchInput.focus();

    return new Promise(resolve => {
        const close = value => {
            layer.classList.remove('is-visible');
            grid.removeEventListener('click', onGridClick);
            searchInput.removeEventListener('input', onSearch);
            layer.querySelector('[data-icon-close]').removeEventListener('click', onCancel);
            resolve(value);
        };
        const onGridClick = event => {
            const option = event.target.closest('[data-icon]');
            if (option) close(option.dataset.icon);
        };
        const onSearch = event => renderIcons(event.target.value);
        const onCancel = () => close(null);

        grid.addEventListener('click', onGridClick);
        searchInput.addEventListener('input', onSearch);
        layer.querySelector('[data-icon-close]').addEventListener('click', onCancel);
    });
}

function ensureIconDialog() {
    let layer = document.getElementById('productIconDialogLayer');
    if (layer) return layer;

    layer = document.createElement('div');
    layer.id = 'productIconDialogLayer';
    layer.className = 'product-icon-dialog-layer';
    layer.innerHTML = `
        <div class="product-icon-dialog" role="dialog" aria-modal="true">
            <div class="product-icon-dialog__head">
                <div>
                    <h3>Wybierz ikonę</h3>
                    <p>Ikona będzie widoczna przy kategorii w generatorze i adminie.</p>
                </div>
                <button class="icon-action" type="button" data-icon-close aria-label="Zamknij wybór ikony">
                    <span class="material-symbols-rounded" aria-hidden="true">close</span>
                </button>
            </div>
            <input class="product-icon-search calc-input" placeholder="Szukaj ikony" aria-label="Szukaj ikony">
            <div class="product-icon-grid"></div>
        </div>
    `;
    document.body.appendChild(layer);
    return layer;
}
