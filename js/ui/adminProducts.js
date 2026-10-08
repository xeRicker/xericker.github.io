import { apiService } from '../services/api.js?v=170';
import { createId, loadProductCatalog, normalizeProductCatalog } from '../services/products.js?v=162';
import { escapeHtml, renderMaterialIcon } from '../utils.js';
import { dialogService } from './components/customControls.js?v=173';
import { noticeService } from './components/notice.js?v=102';
import { cardClass } from './components/Card.js';

import { openCategoryIconPicker } from './components/productIconPicker.js?v=1';
import { setupProductDrag } from './components/productDrag.js?v=1';

const DEFAULT_ICON = 'inventory_2';

class AdminProducts {
    constructor() {
        this.catalog = normalizeProductCatalog();
        this.container = null;
        this.animatedId = '';
        this.animatedKind = '';
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
        setupProductDrag(this.container, {
            onProductsDropped: (productId, categoryId) => this.applyProductOrder(productId, categoryId),
            onCategoriesDropped: categoryId => this.applyCategoryOrder(categoryId)
        });
    }

    applyProductOrder(productId, categoryId) {
        const category = this.findCategory(categoryId);
        const list = this.container.querySelector(`.admin-product-list[data-category-id="${categoryId}"]`);
        if (!category || !list) return;
        const orderedIds = Array.from(list.querySelectorAll('.admin-product-row')).map(row => row.dataset.productId);
        category.items.sort((left, right) => orderedIds.indexOf(left.id) - orderedIds.indexOf(right.id));
        this.syncDirtyState();
        this.animatedId = productId;
        this.animatedKind = 'product';
        this.render();
    }

    applyCategoryOrder(categoryId) {
        const orderedIds = Array.from(this.container.querySelectorAll('.admin-category-card')).map(card => card.dataset.categoryId);
        this.catalog.categories.sort((left, right) => orderedIds.indexOf(left.id) - orderedIds.indexOf(right.id));
        this.syncDirtyState();
        this.animatedId = categoryId;
        this.animatedKind = 'category';
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="admin-products-head">
                <div class="section-heading">
                    <h3><span class="material-symbols-rounded" aria-hidden="true">inventory_2</span> Produkty</h3>
                </div>
                <button id="saveProductsBtn" class="btn-back admin-save-btn ${this.isDirty ? 'has-unsaved-changes' : 'is-clean'}" type="button" ${this.isDirty ? '' : 'disabled'}>
                    <span class="material-symbols-rounded" aria-hidden="true">save</span>
                    Zapisz
                </button>
            </div>

            <form class="product-add-form" data-action="add-category">
                <input name="name" class="calc-input" placeholder="Nazwa kategorii, np. Sosy" required>
                <input name="icon" type="hidden" value="${DEFAULT_ICON}">
                <button class="icon-picker-button" type="button" data-action="pick-category-icon" title="Wybierz ikonę kategorii">
                    <span class="material-symbols-rounded" aria-hidden="true">category</span>
                </button>
                <button class="chart-btn active" type="submit">+ Kategoria</button>
            </form>

            <div class="admin-category-list">
                ${this.catalog.categories.map((category, index) => this.renderCategory(category, index)).join('')}
            </div>
        `;
        this.animatedId = '';
        this.animatedKind = '';
    }

    renderCategory(category, categoryIndex) {
        const categoryCount = this.catalog.categories.length;
        const isLanded = this.animatedKind === 'category' && category.id === this.animatedId;
        return `
            <section class="${cardClass('product', `admin-category-card ${category.enabled ? '' : 'is-disabled'} ${isLanded ? 'is-landed' : ''}`)}" data-category-id="${category.id}">
                <div class="admin-category-head">
                    <div class="admin-category-title">
                        <span class="drag-handle drag-handle--category material-symbols-rounded" draggable="true" data-category-drag="${category.id}" role="button" tabindex="0" title="Przeciągnij, aby zmienić kolejność kategorii" aria-label="Przeciągnij, aby zmienić kolejność kategorii">drag_indicator</span>
                        ${renderMaterialIcon(category.icon, 'category-icon')}
                        <div>
                            <h4>${escapeHtml(category.name)}</h4>
                            <span>${category.items.length} produktów</span>
                        </div>
                    </div>
                    <div class="admin-row-actions">
                        ${this.renderMoveButton('move-category-up', 'keyboard_arrow_up', 'Przesuń kategorię wyżej', categoryIndex === 0)}
                        ${this.renderMoveButton('move-category-down', 'keyboard_arrow_down', 'Przesuń kategorię niżej', categoryIndex === categoryCount - 1)}
                        <button class="state-switch ${category.enabled ? 'is-on' : 'is-off'}" type="button" data-action="toggle-category" title="Włącz/wyłącz kategorię">
                            ${renderMaterialIcon(category.enabled ? 'visibility' : 'visibility_off')}
                        </button>
                        <button class="icon-action" type="button" data-action="edit-category" title="Edytuj kategorię">
                            ${renderMaterialIcon('edit')}
                        </button>
                        <button class="icon-action" type="button" data-action="edit-category-icon" title="Zmień ikonę">
                            ${renderMaterialIcon('category')}
                        </button>
                        <button class="icon-action icon-action--danger" type="button" data-action="delete-category" title="Usuń kategorię">
                            ${renderMaterialIcon('delete')}
                        </button>
                    </div>
                </div>

                <form class="product-add-form product-add-form--compact" data-action="add-product">
                    <input name="name" class="calc-input" placeholder="Nazwa produktu" required>
                    <select name="type" class="calc-input">
                        <option value="quantity">Ilość +/-</option>
                        <option value="toggle">Przełącznik</option>
                    </select>
                    <button class="chart-btn" type="submit">+ Produkt</button>
                </form>

                <div class="admin-product-list" data-category-id="${category.id}">
                    ${category.items.map((product, index) => this.renderProduct(product, index, category.items.length)).join('') || '<div class="empty-products">Brak produktów w tej kategorii.</div>'}
                </div>
            </section>
        `;
    }

    renderProduct(product, index, count) {
        const isLanded = product.id === this.animatedId
            && (this.animatedKind === 'product' || this.animatedKind === 'add');
        return `
            <div class="admin-product-row ${product.enabled ? '' : 'is-disabled'} ${isLanded ? 'is-landed' : ''}" draggable="true" data-product-id="${product.id}">
                ${renderMaterialIcon('drag_indicator', 'drag-handle')}
                <div class="admin-product-main">
                    <strong>${escapeHtml(product.name)}</strong>
                    <span>${product.type === 'toggle' ? 'Przełącznik' : 'Ilość +/-'}</span>
                </div>
                <div class="admin-row-actions">
                    ${this.renderMoveButton('move-product-up', 'keyboard_arrow_up', 'Przesuń produkt wyżej', index === 0)}
                    ${this.renderMoveButton('move-product-down', 'keyboard_arrow_down', 'Przesuń produkt niżej', index === count - 1)}
                    <button class="type-switch ${product.type === 'toggle' ? 'is-toggle' : 'is-quantity'}" type="button" data-action="toggle-product-type" title="Zmień typ produktu">
                        ${renderMaterialIcon(product.type === 'toggle' ? 'toggle_on' : 'add_circle')}
                    </button>
                    <button class="state-switch ${product.enabled ? 'is-on' : 'is-off'}" type="button" data-action="toggle-product" title="Włącz/wyłącz produkt">
                        ${renderMaterialIcon(product.enabled ? 'visibility' : 'visibility_off')}
                    </button>
                    <button class="icon-action" type="button" data-action="edit-product" title="Edytuj produkt">
                        ${renderMaterialIcon('edit')}
                    </button>
                    <button class="icon-action icon-action--danger" type="button" data-action="delete-product" title="Usuń produkt">
                        ${renderMaterialIcon('delete')}
                    </button>
                </div>
            </div>
        `;
    }

    renderMoveButton(action, icon, title, disabled) {
        return `
            <button class="icon-action icon-action--move" type="button" data-action="${action}" title="${title}" ${disabled ? 'disabled' : ''}>
                ${renderMaterialIcon(icon)}
            </button>
        `;
    }

    async handleClick(event) {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (!action || action === 'add-category' || action === 'add-product') return;

        const snapshotBefore = this.serializeCatalog();
        if (action === 'toggle-category') this.toggleCategory(event);
        if (action === 'move-category-up') this.moveCategory(event, -1);
        if (action === 'move-category-down') this.moveCategory(event, 1);
        if (action === 'delete-category') await this.deleteCategory(event);
        if (action === 'edit-category') await this.editCategory(event);
        if (action === 'edit-category-icon') await this.editCategoryIcon(event);
        if (action === 'toggle-product') this.toggleProduct(event);
        if (action === 'toggle-product-type') this.toggleProductType(event);
        if (action === 'move-product-up') this.moveProduct(event, -1);
        if (action === 'move-product-down') this.moveProduct(event, 1);
        if (action === 'delete-product') await this.deleteProduct(event);
        if (action === 'edit-product') await this.editProduct(event);
        if (action === 'pick-category-icon') await this.pickFormIcon(event);

        if (action === 'pick-category-icon' || action === 'edit-category' || action === 'edit-product') return;

        this.syncDirtyState(snapshotBefore);
        if (action.startsWith('move-category') || action === 'delete-category') this.animatedKind = 'category';
        else this.animatedKind = 'product';
        this.render();
    }

    async handleSubmit(event) {
        const action = event.target.dataset.action;
        if (!action) return;
        event.preventDefault();

        const formData = new FormData(event.target);
        if (action === 'add-category') {
            const category = {
                id: createId('category'),
                name: formData.get('name').trim(),
                icon: formData.get('icon')?.trim() || DEFAULT_ICON,
                enabled: true,
                items: []
            };
            this.catalog.categories.push(category);
            this.animatedId = category.id;
            this.animatedKind = 'category';
        }

        if (action === 'add-product') {
            const category = this.findCategory(event.target.closest('[data-category-id]')?.dataset.categoryId);
            if (!category) return;
            const product = {
                id: createId('product'),
                name: formData.get('name').trim(),
                type: formData.get('type') === 'toggle' ? 'toggle' : 'quantity',
                enabled: true
            };
            category.items.push(product);
            this.animatedId = product.id;
            this.animatedKind = 'product';
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
            noticeService.toast({ variant: 'success', text: 'Katalog produktów został zapisany.' });
        } catch (error) {
            console.error(error);
            await dialogService.error(`Nie udało się zapisać katalogu produktów. ${error.message}`, 'Błąd zapisu');
        } finally {
            this.render();
        }
    }

    toggleCategory(event) {
        const category = this.findEventCategory(event);
        if (category) category.enabled = !category.enabled;
    }

    moveCategory(event, direction) {
        const category = this.findEventCategory(event);
        if (!category) return;
        this.moveItem(this.catalog.categories, category.id, direction);
        this.animatedId = category.id;
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
        const icon = await openCategoryIconPicker(category.icon);
        if (icon) category.icon = icon;
    }

    async pickFormIcon(event) {
        const button = event.target.closest('[data-action="pick-category-icon"]');
        const form = button?.closest('form');
        const input = form?.querySelector('input[name="icon"]');
        if (!button || !input) return;

        const icon = await openCategoryIconPicker(input.value || DEFAULT_ICON);
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

    moveProduct(event, direction) {
        const productId = event.target.closest('[data-product-id]')?.dataset.productId;
        const category = this.catalog.categories.find(item => item.items.some(product => product.id === productId));
        if (!category) return;
        this.moveItem(category.items, productId, direction);
        this.animatedId = productId;
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

    moveItem(list, id, direction) {
        const from = list.findIndex(item => item.id === id);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= list.length) return;
        const [item] = list.splice(from, 1);
        list.splice(to, 0, item);
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
