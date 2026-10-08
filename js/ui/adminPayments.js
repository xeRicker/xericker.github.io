import { apiService } from '../services/api.js?v=170';
import {
    PAYMENT_FILTERS,
    PAYMENT_KINDS,
    PAYMENT_RECURRENCES,
    PAYMENT_STATUSES,
    createPaymentId,
    derivePayment,
    filterPaymentViews,
    formatPaymentDate,
    getPaymentKindIcon,
    getPaymentKindLabel,
    getPaymentRecurrenceLabel,
    getPaymentViews,
    loadPaymentsCatalog,
    normalizePaymentDate,
    normalizePaymentsCatalog,
    summarizePayments,
    toIsoDate
} from '../services/payments.js?v=103';
import { escapeHtml, formatMoney, renderMaterialIcon } from '../utils.js';
import { dialogService, enhanceCustomControls } from './components/customControls.js?v=173';
import { noticeService } from './components/notice.js?v=102';
import { openPaymentEditDialog } from './components/paymentEditDialog.js?v=2';
import { loadSettings, normalizeSettings, saveSettings } from '../services/settings.js?v=1';

function parseAmount(value) {
    const normalized = String(value ?? '').replace(/\s/g, '').replace(',', '.');
    const amount = Number(normalized);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function plural(count, one, few, many) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (count === 1) return one;
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
    return many;
}

class AdminPayments {
    constructor() {
        this.catalog = normalizePaymentsCatalog();
        this.settings = normalizeSettings();
        this.container = null;
        this.savedSnapshot = '';
        this.savedSettingsSnapshot = '';
        this.isDirty = false;
        this.filterStatus = 'open';
        this.query = '';
        this.onSaved = null;
        this.onSettingsSaved = null;
    }

    async init(container) {
        this.container = container;
        this.catalog = await loadPaymentsCatalog();
        this.settings = await loadSettings();
        this.savedSnapshot = this.serialize();
        this.savedSettingsSnapshot = this.serializeSettings();
        this.render();
        this.container.addEventListener('click', event => this.handleClick(event));
        this.container.addEventListener('submit', event => this.handleSubmit(event));
        this.container.addEventListener('input', event => this.handleInput(event));
        this.container.addEventListener('change', event => this.handleInput(event));
    }

    getCatalog() {
        return this.catalog;
    }

    getSettings() {
        return this.settings;
    }

    render() {
        const summary = summarizePayments(getPaymentViews(this.catalog));
        this.container.innerHTML = `
            <div class="admin-products-head">
                <div class="section-heading">
                    <h3><span class="material-symbols-rounded" aria-hidden="true">receipt_long</span> Opłaty</h3>
                </div>
                <button id="savePaymentsBtn" class="btn-back admin-save-btn ${this.isDirty ? 'has-unsaved-changes' : 'is-clean'}" type="button" ${this.isDirty ? '' : 'disabled'}>
                    <span class="material-symbols-rounded" aria-hidden="true">save</span> Zapisz
                </button>
            </div>
            ${this.buildTargetSettings()}
            ${this.buildSummary(summary)}
            ${this.buildForm()}
            ${this.buildToolbar()}
            <div id="paymentsList" class="payments-list"></div>
        `;
        this.renderList();
        enhanceCustomControls(this.container);
    }

    buildTargetSettings() {
        const target = this.settings.dailyRevenueTarget;
        return `
            <div class="payments-target">
                <label class="payments-field" for="revenueTargetInput">
                    <span>${renderMaterialIcon('trending_up')} Próg średniego utargu</span>
                    <div class="rate-input-wrapper">
                        <input id="revenueTargetInput" class="payments-target__input" inputmode="decimal" placeholder="np. 2000" value="${target ? escapeHtml(String(target).replace('.', ',')) : ''}" aria-label="Próg średniego utargu dnia w złotych">
                        <span>PLN</span>
                    </div>
                </label>
            </div>
        `;
    }

    buildSummary(summary) {
        return `
            <div class="payments-summary">
                ${this.buildTile('Do zapłaty', formatMoney(summary.left), `${summary.openCount} ${plural(summary.openCount, 'otwarta', 'otwarte', 'otwartych')}`, '')}
                ${this.buildTile('Przeterminowane', formatMoney(summary.overdueAmount), `${summary.overdueCount} ${plural(summary.overdueCount, 'pozycja', 'pozycje', 'pozycji')}`, summary.overdueCount ? 'is-negative' : '')}
                ${this.buildTile('Do 7 dni', formatMoney(summary.dueSoonAmount), `${summary.dueSoonCount} ${plural(summary.dueSoonCount, 'pozycja', 'pozycje', 'pozycji')}`, summary.dueSoonCount ? 'is-watch' : '')}
                ${this.buildTile('Zapłacone', formatMoney(summary.paidThisMonth), 'w tym miesiącu', 'is-positive')}
            </div>
        `;
    }

    buildTile(label, value, hint, tone) {
        return `
            <div class="payment-tile ${tone}">
                <span class="payment-tile__label">${escapeHtml(label)}</span>
                <strong class="payment-tile__value">${escapeHtml(value)}</strong>
                <span class="payment-tile__hint">${escapeHtml(hint)}</span>
            </div>
        `;
    }

    buildForm() {
        const kindOptions = PAYMENT_KINDS.map(kind => `<option value="${kind.id}" data-icon="${kind.icon}">${escapeHtml(kind.label)}</option>`).join('');
        const recurrenceOptions = PAYMENT_RECURRENCES.map(entry => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.label)}</option>`).join('');
        return `
            <form class="payments-add-form" data-action="add-payment">
                <label class="payments-field payments-field--wide">
                    <span>Nazwa</span>
                    <input name="title" class="calc-input" placeholder="np. ZUS luty" aria-label="Nazwa zobowiązania" required>
                </label>
                <label class="payments-field">
                    <span>Kontrahent</span>
                    <input name="contractor" class="calc-input" placeholder="Opcjonalnie" aria-label="Kontrahent">
                </label>
                <label class="payments-field">
                    <span>Kwota</span>
                    <input name="amountTotal" class="calc-input" inputmode="decimal" placeholder="0,00" aria-label="Kwota zobowiązania" required>
                </label>
                <label class="payments-field">
                    <span>Termin</span>
                    <input type="date" name="dueDate" class="calc-input" aria-label="Termin płatności" required>
                </label>
                <label class="payments-field">
                    <span>Rodzaj</span>
                    <select name="kind" class="calc-input" aria-label="Rodzaj opłaty">${kindOptions}</select>
                </label>
                <label class="payments-field">
                    <span>Cykliczność</span>
                    <select name="recurrence" class="calc-input" aria-label="Cykliczność opłaty">${recurrenceOptions}</select>
                </label>
                <label class="payments-field payments-field--wide">
                    <span>Notatka</span>
                    <input name="note" class="calc-input" placeholder="Opcjonalnie" aria-label="Notatka do opłaty">
                </label>
                <button class="chart-btn active payments-add-btn" type="submit">+ Nowe zobowiązanie</button>
            </form>
        `;
    }

    buildToolbar() {
        const options = PAYMENT_FILTERS.map(filter => `<option value="${filter.id}" ${filter.id === this.filterStatus ? 'selected' : ''}>${escapeHtml(filter.label)}</option>`).join('');
        return `
            <div class="payments-toolbar">
                <label class="payments-field">
                    <span>Status</span>
                    <select id="paymentsStatusFilter" class="calc-input" aria-label="Filtr statusu opłat">${options}</select>
                </label>
                <label class="payments-field payments-field--wide">
                    <span>Szukaj</span>
                    <input id="paymentsSearchInput" type="search" class="calc-input" placeholder="Nazwa lub kontrahent" value="${escapeHtml(this.query)}" aria-label="Szukaj opłaty">
                </label>
            </div>
        `;
    }

    renderList() {
        const list = this.container.querySelector('#paymentsList');
        if (!list) return;
        const views = filterPaymentViews(
            getPaymentViews(this.catalog, { includeArchived: true }),
            { status: this.filterStatus, query: this.query }
        );

        list.innerHTML = views.length
            ? views.map(view => this.renderItem(view)).join('')
            : `<div class="payments-empty">Brak zobowiązań dla wybranych filtrów.</div>`;
    }

    renderItem(view) {
        const status = PAYMENT_STATUSES[view.status] || PAYMENT_STATUSES.due;
        const progress = view.amountTotal ? Math.min(100, (view.amountPaid / view.amountTotal) * 100) : 0;
        const done = view.archived || !view.isOpen;

        return `
            <div class="payment-row ${view.archived ? 'is-archived' : ''}" data-payment-id="${escapeHtml(view.id)}">
                <div class="payment-row__head">
                    <div class="payment-row__title">
                        <strong>${escapeHtml(view.title)}</strong>
                        <span class="payment-kind">${renderMaterialIcon(getPaymentKindIcon(view.kind))}${escapeHtml(getPaymentKindLabel(view.kind))}${view.contractor ? ` · ${escapeHtml(view.contractor)}` : ''}</span>
                    </div>
                    <span class="payment-badge ${status.tone}">${escapeHtml(status.label)}</span>
                </div>
                <div class="payment-row__money">
                    <strong>${formatMoney(view.amountLeft)}</strong>
                    <span>z ${formatMoney(view.amountTotal)}</span>
                </div>
                <div class="payment-progress" role="presentation"><span style="width:${progress}%"></span></div>
                <div class="payment-row__meta">
                    <span class="payment-due ${view.status === 'overdue' ? 'is-negative' : ''} ${view.status === 'partial' ? 'is-watch' : ''}">${escapeHtml(this.buildDueLabel(view))}</span>
                    ${view.recurrence !== 'one-time' ? `<span class="payment-recur">${escapeHtml(getPaymentRecurrenceLabel(view.recurrence))}</span>` : ''}
                    ${view.note ? `<span class="payment-note">${renderMaterialIcon('sticky_note_2')}${escapeHtml(view.note)}</span>` : ''}
                </div>
                <div class="payment-row__actions">
                    ${done ? '' : `
                        <button class="btn-back payment-action" type="button" data-action="pay">+ Wpłata</button>
                        <button class="btn-back payment-action payment-action--primary" type="button" data-action="settle">Zapłacone</button>
                    `}
                    <button class="btn-back payment-action" type="button" data-action="edit">Edytuj</button>
                    <button class="btn-back payment-action" type="button" data-action="${view.archived ? 'restore' : 'archive'}">${view.archived ? 'Przywróć' : 'Archiwizuj'}</button>
                    <button class="btn-back payment-action payment-action--danger" type="button" data-action="delete">Usuń</button>
                </div>
            </div>
        `;
    }

    buildDueLabel(view) {
        if (!view.dueDateObj) return 'Bez terminu';
        const date = formatPaymentDate(view.dueDate);
        if (view.status === 'paid') return `Termin ${date}`;
        if (view.daysLeft < 0) return `Termin ${date} · ${Math.abs(view.daysLeft)} dni po terminie`;
        if (view.daysLeft === 0) return `Termin ${date} · dziś`;
        return `Termin ${date}`;
    }

    handleInput(event) {
        if (event.target.id === 'paymentsStatusFilter') {
            this.filterStatus = event.target.value;
            this.renderList();
            return;
        }
        if (event.target.id === 'paymentsSearchInput') {
            this.query = event.target.value;
            this.renderList();
            return;
        }
        if (event.target.id === 'revenueTargetInput') {
            this.settings.dailyRevenueTarget = parseAmount(event.target.value);
            this.markDirty();
        }
    }

    async handleSubmit(event) {
        if (event.target.dataset.action !== 'add-payment') return;
        event.preventDefault();
        const data = new FormData(event.target);
        const title = String(data.get('title')).trim();
        const amountTotal = parseAmount(data.get('amountTotal'));
        const dueDate = normalizePaymentDate(data.get('dueDate'));
        if (!title || !amountTotal || !dueDate) {
            return dialogService.warning('Podaj nazwę, kwotę i termin zobowiązania.', 'Uzupełnij opłatę');
        }

        if (action === 'add-payment') {
            this.catalog.items.push({
                id: createPaymentId('item'),
                title,
                kind: String(data.get('kind') || 'inne'),
                contractor: String(data.get('contractor') || '').trim(),
                amountTotal,
                dueDate,
                recurrence: String(data.get('recurrence') || 'one-time'),
                note: String(data.get('note') || '').trim(),
                archived: false,
                createdAt: new Date().toISOString(),
                order: this.catalog.items.length,
                payments: []
            });
            this.markDirty();
            this.render();
        }
    }

    async handleClick(event) {
        if (event.target.closest('#savePaymentsBtn')) return this.save();
        const button = event.target.closest('[data-action]');
        if (!button) return;
        const row = button.closest('[data-payment-id]');
        const item = this.catalog.items.find(entry => entry.id === row?.dataset.paymentId);
        if (!item) return;

        const action = button.dataset.action;
        let changed = true;
        if (action === 'pay') changed = await this.addPayment(item);
        else if (action === 'settle') changed = await this.settle(item);
        else if (action === 'edit') changed = await this.editItem(item);
        else if (action === 'archive') changed = await this.setArchived(item, true);
        else if (action === 'restore') changed = await this.setArchived(item, false);
        else if (action === 'delete') changed = await this.deleteItem(item);
        else changed = false;

        if (!changed) return;
        this.markDirty();
        this.render();
    }

    async addPayment(item) {
        const view = derivePayment(item);
        const value = await dialogService.prompt('Kwota wpłaty', 'Dodaj wpłatę', {
            value: view.amountLeft.toFixed(2),
            inputmode: 'decimal',
            label: 'Kwota'
        });
        if (value === null) return false;
        const amount = parseAmount(value);
        if (!amount) return false;
        item.payments.push({ id: createPaymentId('pay'), date: toIsoDate(new Date()), amount, note: '' });
        if (item.recurrence !== 'one-time') await this.advanceRecurring(item);
        return true;
    }

    async settle(item) {
        const view = derivePayment(item);
        const confirmed = await dialogService.confirm(
            `Oznaczyć „${item.title}” jako zapłacone? Dopiszę wpłatę ${formatMoney(view.amountLeft)} z dzisiejszą datą.`,
            'Oznacz jako zapłacone'
        );
        if (!confirmed) return false;
        item.payments.push({ id: createPaymentId('pay'), date: toIsoDate(new Date()), amount: view.amountLeft, note: 'spłata' });
        if (item.recurrence !== 'one-time') await this.advanceRecurring(item);
        return true;
    }

    async advanceRecurring(item) {
        const next = this.getNextDueDate(item.dueDate, item.recurrence);
        if (!next) return;
        const createNext = await dialogService.confirm(
            `To opłata cykliczna. Utworzyć kolejny termin na ${formatPaymentDate(next)}?`,
            'Kolejny termin'
        );
        if (!createNext) return;
        this.catalog.items.push({
            ...item,
            id: createPaymentId('item'),
            dueDate: next,
            createdAt: new Date().toISOString(),
            order: this.catalog.items.length,
            payments: []
        });
    }

    getNextDueDate(dueDate, recurrence) {
        const date = new Date(dueDate);
        if (Number.isNaN(date.getTime())) return '';
        if (recurrence === 'weekly') date.setDate(date.getDate() + 7);
        else if (recurrence === 'monthly') date.setMonth(date.getMonth() + 1);
        else if (recurrence === 'quarterly') date.setMonth(date.getMonth() + 3);
        else if (recurrence === 'yearly') date.setFullYear(date.getFullYear() + 1);
        else return '';
        return toIsoDate(date);
    }

    async editItem(item) {
        const values = await openPaymentEditDialog(item);
        if (!values) return false;
        item.title = values.title;
        item.amountTotal = values.amountTotal;
        item.dueDate = values.dueDate;
        item.kind = values.kind;
        item.recurrence = values.recurrence;
        item.contractor = values.contractor;
        item.note = values.note;
        return true;
    }

    async deleteItem(item) {
        const view = derivePayment(item);
        const paidNote = view.amountPaid > 0 ? ` Historia wpłat (${formatMoney(view.amountPaid)}) też zostanie usunięta.` : '';
        const confirmed = await dialogService.confirm(
            `Usunąć trwale „${item.title}” z listy opłat?${paidNote}`,
            'Usuń opłatę'
        );
        if (!confirmed) return false;
        this.catalog.items = this.catalog.items.filter(entry => entry.id !== item.id);
        return true;
    }

    async setArchived(item, archived) {
        if (archived) {
            const confirmed = await dialogService.confirm(
                `Zarchiwizować „${item.title}”? Historia wpłat zostanie zachowana.`,
                'Archiwizuj zobowiązanie'
            );
            if (!confirmed) return false;
        }
        item.archived = archived;
        return true;
    }

    markDirty() {
        this.isDirty = this.serialize() !== this.savedSnapshot || this.serializeSettings() !== this.savedSettingsSnapshot;
        this.updateSaveButton();
    }

    updateSaveButton() {
        const button = this.container?.querySelector('#savePaymentsBtn');
        if (!button) return;
        button.disabled = !this.isDirty;
        button.classList.toggle('has-unsaved-changes', this.isDirty);
        button.classList.toggle('is-clean', !this.isDirty);
    }

    serialize() { return JSON.stringify(this.catalog); }
    serializeSettings() { return JSON.stringify(this.settings); }
    hasUnsavedChanges() { return this.isDirty; }
    async confirmDiscardChanges() { return !this.isDirty || dialogService.confirm('Masz niezapisane zmiany na stronie opłat. Opuścić stronę bez zapisu?', 'Niezapisane zmiany'); }

    async save() {
        if (!this.isDirty) return;
        const button = this.container.querySelector('#savePaymentsBtn');
        button.disabled = true;
        button.classList.add('is-saving');
        const saved = { catalog: false, settings: false };
        try {
            if (this.serialize() !== this.savedSnapshot) {
                this.catalog.updatedAt = new Date().toISOString();
                await apiService.savePayments(this.catalog);
                this.savedSnapshot = this.serialize();
                this.onSaved?.(this.catalog);
                saved.catalog = true;
            }
            if (this.serializeSettings() !== this.savedSettingsSnapshot) {
                this.settings = await saveSettings(this.settings);
                this.savedSettingsSnapshot = this.serializeSettings();
                this.onSettingsSaved?.(this.settings);
                saved.settings = true;
            }
            noticeService.toast({ variant: 'success', text: this.buildSaveMessage(saved) });
        } catch (error) {
            await dialogService.error(error.message, 'Nie udało się zapisać');
        }
        button.classList.remove('is-saving');
        this.markDirty();
        this.render();
    }

    buildSaveMessage(saved) {
        if (saved.catalog && saved.settings) return 'Zapisano opłaty i próg średniego utargu.';
        if (saved.settings) return 'Zapisano próg średniego utargu.';
        return 'Opłaty zostały zapisane.';
    }
}

export const adminPayments = new AdminPayments();
