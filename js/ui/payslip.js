import { formatMoney, parseLocalDateInput } from '../utils.js';
import { refreshCustomControls } from './components/customControls.js?v=72';
import { noticeService } from './components/notice.js?v=1';
import { DEFAULT_MONTH_HOURS } from './payrollCalculator.js?v=64';

const WIDTH = 1000;
const SCALE = 2;
const PAD = 56;
const CONTENT = WIDTH - PAD * 2;
const GAP = 24;
const FONT = '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif';

/**
 * Wires the admin "PASEK" button: renders the calculator summary to a PNG and
 * opens it in a new tab. All drawing lives here so the admin page stays thin.
 */
export function setupPayslipGenerator(config) {
    const {
        getSummary,
        buttonId,
        statusBoxId,
        paymentFormId,
        paymentDateId,
        logoUrl = 'favicon.png',
        resolveEmployeeName = name => name
    } = config;

    const button = document.getElementById(buttonId);
    const statusBox = document.getElementById(statusBoxId);
    const formSelect = document.getElementById(paymentFormId);
    const dateInput = document.getElementById(paymentDateId);
    if (!button) return { syncDefaults() {}, refresh() {} };

    const scope = () => dateInput?.closest('.calc-card, .worker-card, .section-card') || document;
    let dateTouched = false;
    let generating = false;

    const showStatus = (variant, text, showBar = false) => {
        noticeService.render(statusBox, { variant, text, showBar, className: 'calc-payslip-status' });
    };
    const clearStatus = () => noticeService.render(statusBox, {});

    const syncDefaults = summary => {
        if (dateTouched || !summary?.dateTo || !dateInput) return;
        dateInput.value = toInputValue(defaultPaymentDate(summary.dateTo));
        refreshCustomControls(scope());
    };

    dateInput?.addEventListener('input', () => { dateTouched = true; });
    formSelect?.addEventListener('change', clearStatus);

    button.addEventListener('click', async () => {
        if (generating) return;
        clearStatus();

        const summary = getSummary?.();
        if (!summary) {
            showStatus('warning', 'Wybierz pracownika i zakres dat, żeby wygenerować pasek.');
            return;
        }
        if (!summary.shiftCount) {
            showStatus('warning', 'Brak zmian w wybranym okresie.');
            return;
        }

        const paymentForm = formSelect?.value || 'Przelew';
        const paymentDate = parseLocalDateInput(dateInput?.value) || defaultPaymentDate(summary.dateTo);

        const previewWindow = window.open('', '_blank');
        if (!previewWindow) {
            showStatus('danger', 'Przeglądarka zablokowała nową kartę. Zezwól na wyskakujące okna dla tej strony.');
            return;
        }
        writePlaceholder(previewWindow, readPalette());

        generating = true;
        button.disabled = true;
        showStatus('loading', 'Generowanie paska wypłaty...', true);

        try {
            const data = buildPayslipData(summary, {
                employeeName: resolveEmployeeName(summary.name),
                paymentForm,
                paymentDate
            });
            const canvas = await renderPayslipCanvas(data, { logoUrl });
            const url = URL.createObjectURL(await canvasToBlob(canvas));
            previewWindow.location.replace(url);
            setTimeout(() => URL.revokeObjectURL(url), 120000);
            showStatus('success', `Pasek gotowy: ${data.employeeName}, ${formatMoney(data.totalAmount)}.`);
        } catch (error) {
            console.error('Payslip generation failed.', error);
            previewWindow.close();
            showStatus('danger', 'Nie udało się wygenerować paska. Spróbuj ponownie.');
        } finally {
            generating = false;
            button.disabled = false;
        }
    });

    return { syncDefaults, refresh: syncDefaults };
}

export function buildPayslipData(summary, { employeeName, paymentForm, paymentDate, generatedAt = new Date() }) {
    return {
        employeeName,
        periodFrom: summary.dateFrom,
        periodTo: summary.dateTo,
        rate: summary.rate,
        totalHours: summary.totalHours,
        totalAmount: summary.totalAmount,
        shifts: summary.breakdown,
        shiftCount: summary.breakdown.length,
        locations: Object.entries(summary.locationHours || {}).sort((left, right) => right[1] - left[1]),
        paymentForm,
        paymentDate,
        generatedAt
    };
}

export async function renderPayslipCanvas(data, { logoUrl = 'favicon.png' } = {}) {
    const palette = readPalette();
    const logo = await loadImage(logoUrl).catch(() => null);
    const layout = buildLayout(data);
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH * SCALE;
    canvas.height = layout.height * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);
    paintBackground(ctx, palette, layout.height);
    paintHeader(ctx, data, palette, logo, layout.header);
    paintHero(ctx, data, palette, layout.hero);
    paintStats(ctx, data, palette, layout.stats);
    paintLocations(ctx, data, palette, layout.locations);
    paintShifts(ctx, data, palette, layout.shifts);
    paintFooter(ctx, data, palette, layout.footer);
    return canvas;
}

function buildLayout(data) {
    const locationRows = Math.max(1, data.locations.length);
    const shiftRows = Math.max(1, data.shifts.length);
    let y = 54;
    const header = { y, height: 128 };
    y += header.height + GAP;
    const hero = { y, height: 168 };
    y += hero.height + GAP;
    const stats = { y, height: 104 };
    y += stats.height + GAP;
    const locations = { y, height: 54 + locationRows * 40 + 8 };
    y += locations.height + GAP;
    const shifts = { y, height: 56 + 46 + shiftRows * 42 + 16 };
    y += shifts.height + GAP;
    const footer = { y, height: 120 };
    y += footer.height + 74;
    return { height: y, header, hero, stats, locations, shifts, footer };
}

function paintBackground(ctx, palette, height) {
    const base = ctx.createLinearGradient(0, 0, WIDTH, height);
    base.addColorStop(0, palette.bg);
    base.addColorStop(1, palette.surface);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, WIDTH, height);

    const glow = ctx.createRadialGradient(WIDTH - 60, 20, 20, WIDTH - 60, 20, 560);
    glow.addColorStop(0, withAlpha(palette.primary, 0.26));
    glow.addColorStop(1, withAlpha(palette.primary, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, 520);

    ctx.fillStyle = palette.primary;
    ctx.fillRect(0, 0, WIDTH, 10);
}

function paintHeader(ctx, data, palette, logo, box) {
    const logoSize = 92;
    if (logo) {
        ctx.save();
        roundRect(ctx, PAD, box.y, logoSize, logoSize, 20);
        ctx.clip();
        ctx.fillStyle = palette.raised;
        ctx.fillRect(PAD, box.y, logoSize, logoSize);
        ctx.drawImage(logo, PAD, box.y, logoSize, logoSize);
        ctx.restore();
        roundRect(ctx, PAD, box.y, logoSize, logoSize, 20);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = withAlpha(palette.primary, 0.55);
        ctx.stroke();
    }

    const textX = PAD + logoSize + 26;
    drawText(ctx, 'BURBONE', textX, box.y + 48, { font: `800 44px ${FONT}`, color: palette.text, spacing: '1px' });
    drawText(ctx, 'PASEK WYPŁATY', textX, box.y + 82, { font: `600 17px ${FONT}`, color: palette.primary, spacing: '4px' });

    label(ctx, 'OKRES ROZLICZENIOWY', WIDTH - PAD, box.y + 22, palette, { align: 'right' });
    drawText(ctx, formatPeriod(data.periodFrom, data.periodTo), WIDTH - PAD, box.y + 56, {
        font: `600 22px ${FONT}`, color: palette.text, align: 'right'
    });
    drawText(ctx, `${data.shiftCount} ${pluralDays(data.shiftCount)}`, WIDTH - PAD, box.y + 86, {
        font: `400 15px ${FONT}`, color: palette.textMuted, align: 'right'
    });
}

function paintHero(ctx, data, palette, box) {
    roundRect(ctx, PAD, box.y, CONTENT, box.height, 22);
    ctx.fillStyle = palette.surface;
    ctx.fill();
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    const split = PAD + CONTENT * 0.58;
    ctx.beginPath();
    ctx.moveTo(split, box.y + 28);
    ctx.lineTo(split, box.y + box.height - 28);
    ctx.strokeStyle = palette.border;
    ctx.stroke();

    label(ctx, 'PRACOWNIK', PAD + 28, box.y + 48, palette);
    drawText(ctx, data.employeeName, PAD + 28, box.y + 98, {
        font: `800 38px ${FONT}`, color: palette.text, maxWidth: split - PAD - 60
    });
    drawText(ctx, `Stawka ${formatMoney(data.rate)} / h`, PAD + 28, box.y + 134, {
        font: `400 16px ${FONT}`, color: palette.textSecondary
    });

    label(ctx, 'DO WYPŁATY', split + 28, box.y + 48, palette, { color: palette.primary });
    drawText(ctx, formatMoney(data.totalAmount), split + 28, box.y + 104, {
        font: `800 46px ${FONT}`, color: palette.primary, maxWidth: WIDTH - PAD - split - 56
    });
    drawText(ctx, `${formatHours(data.totalHours)} • ${data.shiftCount} ${pluralDays(data.shiftCount)}`, split + 28, box.y + 138, {
        font: `400 15px ${FONT}`, color: palette.textMuted
    });
}

function paintStats(ctx, data, palette, box) {
    const gap = 16;
    const tileWidth = (CONTENT - gap * 3) / 4;
    const percent = (data.totalHours / DEFAULT_MONTH_HOURS) * 100;
    const tiles = [
        ['STAWKA', formatNumber(data.rate, 2), 'zł / h'],
        ['GODZINY', formatNumber(data.totalHours, 1), 'h'],
        ['DNI PRACY', String(data.shiftCount), ''],
        ['% ETATU', formatNumber(percent, 1), '%']
    ];

    tiles.forEach(([title, value, suffix], index) => {
        const x = PAD + index * (tileWidth + gap);
        roundRect(ctx, x, box.y, tileWidth, box.height, 18);
        ctx.fillStyle = palette.raised;
        ctx.fill();
        ctx.strokeStyle = palette.border;
        ctx.stroke();

        label(ctx, title, x + 20, box.y + 34, palette);
        drawText(ctx, value, x + 20, box.y + 76, {
            font: `800 28px ${FONT}`, color: palette.text, maxWidth: tileWidth - 40
        });
        if (suffix) {
            drawText(ctx, suffix, x + tileWidth - 20, box.y + 76, {
                font: `400 14px ${FONT}`, color: palette.textMuted, align: 'right'
            });
        }
    });
}

function paintLocations(ctx, data, palette, box) {
    roundRect(ctx, PAD, box.y, CONTENT, box.height, 18);
    ctx.fillStyle = palette.surface;
    ctx.fill();
    ctx.strokeStyle = palette.border;
    ctx.stroke();

    drawText(ctx, 'MIEJSCA PRACY', PAD + 24, box.y + 36, {
        font: `700 15px ${FONT}`, color: palette.text, spacing: '1.5px'
    });

    if (!data.locations.length) {
        drawText(ctx, 'Brak zmian w wybranym okresie', PAD + 24, box.y + 80, {
            font: `400 15px ${FONT}`, color: palette.textMuted
        });
        return;
    }

    const maxHours = Math.max(...data.locations.map(([, hours]) => hours));
    const nameMax = CONTENT * 0.42;
    const barX = PAD + CONTENT * 0.52;
    const barWidth = CONTENT * 0.28;
    const hoursX = PAD + CONTENT - 24;
    data.locations.forEach(([location, hours], index) => {
        const rowY = box.y + 54 + index * 40 + 20;
        drawText(ctx, location, PAD + 24, rowY, {
            font: `600 16px ${FONT}`, color: palette.text, baseline: 'middle', maxWidth: nameMax
        });
        roundRect(ctx, barX, rowY - 5, barWidth, 10, 5);
        ctx.fillStyle = palette.raised;
        ctx.fill();
        if (maxHours > 0) {
            roundRect(ctx, barX, rowY - 5, Math.max(6, barWidth * (hours / maxHours)), 10, 5);
            ctx.fillStyle = palette.primary;
            ctx.fill();
        }
        drawText(ctx, `${formatHours(hours)}  ·  ${Math.round((hours / data.totalHours) * 100)}%`, hoursX, rowY, {
            font: `600 15px ${FONT}`, color: palette.textSecondary, align: 'right', baseline: 'middle'
        });
    });
}

function paintShifts(ctx, data, palette, box) {
    roundRect(ctx, PAD, box.y, CONTENT, box.height, 18);
    ctx.fillStyle = palette.surface;
    ctx.fill();
    ctx.strokeStyle = palette.border;
    ctx.stroke();

    drawText(ctx, 'SZCZEGÓŁY WYPŁATY', PAD + 24, box.y + 36, {
        font: `700 15px ${FONT}`, color: palette.text, spacing: '1.5px'
    });

    const headerY = box.y + 56 + 30;
    const dateX = PAD + 24;
    const locationX = PAD + 168;
    const shiftX = PAD + 408;
    const hoursX = PAD + CONTENT - 240;
    const amountX = PAD + CONTENT - 24;

    label(ctx, 'DATA', dateX, headerY, palette);
    label(ctx, 'MIEJSCE', locationX, headerY, palette);
    label(ctx, 'ZMIANA', shiftX, headerY, palette);
    label(ctx, 'GODZINY', hoursX, headerY, palette, { align: 'right' });
    label(ctx, 'KWOTA', amountX, headerY, palette, { align: 'right' });

    const dividerY = box.y + 56 + 46;
    ctx.beginPath();
    ctx.moveTo(PAD + 1, dividerY);
    ctx.lineTo(PAD + CONTENT - 1, dividerY);
    ctx.strokeStyle = palette.border;
    ctx.stroke();

    if (!data.shifts.length) {
        drawText(ctx, 'Brak zmian w wybranym okresie', dateX, dividerY + 40, {
            font: `400 15px ${FONT}`, color: palette.textMuted
        });
        return;
    }

    data.shifts.forEach((shift, index) => {
        const rowTop = dividerY + index * 42;
        if (index % 2 === 1) {
            ctx.fillStyle = withAlpha(palette.raised, 0.55);
            ctx.fillRect(PAD + 1, rowTop, CONTENT - 2, 42);
        }
        const rowY = rowTop + 27;
        drawText(ctx, shift.date, dateX, rowY, { font: `400 14px ${FONT}`, color: palette.textSecondary, baseline: 'middle' });
        drawText(ctx, shift.location, locationX, rowY, {
            font: `600 14px ${FONT}`, color: palette.text, baseline: 'middle', maxWidth: shiftX - locationX - 20
        });
        drawText(ctx, shift.shift, shiftX, rowY, {
            font: `400 14px ${FONT}`, color: palette.textSecondary, baseline: 'middle', maxWidth: hoursX - shiftX - 40
        });
        drawText(ctx, formatHours(shift.hours), hoursX, rowY, {
            font: `600 14px ${FONT}`, color: palette.text, align: 'right', baseline: 'middle'
        });
        drawText(ctx, formatMoney(shift.amount), amountX, rowY, {
            font: `700 14px ${FONT}`, color: palette.text, align: 'right', baseline: 'middle'
        });
    });
}

function paintFooter(ctx, data, palette, box) {
    roundRect(ctx, PAD, box.y, CONTENT, box.height, 18);
    ctx.fillStyle = withAlpha(palette.primary, 0.09);
    ctx.fill();
    ctx.strokeStyle = withAlpha(palette.primary, 0.36);
    ctx.stroke();

    const third = CONTENT / 3;
    const items = [
        ['FORMA WYPŁATY', data.paymentForm, true],
        ['TERMIN WYPŁATY', formatDate(data.paymentDate), false],
        ['DATA WYSTAWIENIA', formatDate(data.generatedAt), false]
    ];
    items.forEach(([title, value, accent], index) => {
        const x = PAD + 28 + index * third;
        label(ctx, title, x, box.y + 48, palette);
        drawText(ctx, value, x, box.y + 86, {
            font: `700 22px ${FONT}`, color: accent ? palette.primary : palette.text, maxWidth: third - 40
        });
    });

    drawText(ctx, 'Dokument wygenerowany automatycznie przez system Burbone.', WIDTH / 2, box.y + box.height + 44, {
        font: `400 13px ${FONT}`, color: palette.textMuted, align: 'center'
    });
}

function label(ctx, value, x, y, palette, { align = 'left', color } = {}) {
    drawText(ctx, value, x, y, {
        font: `600 13px ${FONT}`, color: color || palette.textMuted, align, spacing: '1.5px'
    });
}

function drawText(ctx, value, x, y, options = {}) {
    const {
        font = `400 16px ${FONT}`,
        color = '#ffffff',
        align = 'left',
        baseline = 'alphabetic',
        maxWidth = 0,
        spacing = '0px'
    } = options;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.letterSpacing = spacing;
    const text = maxWidth ? truncateText(ctx, String(value), maxWidth) : String(value);
    ctx.fillText(text, x, y);
}

function truncateText(ctx, value, maxWidth) {
    if (ctx.measureText(value).width <= maxWidth) return value;
    let result = value;
    while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
        result = result.slice(0, -1);
    }
    return `${result}…`;
}

function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
}

function readPalette() {
    const token = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
    return {
        bg: token('--bg-color', '#151312'),
        surface: token('--surface-color', '#1F1B19'),
        raised: token('--surface-raised', '#28221F'),
        border: token('--border-color', 'rgba(255, 244, 238, 0.14)'),
        primary: token('--primary-color', '#D4521A'),
        text: token('--text-primary', '#F2ECE8'),
        textSecondary: token('--text-secondary', '#C8BAB3'),
        textMuted: token('--text-muted', '#94847C')
    };
}

function withAlpha(color, alpha) {
    const value = String(color).trim();
    if (value.startsWith('#')) {
        const hex = value.slice(1);
        const full = hex.length === 3 ? hex.split('').map(char => char + char).join('') : hex;
        const num = parseInt(full, 16);
        return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
    }
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (match) {
        const [r, g, b] = match[1].split(',').map(Number);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return value;
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Unable to load ${src}`));
        image.src = src;
    });
}

function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas export failed.')), 'image/png');
    });
}

function writePlaceholder(previewWindow, palette) {
    try {
        previewWindow.document.title = 'Pasek wypłaty';
        const body = previewWindow.document.body;
        body.style.cssText = `margin:0;display:grid;place-items:center;height:100vh;background:${palette.bg};color:${palette.text};font:16px ${FONT};`;
        body.textContent = 'Generowanie paska wypłaty...';
    } catch (error) {
        console.warn('Preview placeholder unavailable.', error);
    }
}

function defaultPaymentDate(dateTo) {
    return new Date(dateTo.getFullYear(), dateTo.getMonth() + 1, 10);
}

function toInputValue(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
}

function formatDate(value) {
    const date = value instanceof Date ? value : parseLocalDateInput(value);
    if (!date) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}.${date.getFullYear()}`;
}

function formatPeriod(from, to) {
    return `${formatDate(from)} – ${formatDate(to)}`;
}

function formatHours(hours) {
    return `${formatNumber(hours, 1)} h`;
}

function formatNumber(value, digits) {
    return new Intl.NumberFormat('pl-PL', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    }).format(value);
}

function pluralDays(count) {
    return count === 1 ? 'dzień' : 'dni';
}
