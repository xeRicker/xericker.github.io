export const CATEGORY_ICON_GROUPS = [
    {
        label: 'Dania i fast food',
        icons: [
            'restaurant', 'restaurant_menu', 'local_dining', 'dine_in', 'flatware', 'set_meal',
            'lunch_dining', 'dinner_dining', 'brunch_dining', 'fastfood', 'kebab_dining',
            'ramen_dining', 'rice_bowl', 'soup_kitchen', 'tapas', 'bento', 'takeout_dining',
            'delivery_dining', 'outdoor_grill', 'local_pizza'
        ]
    },
    {
        label: 'Sałatki i warzywa',
        icons: [
            'eco', 'nutrition', 'grocery', 'grass', 'yard', 'agriculture', 'compost',
            'energy_savings_leaf', 'potted_plant', 'forest', 'park', 'local_florist', 'spa'
        ]
    },
    {
        label: 'Pieczywo i nabiał',
        icons: [
            'bakery_dining', 'breakfast_dining', 'egg', 'egg_alt', 'grain'
        ]
    },
    {
        label: 'Słodycze i desery',
        icons: [
            'cake', 'cookie', 'icecream', 'shaved_ice', 'celebration'
        ]
    },
    {
        label: 'Napoje i alkohol',
        icons: [
            'coffee', 'coffee_maker', 'emoji_food_beverage', 'free_breakfast', 'local_cafe',
            'local_drink', 'local_bar', 'wine_bar', 'sports_bar', 'liquor', 'nightlife',
            'water_bottle', 'water_drop', 'water_full'
        ]
    },
    {
        label: 'Kuchnia i grill',
        icons: [
            'kitchen', 'countertops', 'microwave', 'oven_gen', 'blender', 'stockpot',
            'skillet_cooktop', 'multicooker', 'dishwasher', 'table_restaurant', 'chair',
            'event_seat', 'propane_tank', 'oil_barrel', 'local_fire_department', 'water_heater',
            'thermostat', 'ac_unit', 'light_mode', 'bolt', 'electric_bolt', 'solar_power'
        ]
    },
    {
        label: 'Opakowania i magazyn',
        icons: [
            'inventory', 'inventory_2', 'package', 'package_2', 'box', 'all_inbox', 'warehouse',
            'shelves', 'shopping_bag', 'shopping_basket', 'shopping_cart', 'local_shipping',
            'local_convenience_store', 'storefront', 'store'
        ]
    },
    {
        label: 'Sprzątanie i higiena',
        icons: [
            'cleaning_services', 'cleaning_bucket', 'wash', 'sanitizer', 'soap', 'dry_cleaning',
            'local_laundry_service', 'local_car_wash'
        ]
    },
    {
        label: 'Kasa, ceny i dokumenty',
        icons: [
            'point_of_sale', 'payments', 'credit_card', 'receipt_long', 'sell', 'price_check',
            'fact_check', 'checklist', 'scale', 'bar_chart', 'monitoring', 'savings'
        ]
    },
    {
        label: 'Narzędzia i inne',
        icons: [
            'construction', 'build', 'handyman', 'hardware', 'category', 'widgets', 'label', 'bookmark'
        ]
    }
];

export const CATEGORY_ICON_OPTIONS = CATEGORY_ICON_GROUPS.flatMap(group => group.icons);

const FALLBACK_ICON = 'inventory_2';

export function openCategoryIconPicker(currentIcon = FALLBACK_ICON) {
    const layer = ensureIconDialog();
    const dialog = layer.querySelector('.product-icon-dialog');
    const searchInput = dialog.querySelector('.product-icon-search');
    const grid = dialog.querySelector('.product-icon-grid');

    const renderIcons = filter => {
        const normalizedFilter = filter.trim().toLowerCase();
        const groups = CATEGORY_ICON_GROUPS
            .map(group => ({ label: group.label, icons: group.icons.filter(icon => icon.includes(normalizedFilter)) }))
            .filter(group => group.icons.length);
        grid.innerHTML = groups.length
            ? groups.map(group => `
                <section class="product-icon-group">
                    <h4 class="product-icon-group__label">${group.label}<span>${group.icons.length}</span></h4>
                    <div class="product-icon-group__grid">
                        ${group.icons.map(icon => `
                            <button class="product-icon-option ${icon === currentIcon ? 'is-selected' : ''}" type="button" data-icon="${icon}" title="${icon}">
                                <span class="material-symbols-rounded" aria-hidden="true">${icon}</span>
                            </button>
                        `).join('')}
                    </div>
                </section>
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
