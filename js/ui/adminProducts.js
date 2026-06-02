import { apiService } from '../services/api.js?v=2';
import { createId, loadProductCatalog, normalizeProductCatalog } from '../services/products.js?v=2';
import { dialogService } from './components/customControls.js?v=5';

const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const ICON_OPTIONS = [
    'restaurant', 'eco', 'kitchen', 'lunch_dining', 'bakery_dining', 'science',
    'inventory_2', 'construction', 'local_drink', 'shopping_bag', 'cleaning_services',
    'receipt_long', 'set_meal', 'ramen_dining', 'local_pizza', 'local_cafe',
    'icecream', 'liquor', 'takeout_dining', 'delivery_dining', 'payments',
    'store', 'category', 'widgets', 'box', 'shelves', 'yard', 'water_drop',
    'local_fire_department', 'hardware', 'build', 'fact_check', 'checklist'
];

class AdminProducts {
    constructor() {
        this.catalog = normalizeProductCatalog();
        this.container = null;
        this.draggedProductId = null;
        this.savedSnapshot = '';
        this.isDirty = false;
    }

    async init(container) {
        this.container = container;
        this.catalog = normalizeProductCatalog(await loadProductCatalog());
        this.savedSnapshot = this.serializeCatalog();
        this.isDirty = false;
        this.render();
        this.bindEvents();
        window.addEventListener('beforeunload', event => {
            if (!this.hasUnsavedChanges()) return;
            event.preventDefault();
            event.returnValue = '';
        });
    }

    bindEvents() {
        this.container.addEventListener('click', event => this.handleClick(event));
        this.container.addEventListener('submit', event => this.handleSubmit(event));
        this.container.addEventListener('dragstart', event => this.handleDragStart(event));
        this.container.addEventListener('dragover', event => this.handleDragOver(event));
        this.container.addEventListener('drop', event => this.handleDrop(event));
        this.container.addEventListener('dragend', () => this.clearDropTargets());
        this.container.addEventListener('click', event => {
            if (event.target.closest('#saveProductsBtn')) this.save();
        });
    }

    render() {
        this.container.innerHTML = `
            <div class="admin-products-head">
                <div class="section-heading">
                    <h3>Produkty</h3>
                    <p>Kategorie i aktywne produkty z tej listy są używane przez generator raportów.</p>
                </div>
                <button id="saveProductsBtn" class="btn-back admin-save-btn ${this.isDirty ? 'has-unsaved-changes' : 'is-clean'}" type="button" ${this.isDirty ? '' : 'disabled'}>
                    <span class="material-symbols-rounded" aria-hidden="true">save</span>
                    Zapisz
                </button>
            </div>

            <form class="product-add-form" data-action="add-category">
                <input name="name" class="calc-input" placeholder="Nazwa kategorii, np. Sosy" required>
                <input name="icon" type="hidden" value="inventory_2">
                <button class="icon-picker-button" type="button" data-action="pick-category-icon">
                    <span class="material-symbols-rounded" aria-hidden="true">category</span>
                </button>
                <button class="chart-btn active" type="submit">Dodaj</button>
            </form>

            <div class="admin-category-list">
                ${this.catalog.categories.map(category => this.renderCategory(category)).join('')}
            </div>
        `;
    }

    renderCategory(category) {
        return `
            <section class="admin-category-card ${category.enabled ? '' : 'is-disabled'}" data-category-id="${category.id}">
                <div class="admin-category-head">
                    <div class="admin-category-title">
                        <span class="category-icon material-symbols-rounded" aria-hidden="true">${escapeHtml(category.icon)}</span>
                        <div>
                            <h4>${escapeHtml(category.name)}</h4>
                            <span>${category.items.length} produktów</span>
                        </div>
                    </div>
                    <div class="admin-row-actions">
                        <button class="state-switch ${category.enabled ? 'is-on' : 'is-off'}" type="button" data-action="toggle-category" title="Włącz/wyłącz kategorię">
                            <span class="material-symbols-rounded" aria-hidden="true">${category.enabled ? 'visibility' : 'visibility_off'}</span>
                        </button>
                        <button class="icon-action" type="button" data-action="edit-category" title="Edytuj kategorię">
                            <span class="material-symbols-rounded" aria-hidden="true">edit</span>
                        </button>
                        <button class="icon-action" type="button" data-action="edit-category-icon" title="Zmień ikonę">
                            <span class="material-symbols-rounded" aria-hidden="true">category</span>
                        </button>
                        <button class="icon-action icon-action--danger" type="button" data-action="delete-category" title="Usuń kategorię">
                            <span class="material-symbols-rounded" aria-hidden="true">delete</span>
                        </button>
                    </div>
                </div>

                <form class="product-add-form product-add-form--compact" data-action="add-product">
                    <input name="name" class="calc-input" placeholder="Nazwa produktu" required>
                    <select name="type" class="calc-input">
                        <option value="quantity">Ilość +/-</option>
                        <option value="toggle">Przełącznik</option>
                    </select>
                    <button class="chart-btn" type="submit">Dodaj</button>
                </form>

                <div class="admin-product-list" data-category-id="${category.id}">
                    ${category.items.map(product => this.renderProduct(product)).join('') || '<div class="empty-products">Brak produktów w tej kategorii.</div>'}
                </div>
            </section>
        `;
    }

    renderProduct(product) {
        return `
            <div class="admin-product-row ${product.enabled ? '' : 'is-disabled'}" draggable="true" data-product-id="${product.id}">
                <span class="drag-handle material-symbols-rounded" aria-hidden="true">drag_indicator</span>
                <div class="admin-product-main">
                    <strong>${escapeHtml(product.name)}</strong>
                    <span>${product.type === 'toggle' ? 'Przełącznik' : 'Ilość +/-'}</span>
                </div>
                <div class="admin-row-actions">
                    <button class="type-switch ${product.type === 'toggle' ? 'is-toggle' : 'is-quantity'}" type="button" data-action="toggle-product-type" title="Zmień typ produktu">
                        <span class="material-symbols-rounded" aria-hidden="true">${product.type === 'toggle' ? 'toggle_on' : 'add_circle'}</span>
                    </button>
                    <button class="state-switch ${product.enabled ? 'is-on' : 'is-off'}" type="button" data-action="toggle-product" title="Włącz/wyłącz produkt">
                        <span class="material-symbols-rounded" aria-hidden="true">${product.enabled ? 'visibility' : 'visibility_off'}</span>
                    </button>
                    <button class="icon-action" type="button" data-action="edit-product" title="Edytuj produkt">
                        <span class="material-symbols-rounded" aria-hidden="true">edit</span>
                    </button>
                    <button class="icon-action icon-action--danger" type="button" data-action="delete-product" title="Usuń produkt">
                        <span class="material-symbols-rounded" aria-hidden="true">delete</span>
                    </button>
                </div>
            </div>
        `;
    }

    async handleClick(event) {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (!action) return;

        if (action === 'add-category' || action === 'add-product') return;
        const snapshotBefore = this.serializeCatalog();
        if (action === 'toggle-category') this.toggleCategory(event);
        if (action === 'delete-category') await this.deleteCategory(event);
        if (action === 'edit-category') await this.editCategory(event);
        if (action === 'edit-category-icon') await this.editCategoryIcon(event);
        if (action === 'toggle-product') this.toggleProduct(event);
        if (action === 'toggle-product-type') this.toggleProductType(event);
        if (action === 'delete-product') await this.deleteProduct(event);
        if (action === 'edit-product') await this.editProduct(event);
        if (action === 'pick-category-icon') await this.pickFormIcon(event);

        if (action !== 'pick-category-icon') {
            this.syncDirtyState(snapshotBefore);
            this.render();
        }
    }

    async handleSubmit(event) {
        const action = event.target.dataset.action;
        if (!action) return;
        event.preventDefault();

        const formData = new FormData(event.target);
        if (action === 'add-category') {
            this.catalog.categories.push({
                id: createId('category'),
                name: formData.get('name').trim(),
                icon: formData.get('icon')?.trim() || 'inventory_2',
                enabled: true,
                items: []
            });
        }

        if (action === 'add-product') {
            const category = this.findCategory(event.target.closest('[data-category-id]')?.dataset.categoryId);
            if (category) {
                category.items.push({
                    id: createId('product'),
                    name: formData.get('name').trim(),
                    type: formData.get('type') === 'toggle' ? 'toggle' : 'quantity',
                    enabled: true
                });
            }
        }

        this.syncDirtyState();
        this.render();
    }

    async save() {
        if (!this.hasUnsavedChanges()) return;
        const button = this.container.querySelector('#saveProductsBtn');
        button.disabled = true;
        button.classList.add('is-saving');
        button.lastChild.textContent = ' Zapisuję';

        try {
            this.catalog.updatedAt = new Date().toISOString();
            this.catalog = normalizeProductCatalog(this.catalog);
            await apiService.saveProducts(this.catalog);
            this.savedSnapshot = this.serializeCatalog();
            this.isDirty = false;
            await dialogService.alert('Katalog produktów został zapisany.', 'Zapisano');
        } catch (error) {
            console.error(error);
            await dialogService.alert(`Nie udało się zapisać katalogu produktów. ${error.message}`, 'Błąd zapisu');
        } finally {
            this.render();
        }
    }

    handleDragStart(event) {
        const row = event.target.closest('.admin-product-row');
        if (!row) return;
        this.draggedProductId = row.dataset.productId;
        event.dataTransfer.effectAllowed = 'move';
    }

    handleDragOver(event) {
        const list = event.target.closest('.admin-product-list');
        if (!list || !this.draggedProductId) return;
        event.preventDefault();
        this.clearDropTargets();
        list.classList.add('is-drop-target');
    }

    handleDrop(event) {
        const list = event.target.closest('.admin-product-list');
        if (!list || !this.draggedProductId) return;
        event.preventDefault();

        const source = this.removeProduct(this.draggedProductId);
        const target = this.findCategory(list.dataset.categoryId);
        if (source && target) {
            const beforeRow = event.target.closest('.admin-product-row');
            const beforeIndex = beforeRow
                ? target.items.findIndex(product => product.id === beforeRow.dataset.productId)
                : -1;
            if (beforeIndex >= 0) target.items.splice(beforeIndex, 0, source);
            else target.items.push(source);
        }

        this.draggedProductId = null;
        this.syncDirtyState();
        this.render();
    }

    clearDropTargets() {
        this.container.querySelectorAll('.is-drop-target').forEach(node => node.classList.remove('is-drop-target'));
    }

    toggleCategory(event) {
        const category = this.findEventCategory(event);
        if (category) category.enabled = !category.enabled;
    }

    async deleteCategory(event) {
        const category = this.findEventCategory(event);
        if (!category) return;
        const confirmed = await dialogService.confirm(`Usunąć kategorię "${category.name}" razem z produktami?`, 'Usuń kategorię');
        if (!confirmed) return;
        this.catalog.categories = this.catalog.categories.filter(item => item.id !== category.id);
    }

    async editCategory(event) {
        const category = this.findEventCategory(event);
        if (!category) return;
        const name = await dialogService.prompt('Nazwa kategorii', 'Edytuj kategorię', { value: category.name });
        if (name) category.name = name.trim();
    }

    async editCategoryIcon(event) {
        const category = this.findEventCategory(event);
        if (!category) return;
        const icon = await this.openIconPicker(category.icon);
        if (icon) category.icon = icon;
    }

    async pickFormIcon(event) {
        const button = event.target.closest('[data-action="pick-category-icon"]');
        const form = button?.closest('form');
        const input = form?.querySelector('input[name="icon"]');
        if (!button || !input) return;

        const icon = await this.openIconPicker(input.value || 'inventory_2');
        if (!icon) return;
        input.value = icon;
        button.querySelector('.material-symbols-rounded').textContent = icon;
    }

    toggleProductType(event) {
        const product = this.findEventProduct(event);
        if (product) product.type = product.type === 'toggle' ? 'quantity' : 'toggle';
    }

    toggleProduct(event) {
        const product = this.findEventProduct(event);
        if (product) product.enabled = !product.enabled;
    }

    async deleteProduct(event) {
        const product = this.findEventProduct(event);
        if (!product) return;
        const confirmed = await dialogService.confirm(`Usunąć produkt "${product.name}"?`, 'Usuń produkt');
        if (!confirmed) return;
        this.removeProduct(product.id);
    }

    async editProduct(event) {
        const product = this.findEventProduct(event);
        if (!product) return;
        const name = await dialogService.prompt('Nazwa produktu', 'Edytuj produkt', { value: product.name });
        if (name) product.name = name.trim();
    }

    openIconPicker(currentIcon = 'inventory_2') {
        const layer = this.ensureIconDialog();
        const dialog = layer.querySelector('.product-icon-dialog');
        const searchInput = dialog.querySelector('.product-icon-search');
        const grid = dialog.querySelector('.product-icon-grid');

        const renderIcons = filter => {
            const normalizedFilter = filter.trim().toLowerCase();
            grid.innerHTML = ICON_OPTIONS
                .filter(icon => icon.includes(normalizedFilter))
                .map(icon => `
                    <button class="product-icon-option ${icon === currentIcon ? 'is-selected' : ''}" type="button" data-icon="${icon}">
                        <span class="material-symbols-rounded" aria-hidden="true">${icon}</span>
                        <span>${icon}</span>
                    </button>
                `)
                .join('');
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

    ensureIconDialog() {
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
                    <button class="icon-action" type="button" data-icon-close>
                        <span class="material-symbols-rounded" aria-hidden="true">close</span>
                    </button>
                </div>
                <input class="product-icon-search calc-input" placeholder="Szukaj ikony">
                <div class="product-icon-grid"></div>
            </div>
        `;
        document.body.appendChild(layer);
        return layer;
    }

    findEventCategory(event) {
        return this.findCategory(event.target.closest('[data-category-id]')?.dataset.categoryId);
    }

    findEventProduct(event) {
        const productId = event.target.closest('[data-product-id]')?.dataset.productId;
        return this.catalog.categories.flatMap(category => category.items).find(product => product.id === productId);
    }

    findCategory(categoryId) {
        return this.catalog.categories.find(category => category.id === categoryId);
    }

    removeProduct(productId) {
        for (const category of this.catalog.categories) {
            const index = category.items.findIndex(product => product.id === productId);
            if (index >= 0) return category.items.splice(index, 1)[0];
        }
        return null;
    }

    hasUnsavedChanges() {
        return this.isDirty;
    }

    async confirmDiscardChanges() {
        if (!this.hasUnsavedChanges()) return true;
        return dialogService.confirm(
            'Masz niezapisane zmiany w produktach. Czy na pewno chcesz opuścić tę stronę bez zapisu?',
            'Niezapisane zmiany'
        );
    }

    syncDirtyState(snapshotBefore = null) {
        const currentSnapshot = this.serializeCatalog();
        if (snapshotBefore !== null && snapshotBefore === currentSnapshot) return;
        this.isDirty = currentSnapshot !== this.savedSnapshot;
    }

    serializeCatalog() {
        return JSON.stringify(this.catalog);
    }
}

export const adminProducts = new AdminProducts();
