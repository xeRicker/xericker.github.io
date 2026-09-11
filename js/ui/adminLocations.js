import { apiService } from '../services/api.js?v=65';
import {
    loadLocationCatalog,
    normalizeLocationCatalog,
    normalizeLocationKey,
    slugifyLocation
} from '../services/locations.js?v=66';
import { escapeHtml, renderMaterialIcon } from '../utils.js';
import { dialogService } from './components/customControls.js?v=71';

class AdminLocations {
    constructor() {
        this.catalog = normalizeLocationCatalog();
        this.container = null;
        this.savedSnapshot = '';
        this.isDirty = false;
        this.autoFolder = true;
        this.onSaved = null;
    }

    async init(container) {
        this.container = container;
        this.catalog = await loadLocationCatalog();
        this.savedSnapshot = this.serialize();
        this.render();
        this.container.addEventListener('click', event => this.handleClick(event));
        this.container.addEventListener('submit', event => this.handleSubmit(event));
        this.container.addEventListener('input', event => this.handleInput(event));
    }

    render() {
        const locations = sortLocations(this.catalog.locations);
        const active = locations.filter(location => !location.deleted);
        const archived = locations.filter(location => location.deleted);

        this.container.innerHTML = `
            <div class="admin-products-head">
                <div class="section-heading">
                    <h3><span class="material-symbols-rounded" aria-hidden="true">near_me</span> PUNKTY</h3>
                    <p>Widoczność w generatorze decyduje, czy punkt można wybrać przy tworzeniu listy. Uwzględnienie w statystykach decyduje, czy jego dane liczą się w utargach, godzinach i wypłatach. Archiwum wyłącza jedno i drugie, a dane zostają w bazie.</p>
                </div>
                <button id="saveLocationsBtn" class="btn-back admin-save-btn ${this.isDirty ? 'has-unsaved-changes' : 'is-clean'}" type="button" ${this.isDirty ? '' : 'disabled'}>
                    <span class="material-symbols-rounded" aria-hidden="true">save</span> Zapisz
                </button>
            </div>
            <form class="location-add-form" data-action="add-location">
                <input name="name" class="calc-input" placeholder="Nazwa punktu, np. Kęty" required>
                <input name="path" class="calc-input" placeholder="Folder w bazie, np. kety" data-auto-folder="true" required>
                <button class="chart-btn active" type="submit"><span class="material-symbols-rounded" aria-hidden="true">add_location_alt</span> Dodaj punkt</button>
            </form>
            <p class="location-add-hint">${renderMaterialIcon('info', 'location-add-hint__icon')} Folder to miejsce w <code>database/</code>, w którym leżą listy punktu. Zmiana nazwy punktu nie przenosi folderu — dzięki temu archiwum zostaje pod tą samą nazwą.</p>
            <div class="admin-location-list">
                ${active.map(location => this.renderLocation(location)).join('') || '<div class="empty-products">Brak punktów w katalogu.</div>'}
            </div>
            ${archived.length ? `
                <div class="admin-location-archive">
                    <div class="section-heading section-heading--stack">
                        <h4>${renderMaterialIcon('inventory_2')} ARCHIWUM</h4>
                        <p>Punkty usunięte. Ich listy i dane w <code>database/</code> są nietknięte, ale nie pojawiają się już nigdzie w aplikacji.</p>
                    </div>
                    <div class="admin-location-list">
                        ${archived.map(location => this.renderLocation(location)).join('')}
                    </div>
                </div>` : ''}`;
    }

    renderLocation(location) {
        const aliases = location.aliases.length
            ? `<span>Dawne nazwy: ${escapeHtml(location.aliases.join(', '))}</span>`
            : '';
        const status = location.deleted
            ? 'Archiwum — poza generatorem i statystykami'
            : describeVisibility(location);

        return `<div class="admin-location-row ${location.deleted ? 'is-archived' : ''} ${!location.deleted && !location.enabled && !location.stats ? 'is-disabled' : ''}" data-location-path="${escapeHtml(location.path)}">
            <div class="admin-location-icon">${renderMaterialIcon(location.deleted ? 'inventory_2' : 'near_me')}</div>
            <div class="admin-product-main">
                <strong>${escapeHtml(location.name)}</strong>
                <span>${status}</span>
                <span>Folder: <code>${escapeHtml(location.path)}</code></span>
                ${aliases}
            </div>
            <div class="admin-row-actions">
                ${location.deleted ? `
                    <button class="icon-action" type="button" data-action="restore" title="Przywróć punkt">${renderMaterialIcon('restore_from_trash')}</button>
                ` : `
                    ${this.renderSwitch({
                        action: 'toggle-generator',
                        on: location.enabled,
                        icon: location.enabled ? 'visibility' : 'visibility_off',
                        label: 'Generator',
                        title: location.enabled
                            ? 'Widoczny w generatorze — kliknij, żeby ukryć punkt przy tworzeniu listy'
                            : 'Ukryty w generatorze — kliknij, żeby pokazać punkt przy tworzeniu listy'
                    })}
                    ${this.renderSwitch({
                        action: 'toggle-statistics',
                        on: location.stats,
                        icon: location.stats ? 'monitoring' : 'monitoring_off',
                        label: 'Statystyki',
                        title: location.stats
                            ? 'Uwzględniany w statystykach — kliknij, żeby pomijać punkt w obliczeniach'
                            : 'Pomijany w statystykach — kliknij, żeby wliczać punkt w obliczeniach'
                    })}
                    <button class="icon-action" type="button" data-action="edit" title="Zmień nazwę punktu">${renderMaterialIcon('edit')}</button>
                    <button class="icon-action icon-action--danger" type="button" data-action="delete" title="Przenieś punkt do archiwum">${renderMaterialIcon('delete')}</button>
                `}
            </div>
        </div>`;
    }

    renderSwitch({ action, on, icon, label, title }) {
        return `<button class="state-switch state-switch--labelled ${on ? 'is-on' : 'is-off'}" type="button" data-action="${action}" title="${title}" aria-pressed="${on ? 'true' : 'false'}">
            ${renderMaterialIcon(icon)}<span class="state-switch__label">${label}</span>
        </button>`;
    }

    handleInput(event) {
        const form = event.target.closest('form[data-action="add-location"]');
        if (!form) return;
        const nameInput = form.querySelector('input[name="name"]');
        const pathInput = form.querySelector('input[name="path"]');
        // Dopóki człowiek sam nie poprawi folderu, podpowiadamy go z nazwy punktu.
        if (event.target === pathInput) {
            pathInput.dataset.autoFolder = 'false';
            return;
        }
        if (event.target === nameInput && pathInput.dataset.autoFolder !== 'false') {
            pathInput.value = slugifyLocation(nameInput.value);
        }
    }

    async handleSubmit(event) {
        if (event.target.dataset.action !== 'add-location') return;
        event.preventDefault();
        const data = new FormData(event.target);
        const name = String(data.get('name')).trim();
        const path = String(data.get('path')).trim();
        if (!name || !path) return;

        if (this.findConflict(name, path)) {
            return dialogService.warning('Taki punkt (nazwa albo folder) już istnieje w katalogu.', 'Duplikat punktu');
        }

        this.catalog.locations.push({
            name,
            path,
            aliases: [],
            enabled: true,
            deleted: false,
            order: this.catalog.locations.length
        });
        this.markDirty();
        this.render();
    }

    async handleClick(event) {
        if (event.target.closest('#saveLocationsBtn')) return this.save();
        const button = event.target.closest('[data-action]');
        if (!button) return;
        const row = button.closest('[data-location-path]');
        const location = this.findByPath(row?.dataset.locationPath);
        if (!location) return;

        if (button.dataset.action === 'toggle-generator') {
            location.enabled = !location.enabled;
        }

        if (button.dataset.action === 'toggle-statistics') {
            location.stats = !location.stats;
        }

        if (button.dataset.action === 'restore') {
            // Przełączniki zostają takie, jakie były przed archiwizacją.
            location.deleted = false;
        }

        if (button.dataset.action === 'delete') {
            const confirmed = await dialogService.confirm(
                `Przenieść punkt „${location.name}” do archiwum? Zniknie z generatora listy i ze statystyk. Wszystkie jego dane zostaną w database/${location.path} jako archiwum.`,
                'Przenieś punkt do archiwum'
            );
            if (!confirmed) return;
            location.deleted = true;
        }

        if (button.dataset.action === 'edit') {
            const name = await dialogService.prompt('Nowa nazwa punktu', 'Zmień nazwę punktu', { value: location.name });
            if (!name || !name.trim()) return;
            const nextName = name.trim();
            if (normalizeLocationKey(nextName) === normalizeLocationKey(location.name)) return;

            if (this.findConflict(nextName, location.path, location)) {
                return dialogService.warning('Inny punkt w katalogu używa już tej nazwy.', 'Duplikat punktu');
            }

            // Stara nazwa zostaje jako alias, żeby historyczne listy dalej
            // wliczały się do tego samego punktu po zmianie nazwy.
            location.aliases = Array.from(new Set([...location.aliases, location.name]));
            location.name = nextName;
        }

        this.markDirty();
        this.render();
    }

    findConflict(name, path, except = null) {
        const nameKey = normalizeLocationKey(name);
        const pathKey = normalizeLocationKey(path);
        return this.catalog.locations.some(location => {
            if (location === except) return false;
            const keys = [location.name, location.path, ...location.aliases].map(normalizeLocationKey);
            return keys.includes(nameKey) || keys.includes(pathKey);
        });
    }

    findByPath(path) {
        return this.catalog.locations.find(location => location.path === path) || null;
    }

    markDirty() { this.isDirty = this.serialize() !== this.savedSnapshot; }
    serialize() { return JSON.stringify(this.catalog); }
    hasUnsavedChanges() { return this.isDirty; }
    async confirmDiscardChanges() { return !this.isDirty || dialogService.confirm('Masz niezapisane zmiany w punktach. Opuścić stronę bez zapisu?', 'Niezapisane zmiany'); }

    async save() {
        if (!this.isDirty) return;
        const button = this.container.querySelector('#saveLocationsBtn');
        button.disabled = true;
        button.classList.add('is-saving');
        try {
            this.catalog.updatedAt = new Date().toISOString();
            await apiService.saveLocations(this.catalog);
            this.savedSnapshot = this.serialize();
            this.isDirty = false;
            await dialogService.success('Katalog punktów został zapisany.', 'Zapisano');
            this.onSaved?.(this.catalog);
        } catch (error) {
            await dialogService.error(`Nie udało się zapisać punktów. ${error.message}`, 'Błąd zapisu');
        }
        this.render();
    }
}

function sortLocations(locations) {
    return [...locations].sort((left, right) => left.order - right.order);
}

/** Jedno zdanie opisujące oba przełączniki — łatwiej czytać niż dwie ikony. */
function describeVisibility(location) {
    if (location.enabled && location.stats) return 'Widoczny w generatorze i uwzględniany w statystykach';
    if (location.enabled) return 'Widoczny w generatorze · pomijany w statystykach';
    if (location.stats) return 'Ukryty w generatorze · uwzględniany w statystykach';
    return 'Ukryty w generatorze i pomijany w statystykach';
}

export const adminLocations = new AdminLocations();
