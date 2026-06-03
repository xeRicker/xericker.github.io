import { escapeHtml, renderMaterialIcon } from '../utils.js';

const CATEGORY_SYMBOLS = {
    "🥩": "restaurant",
    "🥗": "eco",
    "🧀": "kitchen",
    "🍟": "lunch_dining",
    "🍞": "bakery_dining",
    "🧂": "science",
    "🥫": "inventory_2",
    "🪓": "construction",
    "🥤": "local_drink",
    "🛍️": "shopping_bag",
    "🧽": "cleaning_services",
    "📋": "receipt_long"
};

export const mainRender = {
    renderEmployees(container, list, colors, presets) {
        container.innerHTML = [
            ...list.map((name, i) => this.renderEmployeeRow({
                id: name.toLowerCase(),
                name,
                color: colors[name] || '#ccc',
                presets,
                delay: i * 0.05
            })),
            this.renderTemporaryEmployeeButton(list.length * 0.05)
        ].join('');
    },

    renderEmployeeRow({ id, name, color, presets, delay = 0, temporary = false }) {
        const opts = presets.map(p => `<option value="${p.value}">${p.label}</option>`).join('');
        const safeId = escapeHtml(id);
        const safeName = escapeHtml(name);

        return `
            <div class="employee-row animate-stagger ${temporary ? 'employee-row--temporary active' : ''}" data-employee-id="${safeId}" data-temporary-employee="${temporary ? 'true' : 'false'}" style="animation-delay:${delay}s">
                <div class="employee-info">
                    <div class="avatar" style="background-color:${escapeHtml(color)}">${escapeHtml((name || 'N')[0])}</div>
                    ${temporary
                        ? `<input class="emp-name emp-name-input" type="text" value="${safeName}" aria-label="Nazwa pracownika tymczasowego">`
                        : `<div class="emp-name">${safeName}</div>`
                    }
                    <div class="preset-btn-wrapper">
                        <button class="btn-preset" type="button" style="color:var(--primary-color)" aria-label="Szybkie godziny">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </button>
                        <select class="hidden-preset-select" data-id="${safeId}"><option></option>${opts}</select>
                    </div>
                </div>
                <div class="time-inputs">
                    <input type="time" id="${safeId}_od"><span style="color:var(--text-muted)">-</span><input type="time" id="${safeId}_do">
                </div>
            </div>`;
    },

    renderTemporaryEmployeeButton(delay = 0) {
        return `
            <button class="employee-row employee-row--add animate-stagger" type="button" data-add-temporary-employee="true" style="animation-delay:${delay}s">
                <div class="employee-info">
                    <div class="avatar avatar--new">+</div>
                    <div class="emp-name">
                        <span>NOWY</span>
                        <small>Dodaj jednorazowego pracownika</small>
                    </div>
                </div>
            </button>`;
    },

    appendTemporaryEmployee(container, employee, presets) {
        const addButton = container.querySelector('[data-add-temporary-employee]');
        const rowHtml = this.renderEmployeeRow({
            id: employee.id,
            name: employee.name,
            color: employee.color,
            presets,
            temporary: true
        });
        addButton.insertAdjacentHTML('beforebegin', rowHtml);
        return container.querySelector(`[data-employee-id="${employee.id}"]`);
    },

    renderProducts(container, catalog) {
        let idx = 0;
        const categories = Array.isArray(catalog?.categories)
            ? catalog.categories.map((category = {}) => ({
                ...category,
                name: category.name || 'Kategoria',
                icon: category.icon || CATEGORY_SYMBOLS[category.name] || 'inventory_2',
                items: Array.isArray(category.items) ? category.items : []
            }))
            : Object.entries(catalog || {}).map(([name, category = {}]) => ({
                name,
                icon: CATEGORY_SYMBOLS[name] || 'inventory_2',
                items: Array.isArray(category.items) ? category.items : []
            }));

        container.innerHTML = categories.map(category => `
            <div class="category-header animate-stagger" style="animation-delay:${idx++*0.05}s">
                ${renderMaterialIcon(category.icon || CATEGORY_SYMBOLS[category.name] || 'inventory_2', 'category-icon')}
            </div>
            <div class="products-grid">
                ${(category.items || []).map(p => {
            const delay = idx++ * 0.02;
            const name = escapeHtml(p.name);
            if(p.type === 's' || p.type === 'toggle') {
                return `
                        <div class="product-card animate-stagger type-toggle" data-name="${name}" style="animation-delay:${delay}s">
                            <div class="product-name">${name}</div>
                            <div class="controls">
                                <div class="toggle-indicator"><svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                <input type="checkbox" id="checkbox-${name}" data-name="${name}" style="display:none">
                            </div>
                        </div>`;
            } else {
                return `
                        <div class="product-card animate-stagger" data-name="${name}" style="animation-delay:${delay}s">
                            <div class="product-name">${name}</div>
                            <div class="controls">
                                <div class="counter-wrapper">
                                    <button class="btn-qty btn-minus" data-act="dec" data-name="${name}">−</button>
                                    <input type="text" inputmode="numeric" id="input-${name}" class="qty-display" value="0" data-name="${name}">
                                    <button class="btn-qty btn-plus" data-act="inc" data-name="${name}">+</button>
                                </div>
                            </div>
                        </div>`;
            }
        }).join('')}
            </div>
        `).join('');
    },

    toggleHighlight(name, isActive) {
        const selectorName = window.CSS?.escape ? CSS.escape(name) : String(name).replaceAll('"', '\\"');
        const el = document.querySelector(`.product-card[data-name="${selectorName}"]`);
        if(el) el.classList.toggle('active', isActive);
    },

    updateResetBtn() {
        const hasData = localStorage.getItem("burbone_state");
        document.getElementById("resetContainer").style.display = hasData ? "block" : "none";
    }
};
