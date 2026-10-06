import { escapeHtml } from '../../utils.js';
import {
    PAYMENT_KINDS,
    PAYMENT_RECURRENCES,
    normalizePaymentDate
} from '../../services/payments.js?v=102';
import { dialogService, enhanceCustomControls } from './customControls.js?v=173';
function parseAmount(value) {
    const normalized = String(value ?? '').replace(/\s/g, '').replace(',', '.');
    const amount = Number(normalized);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function ensureDialogLayer() {
    let layer = document.getElementById('paymentsDialogLayer');
    if (layer) return layer;

    layer = document.createElement('div');
    layer.id = 'paymentsDialogLayer';
    layer.className = 'custom-dialog-layer payments-dialog-layer';
    layer.innerHTML = '<div class="custom-dialog payments-dialog" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(layer);
    return layer;
}

export function openPaymentEditDialog(item) {
    const layer = ensureDialogLayer();
    const dialog = layer.querySelector('.payments-dialog');
    const kindOptions = PAYMENT_KINDS.map(kind => `<option value="${kind.id}" data-icon="${kind.icon}">${escapeHtml(kind.label)}</option>`).join('');
    const recurrenceOptions = PAYMENT_RECURRENCES.map(entry => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.label)}</option>`).join('');

    dialog.innerHTML = `
        <h3>Edytuj zobowiązanie</h3>
        <form class="payments-dialog__body">
            <label class="payments-dialog__field payments-dialog__field--wide">
                <span>Nazwa</span>
                <input name="title" class="calc-input" value="${escapeHtml(item.title)}" required>
            </label>
            <label class="payments-dialog__field payments-dialog__field--wide">
                <span>Kontrahent</span>
                <input name="contractor" class="calc-input" value="${escapeHtml(item.contractor)}" placeholder="Opcjonalnie">
            </label>
            <label class="payments-dialog__field">
                <span>Kwota</span>
                <input name="amountTotal" class="calc-input" inputmode="decimal" value="${item.amountTotal.toFixed(2)}" required>
            </label>
            <label class="payments-dialog__field">
                <span>Termin</span>
                <input type="date" name="dueDate" class="calc-input" value="${escapeHtml(item.dueDate)}" required>
            </label>
            <label class="payments-dialog__field">
                <span>Rodzaj</span>
                <select name="kind" class="calc-input">${kindOptions}</select>
            </label>
            <label class="payments-dialog__field">
                <span>Cykliczność</span>
                <select name="recurrence" class="calc-input">${recurrenceOptions}</select>
            </label>
            <label class="payments-dialog__field payments-dialog__field--wide">
                <span>Notatka</span>
                <input name="note" class="calc-input" value="${escapeHtml(item.note)}" placeholder="Opcjonalnie">
            </label>
        </form>
        <div class="custom-dialog__actions">
            <button class="custom-dialog__button" type="button" data-dialog-cancel>Anuluj</button>
            <button class="custom-dialog__button custom-dialog__button--primary" type="button" data-dialog-save>Zapisz zmiany</button>
        </div>
    `;

    const form = dialog.querySelector('.payments-dialog__body');
    form.querySelector('[name="kind"]').value = item.kind;
    form.querySelector('[name="recurrence"]').value = item.recurrence;
    layer.classList.add('is-visible');
    enhanceCustomControls(dialog);

    return new Promise(resolve => {
        const close = value => {
            layer.classList.remove('is-visible');
            dialog.querySelector('[data-dialog-cancel]').removeEventListener('click', onCancel);
            dialog.querySelector('[data-dialog-save]').removeEventListener('click', onSave);
            resolve(value);
        };
        const onCancel = () => close(null);
        const onSave = () => {
            const data = new FormData(form);
            const title = String(data.get('title')).trim();
            const amountTotal = parseAmount(data.get('amountTotal'));
            const dueDate = normalizePaymentDate(data.get('dueDate'));
            if (!title || !amountTotal || !dueDate) {
                dialogService.warning('Podaj nazwę, kwotę i termin zobowiązania.', 'Uzupełnij opłatę');
                return;
            }
            close({
                title,
                amountTotal,
                dueDate,
                kind: String(data.get('kind') || 'inne'),
                recurrence: String(data.get('recurrence') || 'one-time'),
                contractor: String(data.get('contractor') || '').trim(),
                note: String(data.get('note') || '').trim()
            });
        };

        dialog.querySelector('[data-dialog-cancel]').addEventListener('click', onCancel);
        dialog.querySelector('[data-dialog-save]').addEventListener('click', onSave);
    });
}
