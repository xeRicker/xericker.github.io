import { apiService } from './api.js?v=169';

export const PAYMENT_KINDS = [
    { id: 'zus', label: 'ZUS', icon: 'account_balance' },
    { id: 'us', label: 'Urząd skarbowy', icon: 'receipt_long' },
    { id: 'faktura', label: 'Faktura', icon: 'description' },
    { id: 'dostawca', label: 'Dostawca', icon: 'local_shipping' },
    { id: 'kredyt', label: 'Kredyt', icon: 'account_balance_wallet' },
    { id: 'leasing', label: 'Leasing', icon: 'directions_car' },
    { id: 'subskrypcja', label: 'Subskrypcja', icon: 'autorenew' },
    { id: 'pensja', label: 'Wynagrodzenia', icon: 'payments' },
    { id: 'dlug', label: 'Dług', icon: 'money_off' },
    { id: 'inne', label: 'Inne', icon: 'more_horiz' }
];

export const PAYMENT_RECURRENCES = [
    { id: 'one-time', label: 'Jednorazowo' },
    { id: 'weekly', label: 'Co tydzień' },
    { id: 'monthly', label: 'Co miesiąc' },
    { id: 'quarterly', label: 'Co kwartał' },
    { id: 'yearly', label: 'Co rok' }
];

export const PAYMENT_STATUSES = {
    paid: { label: 'Zapłacone', tone: 'is-positive' },
    overdue: { label: 'Przeterminowane', tone: 'is-negative' },
    partial: { label: 'Częściowe', tone: 'is-watch' },
    due: { label: 'Do zapłaty', tone: 'is-neutral' }
};

export const PAYMENT_FILTERS = [
    { id: 'open', label: 'Do zapłaty' },
    { id: 'overdue', label: 'Przeterminowane' },
    { id: 'partial', label: 'Częściowe' },
    { id: 'paid', label: 'Zapłacone' },
    { id: 'all', label: 'Wszystkie' },
    { id: 'archived', label: 'Archiwum' }
];

const DAY_MS = 86400000;

export function createPaymentId(prefix = 'pl') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function toIsoDate(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function normalizePaymentDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim());
    if (!match) return '';
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? '' : toIsoDate(date);
}

export function parsePaymentDate(value) {
    const iso = normalizePaymentDate(value);
    if (!iso) return null;
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
}

export function formatPaymentDate(value) {
    const date = parsePaymentDate(value);
    if (!date) return '—';
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

function normalizePaymentEntry(payment = {}) {
    return {
        id: String(payment.id || createPaymentId('pay')),
        date: normalizePaymentDate(payment.date),
        amount: Math.max(0, Number(payment.amount) || 0),
        note: String(payment.note ?? '').trim()
    };
}

function normalizePaymentsList(items) {
    return (Array.isArray(items) ? items : [])
        .map(normalizePaymentEntry)
        .filter(entry => entry.date && entry.amount > 0);
}

export function normalizePaymentItem(item = {}, index = 0) {
    const title = String(item.title ?? item.name ?? '').trim();
    if (!title) return null;
    return {
        id: String(item.id || createPaymentId('item')),
        title,
        kind: PAYMENT_KINDS.some(entry => entry.id === item.kind) ? item.kind : 'inne',
        contractor: String(item.contractor ?? '').trim(),
        amountTotal: Math.max(0, Number(item.amountTotal ?? item.amount) || 0),
        dueDate: normalizePaymentDate(item.dueDate),
        recurrence: PAYMENT_RECURRENCES.some(entry => entry.id === item.recurrence) ? item.recurrence : 'one-time',
        note: String(item.note ?? '').trim(),
        archived: item.archived === true,
        createdAt: item.createdAt || null,
        order: Number.isFinite(item.order) ? item.order : index,
        payments: normalizePaymentsList(item.payments)
    };
}

export function normalizePaymentsCatalog(input) {
    const source = Array.isArray(input?.items) ? input.items : Array.isArray(input) ? input : [];
    return {
        version: Number(input?.version) || 1,
        updatedAt: input?.updatedAt || null,
        items: source.map((item, index) => normalizePaymentItem(item, index)).filter(Boolean)
    };
}

function resolveStatus({ amountPaid, amountLeft, daysLeft }) {
    if (amountLeft <= 0) return 'paid';
    if (daysLeft !== null && daysLeft < 0) return 'overdue';
    if (amountPaid > 0) return 'partial';
    return 'due';
}

export function derivePayment(item, reference = new Date()) {
    const amountPaid = item.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const amountLeft = Math.max(0, item.amountTotal - amountPaid);
    const dueDateObj = parsePaymentDate(item.dueDate);
    const today = new Date(reference);
    today.setHours(0, 0, 0, 0);
    const daysLeft = dueDateObj ? Math.round((dueDateObj - today) / DAY_MS) : null;
    return {
        ...item,
        amountPaid,
        amountLeft,
        dueDateObj,
        daysLeft,
        status: resolveStatus({ amountPaid, amountLeft, daysLeft }),
        isOpen: amountLeft > 0
    };
}

export function comparePaymentViews(left, right) {
    const leftTime = left.dueDateObj ? left.dueDateObj.getTime() : Infinity;
    const rightTime = right.dueDateObj ? right.dueDateObj.getTime() : Infinity;
    if (leftTime !== rightTime) return leftTime - rightTime;
    return left.order - right.order;
}

export function getPaymentViews(catalog, { includeArchived = false } = {}, reference = new Date()) {
    return normalizePaymentsCatalog(catalog).items
        .filter(item => includeArchived || !item.archived)
        .map(item => derivePayment(item, reference))
        .sort(comparePaymentViews);
}

export function filterPaymentViews(views, { status = 'open', query = '' } = {}) {
    const needle = String(query || '').trim().toLowerCase();
    return views.filter(view => {
        if (status === 'archived') {
            if (!view.archived) return false;
        } else {
            if (view.archived) return false;
            if (status === 'open' && !view.isOpen) return false;
            if (status === 'overdue' && view.status !== 'overdue') return false;
            if (status === 'partial' && view.status !== 'partial') return false;
            if (status === 'paid' && view.status !== 'paid') return false;
        }
        if (!needle) return true;
        return `${view.title} ${view.contractor}`.toLowerCase().includes(needle);
    });
}

export function summarizePayments(views, reference = new Date()) {
    const monthKey = `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, '0')}`;
    const summary = {
        total: 0,
        paid: 0,
        left: 0,
        overdueAmount: 0,
        overdueCount: 0,
        dueSoonAmount: 0,
        dueSoonCount: 0,
        openCount: 0,
        paidCount: 0,
        paidThisMonth: 0
    };

    views.forEach(view => {
        summary.total += view.amountTotal;
        summary.paid += view.amountPaid;
        summary.left += view.amountLeft;
        if (view.status === 'paid') summary.paidCount += 1;
        else summary.openCount += 1;
        if (view.status === 'overdue') {
            summary.overdueAmount += view.amountLeft;
            summary.overdueCount += 1;
        }
        if (view.isOpen && view.daysLeft !== null && view.daysLeft >= 0 && view.daysLeft <= 7) {
            summary.dueSoonAmount += view.amountLeft;
            summary.dueSoonCount += 1;
        }
        view.payments.forEach(payment => {
            if (payment.date.slice(0, 7) === monthKey) summary.paidThisMonth += payment.amount;
        });
    });

    return summary;
}

export function getUpcomingPayments(views, days = 14) {
    return views
        .filter(view => view.isOpen && view.daysLeft !== null && view.daysLeft <= days)
        .sort(comparePaymentViews);
}

export function getPaymentKindLabel(id) {
    return PAYMENT_KINDS.find(entry => entry.id === id)?.label || 'Inne';
}

export function getPaymentKindIcon(id) {
    return PAYMENT_KINDS.find(entry => entry.id === id)?.icon || 'more_horiz';
}

export function getPaymentRecurrenceLabel(id) {
    return PAYMENT_RECURRENCES.find(entry => entry.id === id)?.label || 'Jednorazowo';
}

export function getPaymentStatusLabel(status) {
    return PAYMENT_STATUSES[status]?.label || 'Do zapłaty';
}

export async function loadPaymentsCatalog() {
    return normalizePaymentsCatalog(await apiService.fetchPayments());
}
