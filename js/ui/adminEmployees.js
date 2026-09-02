import { apiService } from '../services/api.js?v=64';
import { createId } from '../services/products.js?v=60';
import { loadEmployeeCatalog, normalizeEmployeeCatalog } from '../services/employees.js?v=64';
import { escapeHtml, renderMaterialIcon } from '../utils.js';
import { dialogService } from './components/customControls.js?v=60';

class AdminEmployees {
    constructor() { this.catalog = normalizeEmployeeCatalog(); this.container = null; this.savedSnapshot = ''; this.isDirty = false; }

    async init(container) {
        this.container = container;
        this.catalog = await loadEmployeeCatalog();
        this.savedSnapshot = this.serialize();
        this.render();
        this.container.addEventListener('click', event => this.handleClick(event));
        this.container.addEventListener('submit', event => this.handleSubmit(event));
    }

    render() {
        const employees = this.catalog.employees;
        this.container.innerHTML = `
            <div class="admin-products-head">
                <div class="section-heading">
                    <h3><span class="material-symbols-rounded" aria-hidden="true">groups</span> EKIPA</h3>
                    <p>Aktywne osoby są widoczne na stronie głównej podczas tworzenia listy.</p>
                </div>
                <button id="saveEmployeesBtn" class="btn-back admin-save-btn ${this.isDirty ? 'has-unsaved-changes' : 'is-clean'}" type="button" ${this.isDirty ? '' : 'disabled'}>
                    <span class="material-symbols-rounded" aria-hidden="true">save</span> Zapisz
                </button>
            </div>
            <form class="employee-add-form" data-action="add-employee">
                <input name="firstName" class="calc-input" placeholder="Imię" required>
                <input name="lastName" class="calc-input" placeholder="Nazwisko" required>
                <button class="chart-btn active" type="submit"><span class="material-symbols-rounded" aria-hidden="true">person_add</span> Dodaj osobę</button>
            </form>
            <div class="admin-employee-list">
                ${employees.map(employee => this.renderEmployee(employee)).join('') || '<div class="empty-products">Brak osób w ekipie.</div>'}
            </div>`;
    }

    renderEmployee(employee) {
        return `<div class="admin-employee-row ${employee.enabled ? '' : 'is-disabled'}" data-employee-id="${escapeHtml(employee.id)}">
            <div class="admin-employee-avatar">${escapeHtml(employee.firstName[0])}</div>
            <div class="admin-product-main"><strong>${escapeHtml(employee.firstName)} ${escapeHtml(employee.lastName)}</strong><span>${employee.enabled ? 'Widoczny w generatorze' : 'Ukryty w generatorze'} · ${escapeHtml(employee.id)}</span></div>
            <div class="admin-row-actions">
                <button class="state-switch ${employee.enabled ? 'is-on' : 'is-off'}" type="button" data-action="toggle" title="Włącz/wyłącz widoczność">${renderMaterialIcon(employee.enabled ? 'visibility' : 'visibility_off')}</button>
                <button class="icon-action" type="button" data-action="edit" title="Edytuj osobę">${renderMaterialIcon('edit')}</button>
                <button class="icon-action icon-action--danger" type="button" data-action="delete" title="Usuń osobę">${renderMaterialIcon('delete')}</button>
            </div>
        </div>`;
    }

    async handleSubmit(event) {
        if (event.target.dataset.action !== 'add-employee') return;
        event.preventDefault();
        const data = new FormData(event.target);
        const firstName = String(data.get('firstName')).trim();
        const lastName = String(data.get('lastName')).trim();
        const id = `${firstName}.${lastName}`.toLocaleLowerCase('pl-PL').replace(/\s+/g, '-');
        if (this.catalog.employees.some(employee => employee.id === id)) return dialogService.alert('Ta osoba jest już na liście.', 'Duplikat osoby');
        this.catalog.employees.push({ id: id || createId('employee'), firstName, lastName, shortName: `${firstName} ${lastName[0]}.`, enabled: true, order: this.catalog.employees.length });
        this.markDirty(); this.render();
    }

    async handleClick(event) {
        if (event.target.closest('#saveEmployeesBtn')) return this.save();
        const button = event.target.closest('[data-action]');
        if (!button) return;
        const row = button.closest('[data-employee-id]');
        const employee = this.catalog.employees.find(item => item.id === row?.dataset.employeeId);
        if (!employee) return;
        if (button.dataset.action === 'toggle') employee.enabled = !employee.enabled;
        if (button.dataset.action === 'delete') {
            if (!await dialogService.confirm(`Usunąć osobę „${employee.firstName} ${employee.lastName}” z aktywnej ekipy? Historyczne raporty pozostaną bez zmian.`, 'Usuń osobę')) return;
            this.catalog.employees = this.catalog.employees.filter(item => item.id !== employee.id);
        }
        if (button.dataset.action === 'edit') {
            const firstName = await dialogService.prompt('Imię', 'Edytuj osobę', { value: employee.firstName });
            if (!firstName) return;
            const lastName = await dialogService.prompt('Nazwisko', 'Edytuj osobę', { value: employee.lastName });
            if (!lastName) return;
            employee.firstName = firstName.trim(); employee.lastName = lastName.trim(); employee.shortName = `${employee.firstName} ${employee.lastName[0]}.`;
        }
        this.markDirty(); this.render();
    }

    markDirty() { this.isDirty = this.serialize() !== this.savedSnapshot; }
    serialize() { return JSON.stringify(this.catalog); }
    hasUnsavedChanges() { return this.isDirty; }
    async confirmDiscardChanges() { return !this.isDirty || dialogService.confirm('Masz niezapisane zmiany w ekipie. Opuścić stronę bez zapisu?', 'Niezapisane zmiany'); }
    async save() {
        if (!this.isDirty) return;
        const button = this.container.querySelector('#saveEmployeesBtn');
        button.disabled = true; button.classList.add('is-saving');
        try { this.catalog.updatedAt = new Date().toISOString(); await apiService.saveEmployees(this.catalog); this.savedSnapshot = this.serialize(); this.isDirty = false; await dialogService.alert('Lista ekipy została zapisana.', 'Zapisano'); }
        catch (error) { await dialogService.alert(`Nie udało się zapisać ekipy. ${error.message}`, 'Błąd zapisu'); }
        this.render();
    }
}

export const adminEmployees = new AdminEmployees();
