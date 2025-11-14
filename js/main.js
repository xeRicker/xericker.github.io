import { saveReportToGithub, fetchMonthlyData } from './services/githubService.js';
import { saveStateToLocalStorage, loadStateFromLocalStorage } from './services/stateService.js';
import { renderEmployeeControls, renderProductGrid, highlightProduct, updateResetButtonVisibility, showLocationModal, closeLocationModal } from './ui.js';
import { getFormattedDate, fallbackCopyToClipboard } from './utils.js';

const employees = ["Paweł", "Radek", "Sebastian", "Tomek", "Kacper", "Natalia", "Dominik"];
const employeeColors = {
  "Paweł": "#3498db", "Radek": "#2ecc71", "Sebastian": "#e74c3c",
  "Tomek": "#f1c40f", "Natalia": "#9b59b6", "Kacper": "#e67e22", "Dominik": "#1abc9c"
};
const timePresets = [
  { label: "Własne", value: "" },
  { label: "12:00 - 19:30", value: "12:00-19:30" },
  { label: "12:00 - 20:00", value: "12:00-20:00" },
  { label: "12:00 - 20:30", value: "12:00-20:30" },
  { label: "12:00 - 21:30", value: "12:00-21:30" },
  { label: "12:00 - 22:00", value: "12:00-22:00" },
  { label: "14:00 - 19:30", value: "14:00-19:30" },
  { label: "14:00 - 20:00", value: "14:00-20:00" },
  { label: "14:00 - 20:30", value: "14:00-20:30" },
  { label: "14:00 - 21:30", value: "14:00-21:30" },
  { label: "14:00 - 22:00", value: "14:00-22:00" },
  { label: "16:00 - 19:30", value: "16:00-19:30" },
  { label: "16:00 - 20:00", value: "16:00-20:00" },
  { label: "16:00 - 20:30", value: "16:00-20:30" },
  { label: "16:00 - 21:30", value: "16:00-21:30" },
  { label: "16:00 - 22:00", value: "16:00-22:00" }
];
const categories = {
  "🥗": {
    icon: "icons/warzywa.png",
    items: [
      { name: "Sałata", type: '', options: { q: 1 } },
      { name: "Ogórki", type: '', options: { q: 1 } },
      { name: "Pomidory", type: 's', options: { q: 1 } },
      { name: "Cebula", type: 's', options: { q: 1 } },
      { name: "Jalapeno", type: 's', options: { q: 1 } },
    ]
  },
  "🥩": {
    icon: "icons/mieso.png",
    items: [
      { name: "Mięso: Małe", type: '', options: { q: 1 } },
      { name: "Mięso: Duże", type: '', options: { q: 1 } },
      { name: "Stripsy", type: '', options: { q: 1 } },
      { name: "Boczek", type: '', options: { q: 1 } },
      { name: "Chorizo", type: 's', options: { q: 2 } }
    ]
  },
  "🧀": {
    icon: "icons/nabial.png",
    items: [
      { name: "Cheddar", type: '', options: { q: 1 } },
      { name: "Halloumi", type: '', options: { q: 1 } },
      { name: "Majonez", type: 's', options: { q: 1 } }
    ]
  },
  "🍟": {
    icon: "icons/frytki.png",
    items: [
      { name: "Frytki", type: '', options: { q: 1 } },
      { name: "Placki", type: '', options: { q: 1 } },
      { name: "Krążki", type: '', options: { q: 1 } },
      { name: "Frytura", type: 's', options: { q: 1 } }
    ]
  },
  "🍞": {
    icon: "icons/pieczywo.png",
    items: [ { name: "Bułki", type: '', options: { q: 1 } } ]
  },
  "🧂": {
    icon: "icons/sosy.png",
    items: [
      { name: "Cebula prażona", type: '', options: { q: 1 } }, 
      { name: "Sriracha", type: 's', options: { q: 1 } }, 
      { name: "Tabasco", type: 's', options: { q: 1 } },
      { name: "Przyprawa do grilla", type: 's', options: { q: 1 } }, 
      { name: "Sól do frytek", type: 's', options: { q: 1 } },
      { name: "Sos: Ketchup", type: 's', options: { q: 1 } },
      { name: "Sos: Carolina", type: 's', options: { q: 1 } }, 
      { name: "Sos: Czosnek", type: 's', options: { q: 1 } },
      { name: "Sos: Barbecue", type: 's', options: { q: 1 } }, 
      { name: "Sos: Sweet Chilli", type: 's', options: { q: 1 } },
      { name: "Saszetki: Ketchup", type: 's', options: { q: 1 } },
      { name: "Zbój: Czosnek", type: 's', options: { q: 1 } },
      { name: "Zbój: Pieprz", type: 's', options: { q: 1 } },
      { name: "Zbój: Cytryna", type: 's', options: { q: 1 } }
    ]
  },
  "🥤": {
    icon: "icons/napoje.png",
    items: [
      { name: "Pepsi", type: 's', options: { q: 1 } },
      { name: "Pepsi Max", type: 's', options: { q: 1 } },
      { name: "Mirinda", type: 's', options: { q: 1 } },
      { name: "Lipton", type: 's', options: { q: 1 } }
    ]
  },
  "🛍️": {
    icon: "icons/opakowania.png",
    items: [
      { name: "Torby: Małe", type: 's', options: { q: 1 } },
      { name: "Torby: Średnie", type: 's', options: { q: 1 } },
      { name: "Torby: Duże", type: 's', options: { q: 1 } },
      { name: "Sos: Pojemniki", type: 's', options: { q: 1 } },
      { name: "Sos: Pokrywki", type: 's', options: { q: 1 } },
      { name: "Opakowania na frytki", type: 's', options: { q: 1 } },
      { name: "Folia", type: 's', options: { q: 1 } },
      { name: "Serwetki", type: 's', options: { q: 1 } },
      { name: "Rękawiczki", type: 's', options: { q: 1 } },
      { name: "Papier pod grilla", type: 's', options: { q: 1 } }
    ]
  },
  "🧽": {
    icon: "icons/chemia.png",
    items: [
      { name: "Szmaty", type: 's', options: { q: 1 } },
      { name: "Zielony papier", type: 's', options: { q: 1 } },
      { name: "Odtłuszczacz", type: 's', options: { q: 1 } },
      { name: "Worki na śmieci 120L", type: 's', options: { q: 1 } },
      { name: "Lepy na muchy", type: 's', options: { q: 1 } },
      { name: "Woda 5L", type: 's', options: { q: 1 } }
    ]
  },
  "📋": {
    icon: "icons/papierologia.png",
    items: [
      { name: "Drobne: 1,2,5", type: 's', options: { q: 1 } },
      { name: "Drobne: 10,20", type: 's', options: { q: 1 } },
      { name: "Długopis", type: 's', options: { q: 1 } },
      { name: "Pisak", type: 's', options: { q: 1 } },
      { name: "Zeszyt", type: 's', options: { q: 1 } },
      { name: "Papier do kasy", type: 's', options: { q: 1 } }
    ]
  }
};
const productMap = new Map(Object.values(categories).flatMap(cat => cat.items.map(p => [p.name, p])));
let selectedLocation = null;

document.addEventListener('DOMContentLoaded', () => {
  renderEmployeeControls(employees, employeeColors, timePresets);
  renderProductGrid(categories);
  
  const savedData = loadStateFromLocalStorage();
  if (savedData) {
    Object.entries(savedData.products || {}).forEach(([name, quantity]) => {
        const product = productMap.get(name);
        if (!product) return;
        if (product.type === 's') {
            const checkbox = document.getElementById(`checkbox-${name}`);
            if (checkbox) checkbox.checked = !!quantity;
        } else {
            const input = document.getElementById(`input-${name}`);
            if (input) input.value = quantity;
        }
        highlightProduct(name, quantity);
    });
    Object.entries(savedData.employees || {}).forEach(([id, times]) => {
        const fromInput = document.getElementById(`${id}_od`);
        const toInput = document.getElementById(`${id}_do`);
        const presetSelect = document.querySelector(`select[data-employee-id="${id}"]`);
        if (fromInput) fromInput.value = times.from;
        if (toInput) toInput.value = times.to;
        if (presetSelect) presetSelect.value = times.preset;
    });
    if (savedData.revenue) {
        document.getElementById('revenueInput').value = savedData.revenue;
    }
  }
  updateResetButtonVisibility();

  setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('products').addEventListener('change', handleProductChange);
    document.getElementById('products').addEventListener('click', handleProductButtonClick);
    document.getElementById('employees').addEventListener('change', handleEmployeeChange);
    document.getElementById('revenueInput').addEventListener('input', saveAndRefreshUI);
    document.querySelector('.reset-button').addEventListener('click', resetAll);
    document.getElementById('copyButton').addEventListener('click', showLocationModal);
    document.querySelectorAll('.location-button').forEach(btn => btn.addEventListener('click', handleLocationConfirm));
}

function handleProductChange(event) {
    if (event.target.matches('input[type="checkbox"], input[type="number"]')) {
        const name = event.target.dataset.productName;
        const value = event.target.type === 'checkbox' ? (event.target.checked ? 1 : 0) : Math.max(0, parseInt(event.target.value, 10) || 0);
        event.target.value = value;
        highlightProduct(name, value);
        saveAndRefreshUI();
    }
}

function handleProductButtonClick(event) {
    if (event.target.matches('button[data-action]')) {
        const name = event.target.dataset.productName;
        const action = event.target.dataset.action;
        const input = document.getElementById(`input-${name}`);
        let value = parseInt(input.value, 10) || 0;
        value = Math.max(0, value + (action === 'increment' ? 1 : -1));
        input.value = value;
        highlightProduct(name, value);
        saveAndRefreshUI();
    }
}

function handleEmployeeChange(event) {
    if (event.target.matches('select.time-preset-select')) {
        const value = event.target.value;
        const id = event.target.dataset.employeeId;
        const fromInput = document.getElementById(`${id}_od`);
        const toInput = document.getElementById(`${id}_do`);
        if (value) {
            const [from, to] = value.split('-');
            fromInput.value = from;
            toInput.value = to;
        }
    }
    saveAndRefreshUI();
}

function handleLocationConfirm(event) {
    const button = event.target.closest('.location-button');
    if (button) {
        selectedLocation = button.dataset.location;
        closeLocationModal();
        generateAndProcessLists();
    }
}

function saveAndRefreshUI() {
    saveStateToLocalStorage(productMap, employees);
    updateResetButtonVisibility();
}

function resetAll() {
  productMap.forEach((product, name) => {
    if (product.type === 's') {
      const checkbox = document.getElementById(`checkbox-${name}`);
      if (checkbox) checkbox.checked = false;
    } else {
      const input = document.getElementById(`input-${name}`);
      if (input) input.value = 0;
    }
    highlightProduct(name, 0);
  });

  employees.forEach(name => {
    const id = name.toLowerCase();
    document.getElementById(`${id}_od`).value = "";
    document.getElementById(`${id}_do`).value = "";
    document.querySelector(`select[data-employee-id="${id}"]`).value = "";
  });
  
  document.getElementById('revenueInput').value = "";

  localStorage.removeItem("productList");
  updateResetButtonVisibility();
  alert("Lista zresetowana!");
}

async function generateAndProcessLists() {
  const location = selectedLocation;
  const dateStr = getFormattedDate();
  const revenueValue = parseFloat(document.getElementById('revenueInput').value) || 0;

  const reportData = {
    location,
    date: dateStr,
    revenue: revenueValue,
    last_updated_at: new Date().toISOString(),
    employees: {},
    products: {}
  };
  let plainReport = `🧾 ${location} ${dateStr}\n`;

  let workersReport = "";
  employees.forEach(name => {
    const id = name.toLowerCase();
    const from = document.getElementById(`${id}_od`).value;
    const to = document.getElementById(`${id}_do`).value;
    if (from && to) {
      const hours = `${from} – ${to}`;
      reportData.employees[name] = hours;
      workersReport += `• ${name}: ${hours}\n`;
    }
  });
  if (workersReport) plainReport += `\n${workersReport}`;

  let productsReport = "";
  Object.entries(categories).forEach(([category, group]) => {
    let textSection = "";
    group.items.forEach(product => {
      const { name, type } = product;
      let quantity = 0;
      if (type === 's') {
        quantity = document.getElementById(`checkbox-${name}`)?.checked ? 1 : 0;
      } else {
        quantity = parseInt(document.getElementById(`input-${name}`).value, 10) || 0;
      }

      if (name.includes("Bułki") && quantity === 0) {
        reportData.products[name] = 0;
        textSection += `  • Bułki: ❌\n`;
      } else if (quantity > 0) {
        reportData.products[name] = quantity;
        textSection += `  • ${name}${type === 's' ? "" : ": " + quantity}\n`;
      }
    });
    if (textSection) productsReport += `\n${category}\n${textSection}`;
  });
  if (productsReport) plainReport += productsReport;

  navigator.clipboard.writeText(plainReport.trim()).then(() => {
    alert("Lista skopiowana!");
  }).catch(() => {
    fallbackCopyToClipboard(plainReport.trim());
  });

  await saveReportToGithub(reportData);
}