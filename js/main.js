import { EMPLOYEES, EMPLOYEE_COLORS, TIME_PRESETS, CATEGORIES } from './config/data.js';
import { mainRender } from './ui/mainRender.js';
import { uiShared } from './ui/shared.js';
import { storageService } from './services/storage.js';
import { apiService } from './services/api.js';
import { calculateCashDesk, calculateEffectiveRevenue, calculateGlovoNet } from './services/revenue.js';
import { getFormattedDate } from './utils.js';

let selectedLocation = null;

document.addEventListener('DOMContentLoaded', () => {
    mainRender.renderEmployees(document.getElementById('employees'), EMPLOYEES, EMPLOYEE_COLORS, TIME_PRESETS);
    mainRender.renderProducts(document.getElementById('products'), CATEGORIES);
    restoreState();
    setupEvents();
    updateRevenueInsights();
});

function setupEvents() {
    document.getElementById('products').addEventListener('click', handleProductClick);
    document.getElementById('products').addEventListener('change', handleProductChange);
    document.getElementById('employees').addEventListener('change', handleEmployeePreset);
    document.getElementById('employees').addEventListener('input', saveState);
    document.getElementById('revenueInput').addEventListener('input', saveState);
    document.getElementById('cardRevenueInput').addEventListener('input', saveState);
    document.getElementById('glovoRevenueInput').addEventListener('input', saveState);

    document.querySelector('.reset-button').addEventListener('click', resetAll);
    document.getElementById('copyButton').addEventListener('click', () => uiShared.showModal('locationSheet'));
    document.querySelectorAll('.location-button').forEach(b => b.addEventListener('click', e => {
        selectedLocation = e.currentTarget.dataset.location;
        generateReport();
    }));
    document.getElementById('locationOverlay').addEventListener('click', uiShared.closeModals);
}

function handleProductClick(e) {
    // Obsługa przycisków +/-
    const btn = e.target.closest('button');
    if (btn && btn.classList.contains('btn-qty')) {
        const name = btn.dataset.name;
        const input = document.getElementById(`input-${name}`);
        let val = parseInt(input.value) || 0;
        val = Math.max(0, val + (btn.dataset.act === 'inc' ? 1 : -1));
        input.value = val;
        mainRender.toggleHighlight(name, val > 0);
        saveState();
        return;
    }

    // Obsługa kliknięcia w kartę typu "checkbox" (np. Bułki, Drwal)
    const card = e.target.closest('.product-card.type-toggle');
    if (card) {
        const name = card.dataset.name;
        const checkbox = document.getElementById(`checkbox-${name}`);
        if (checkbox) {
            checkbox.checked = !checkbox.checked;
            // Wywołujemy ręcznie change, aby obsłużyć logikę podświetlania
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
}

function handleProductChange(e) {
    if(e.target.type === 'checkbox') {
        const name = e.target.dataset.name;
        mainRender.toggleHighlight(name, e.target.checked);
        // Klasa active jest dodawana w toggleHighlight, ale upewnijmy się
        const card = e.target.closest('.product-card');
        if(card) card.classList.toggle('active', e.target.checked);
    }
    saveState();
}

function handleEmployeePreset(e) {
    if(!e.target.classList.contains('hidden-preset-select')) return;
    const id = e.target.dataset.id;
    const [start, end] = e.target.value.split('-');
    document.getElementById(`${id}_od`).value = start;
    document.getElementById(`${id}_do`).value = end;
    e.target.closest('.employee-row').classList.add('active');
    e.target.value = '';
    saveState();
}

function saveState() {
    const state = {
        products: {},
        employees: {},
        revenue: document.getElementById('revenueInput').value,
        cardRevenue: document.getElementById('cardRevenueInput').value,
        glovoRevenue: document.getElementById('glovoRevenueInput').value
    };

    document.querySelectorAll('.product-card').forEach(card => {
        const name = card.dataset.name;
        const cb = document.getElementById(`checkbox-${name}`);
        const inp = document.getElementById(`input-${name}`);
        if(cb && cb.checked) state.products[name] = 1;
        if(inp && inp.value > 0) state.products[name] = inp.value;
    });

    EMPLOYEES.forEach(name => {
        const id = name.toLowerCase();
        const f = document.getElementById(`${id}_od`).value;
        const t = document.getElementById(`${id}_do`).value;
        if(f || t) state.employees[id] = { f, t };
    });

    storageService.save(state);
    mainRender.updateResetBtn();
    updateRevenueInsights();
}

function restoreState() {
    const state = storageService.load();
    if(!state) return;

    if(state.revenue) document.getElementById('revenueInput').value = state.revenue;
    if(state.cardRevenue) document.getElementById('cardRevenueInput').value = state.cardRevenue;
    if(state.glovoRevenue) document.getElementById('glovoRevenueInput').value = state.glovoRevenue;

    Object.entries(state.products || {}).forEach(([name, val]) => {
        const cb = document.getElementById(`checkbox-${name}`);
        const inp = document.getElementById(`input-${name}`);
        if(cb) { cb.checked = true; mainRender.toggleHighlight(name, true); }
        if(inp) { inp.value = val; mainRender.toggleHighlight(name, true); }
    });

    Object.entries(state.employees || {}).forEach(([id, times]) => {
        const r = document.getElementById(`${id}_od`).closest('.employee-row');
        document.getElementById(`${id}_od`).value = times.f;
        document.getElementById(`${id}_do`).value = times.t;
        if(times.f && times.t) r.classList.add('active');
    });
    mainRender.updateResetBtn();
    updateRevenueInsights();
}

function resetAll() {
    storageService.clear();
    location.reload();
}

async function generateReport() {
    const rev = parseFloat(document.getElementById('revenueInput').value) || 0;
    const card = parseFloat(document.getElementById('cardRevenueInput').value) || 0;
    const glovo = parseFloat(document.getElementById('glovoRevenueInput').value) || 0;
    const glovoNet = calculateGlovoNet(glovo);
    const effectiveRevenue = calculateEffectiveRevenue(rev, glovo);
    const cash = calculateCashDesk(rev, card, glovo);
    const date = getFormattedDate();

    if(rev === 0 && !confirm("Utarg wynosi 0. Kontynuować?")) return;
    if (cash < 0) {
        alert("Błąd danych: karty i Glovo nie mogą być większe niż utarg lokalu.");
        return;
    }

    const data = {
        location: selectedLocation,
        date,
        revenue: effectiveRevenue,
        revenueGross: rev,
        cardRevenue: card,
        cashRevenue: cash,
        glovoRevenue: glovo,
        glovoNetRevenue: glovoNet,
        employees: {},
        products: {}
    };
    let text = `🧾 ${selectedLocation} ${date}\n`;
    text += `• Utarg lokalu: ${effectiveRevenue.toFixed(2)} PLN\n`;
    text += `• Karty: ${card.toFixed(2)} PLN\n`;
    text += `• Gotówka: ${cash.toFixed(2)} PLN\n`;
    if (glovo > 0) text += `• Glovo: ${glovoNet.toFixed(2)} PLN\n`;

    EMPLOYEES.forEach(name => {
        const id = name.toLowerCase();
        const f = document.getElementById(`${id}_od`).value;
        const t = document.getElementById(`${id}_do`).value;
        if(f && t) {
            data.employees[name] = `${f} – ${t}`;
            text += `• ${name}: ${f} – ${t}\n`;
        }
    });

    let prodText = "";
    Object.entries(CATEGORIES).forEach(([cat, {items}]) => {
        let catTxt = "";
        items.forEach(p => {
            const cb = document.getElementById(`checkbox-${p.name}`);
            const inp = document.getElementById(`input-${p.name}`);
            const qty = cb ? (cb.checked?1:0) : (parseInt(inp.value)||0);

            if(p.name.includes("Bułki") && qty === 0) {
                data.products[p.name] = 0; catTxt += `  • Bułki: ❌\n`;
            } else if(qty > 0) {
                data.products[p.name] = qty;
                catTxt += `  • ${p.name}${p.type==='s'?'':': '+qty}\n`;
            }
        });
        if(catTxt) prodText += `\n${cat}\n${catTxt}`;
    });

    text += prodText;

    if(await apiService.checkFileExists(selectedLocation, date)) {
        if(!confirm("Raport z tego dnia już istnieje. Nadpisać?")) return;
    }

    await apiService.saveReport(data);
    uiShared.showSuccess(text.trim());
}

function updateRevenueInsights() {
    const rev = parseFloat(document.getElementById('revenueInput').value) || 0;
    const card = parseFloat(document.getElementById('cardRevenueInput').value) || 0;
    const glovo = parseFloat(document.getElementById('glovoRevenueInput').value) || 0;
    const cash = calculateCashDesk(rev, card, glovo);
    const glovoNet = calculateGlovoNet(glovo);

    const validation = document.getElementById('revenueValidation');
    const glovoInfo = document.getElementById('glovoNetInfo');

    glovoInfo.textContent = glovo > 0
        ? `Glovo netto po prowizji 30%: ${glovoNet.toFixed(2)} PLN`
        : 'Glovo netto po prowizji 30%: 0.00 PLN';

    if (rev === 0 && card === 0) {
        validation.textContent = 'Weryfikacja: wpisz utarg i karty, policzę gotówkę.';
        validation.className = 'revenue-note';
        return;
    }

    if (cash < 0) {
        validation.textContent = `Błąd: karty i Glovo przekraczają utarg lokalu o ${Math.abs(cash).toFixed(2)} PLN.`;
        validation.className = 'revenue-note revenue-note--danger';
        return;
    }

    validation.textContent = `Gotówka: ${cash.toFixed(2)} PLN`;
    validation.className = 'revenue-note revenue-note--success';
}
