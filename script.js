const employees = ["Paweł", "Radek", "Sebastian", "Tomek", "Natalia", "Kacper", "Dominik"];
const employeeColors = {
  "Paweł": "#3498db", "Radek": "#2ecc71", "Sebastian": "#e74c3c",
  "Tomek": "#f1c40f", "Natalia": "#9b59b6", "Kacper": "#e67e22", "Dominik": "#1abc9c"
};

const timePresets = [
  { label: "Własne", value: "" },
  { label: "12:00 - 20:00", value: "12:00-20:00" },
  { label: "12:00 - 20:30", value: "12:00-20:30" },
  { label: "12:00 - 21:30", value: "12:00-21:30" },
  { label: "12:00 - 22:00", value: "12:00-22:00" },
  { label: "14:00 - 20:00", value: "14:00-20:00" },
  { label: "14:00 - 20:30", value: "14:00-20:30" },
  { label: "14:00 - 21:30", value: "14:00-21:30" },
  { label: "14:00 - 22:00", value: "14:00-22:00" }
];

const categories = {
  "🥗": {
    icon: "icons/warzywa.png",
    items: [
      { name: "Sałata", type: '', options: { q: 1 } },
      { name: "Ogórki kanapkowe", type: '', options: { q: 1 } },
      { name: "Pomidory", type: 's', options: { q: 1 } },
      { name: "Cebula", type: 's', options: { q: 1 } },
      { name: "Jalapeno", type: 's', options: { q: 1 } },
      { name: "Cytryna", type: 's', options: { q: 1 } }
    ]
  },
  "🥩": {
    icon: "icons/mieso.png",
    items: [
      { name: "Mięso małe", type: '', options: { q: 1 } },
      { name: "Mięso duże", type: '', options: { q: 1 } },
      { name: "Stripsy", type: '', options: { q: 1 } },
      { name: "Chorizo", type: '', options: { q: 1 } },
      { name: "Boczek", type: '', options: { q: 2 } }
    ]
  },
  "🧀": {
    icon: "icons/nabial.png",
    items: [
      { name: "Ser cheddar", type: '', options: { q: 1 } },
      { name: "Ser halloumi", type: '', options: { q: 1 } },
      { name: "Majonez", type: 's', options: { q: 1 } }
    ]
  },
  "🍟": {
    icon: "icons/frytki.png",
    items: [
      { name: "Frytki", type: '', options: { q: 1 } },
      { name: "Placki Ziemniaczane", type: '', options: { q: 1 } },
      { name: "Krążki cebulowe", type: '', options: { q: 1 } }
    ]
  },
  "🍞": {
    icon: "icons/pieczywo.png",
    items: [
      { name: "Bułki (ile jest?)", type: '', options: { q: 1 } }
    ]
  },
  "🧂": {
    icon: "icons/sosy.png",
    items: [
      { name: "Ketchup", type: 's', options: { q: 1 } },
      { name: "Sriracha", type: 's', options: { q: 1 } },
      { name: "Sos carolina", type: 's', options: { q: 1 } },
      { name: "Sos czosnkowy", type: 's', options: { q: 1 } },
      { name: "Sos BBQ", type: 's', options: { q: 1 } },
      { name: "Sos sweet chilli", type: 's', options: { q: 1 } },
      { name: "Ketchup saszetki", type: 's', options: { q: 1 } },
      { name: "Tabasco", type: 's', options: { q: 1 } },
      { name: "Cebula prażona", type: 's', options: { q: 1 } },
      { name: "Przyprawa do grilla", type: 's', options: { q: 1 } },
      { name: "Sól do frytek", type: 's', options: { q: 1 } },
      { name: "Czosnek sypany", type: 's', options: { q: 1 } }
    ]
  },
  "🌻": {
    icon: "icons/oleje.png",
    items: [
      { name: "Tłuszcz wołowy", type: 's', options: { q: 1 } },
      { name: "Frytura", type: 's', options: { q: 1 } }
    ]
  },
  "🥤": {
    icon: "icons/napoje.png",
    items: [
      { name: "Pepsi", type: '', options: { q: 1 } },
      { name: "Pepsi Max", type: '', options: { q: 1 } },
      { name: "Dobry materiał", type: '', options: { q: 1 } },
      { name: "Woda 5L", type: '', options: { q: 1 } }
    ]
  },
  "🛍️": {
    icon: "icons/opakowania.png",
    items: [
      { name: "Torby małe", type: 's', options: { q: 1 } },
      { name: "Torby średnie", type: 's', options: { q: 1 } },
      { name: "Torby duże", type: 's', options: { q: 1 } },
      { name: "Opakowania na frytki", type: 's', options: { q: 1 } },
      { name: "Sos: Pojemniki", type: 's', options: { q: 1 } },
      { name: "Sos: Pokrywki", type: 's', options: { q: 1 } },
      { name: "Folia aluminiowa", type: 's', options: { q: 1 } },
      { name: "Serwetki", type: 's', options: { q: 1 } },
      { name: "Rękawiczki", type: 's', options: { q: 1 } }
    ]
  },
  "🧽": {
    icon: "icons/chemia.png",
    items: [
      { name: "Szmaty", type: 's', options: { q: 1 } },
      { name: "Zielony Papier", type: 's', options: { q: 1 } },
      { name: "Odtłuszczacz", type: 's', options: { q: 1 } },
      { name: "Worki na śmieci", type: 's', options: { q: 1 } },
    ]
  },
  "📋": {
    icon: "icons/papierologia.png",
    items: [
      { name: "Drobne 1,2,5", type: 's', options: { q: 1 } },
      { name: "Drobne 10,20", type: 's', options: { q: 1 } },
      { name: "Długopis", type: 's', options: { q: 1 } },
      { name: "Flamaster", type: 's', options: { q: 1 } },
      { name: "Zeszyt", type: 's', options: { q: 1 } },
      { name: "Papier do kasy", type: 's', options: { q: 1 } }
    ]
  }
};

let selectedLocation = null;
const productMap = new Map();
Object.values(categories).forEach(category => category.items.forEach(p => productMap.set(p.name, p)));

function renderEmployeeControls() {
  const container = document.getElementById("pracownicy");
  container.innerHTML = ''; 

  employees.forEach(name => {
    const id = name.toLowerCase();
    const color = employeeColors[name] || '#ccc';
    const div = document.createElement('div');
    const presetOptions = timePresets.map(p => `<option value="${p.value}">${p.label}</option>`).join('');
    const darkerColor = darkenColor(color, 20);

    div.innerHTML = `
      <label>
        <span class="employee-color-dot" style="background-color: ${color};"></span>
        <span style="color: ${darkerColor}; font-size: 1.2em; font-weight: bold;">${name}</span>
        <select class="time-preset-select" onchange="applyTimePreset('${id}', this)">${presetOptions}</select>
        <input type="time" id="${id}_od" onchange="saveToLocalStorage()">
        ➤ <input type="time" id="${id}_do" onchange="saveToLocalStorage()">
      </label>
    `;
    container.appendChild(div);
  });
}

function applyTimePreset(employeeId, selectElement) {
  const value = selectElement.value;
  const fromInput = document.getElementById(`${employeeId}_od`);
  const toInput = document.getElementById(`${employeeId}_do`);

  if (value) {
    const [from, to] = value.split('-');
    fromInput.value = from;
    toInput.value = to;
  } else {
    fromInput.value = '';
    toInput.value = '';
  }
  saveToLocalStorage();
}

window.onload = () => {
  renderEmployeeControls();
  const container = document.getElementById("produkty");

  Object.entries(categories).forEach(([category, { icon, items }]) => {
    const section = document.createElement("div");
    section.innerHTML = `<h3 class="kategoria-naglowek"><img src="${icon}" alt="${category}" class="kategoria-ikona"></h3>`;
    const group = document.createElement("div");
    group.className = "produkty-grid";

    items.forEach(product => {
      const el = document.createElement("div");
      el.className = "produkt";
      el.setAttribute("data-nazwa", product.name);

      if (product.type === 's') {
        el.innerHTML = `<div class="produkt-name">${product.name}</div><div class="counter"><label><input type="checkbox" id="checkbox-${product.name}" onchange="setCheckbox('${product.name}')"></label></div>`;
      } else {
        el.innerHTML = `<div class="produkt-name">${product.name}</div><div class="counter"><button onclick="changeQuantity('${product.name}', -1)">−</button><input type="number" id="input-${product.name}" value="0" min="0" onchange="setQuantity('${product.name}')"><button onclick="changeQuantity('${product.name}', 1)">+</button></div>`;
      }
      group.appendChild(el);
    });
    section.appendChild(group);
    container.appendChild(section);
  });

  loadState();
  updateResetButtonVisibility();
};

function loadState() {
  const savedData = JSON.parse(localStorage.getItem("productList") || "{}");
  const FIFTEEN_MINUTES = 15 * 60 * 1000;

  if (!savedData.time || Date.now() - savedData.time > FIFTEEN_MINUTES) {
    localStorage.removeItem("productList");
    return;
  }

  // Wczytywanie produktów
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

  // Wczytywanie godzin pracowników
  Object.entries(savedData.employees || {}).forEach(([id, times]) => {
    const fromInput = document.getElementById(`${id}_od`);
    const toInput = document.getElementById(`${id}_do`);
    const presetSelect = document.querySelector(`select[onchange="applyTimePreset('${id}', this)"]`);

    if (fromInput) fromInput.value = times.from;
    if (toInput) toInput.value = times.to;
    if (presetSelect) presetSelect.value = times.preset;
  });
}


function saveToLocalStorage() {
  const data = { time: Date.now(), products: {}, employees: {} };

  // Zapisywanie produktów
  productMap.forEach((product, name) => {
    if (product.type === 's') {
      const checkbox = document.getElementById(`checkbox-${name}`);
      if (checkbox) data.products[name] = checkbox.checked ? 1 : 0;
    } else {
      const input = document.getElementById(`input-${name}`);
      if (input) data.products[name] = input.value;
    }
  });

  // Zapisywanie godzin pracowników
  employees.forEach(name => {
    const id = name.toLowerCase();
    const from = document.getElementById(`${id}_od`).value;
    const to = document.getElementById(`${id}_do`).value;
    const presetSelect = document.querySelector(`select[onchange="applyTimePreset('${id}', this)"]`);
    if (from || to) {
      data.employees[id] = { from, to, preset: presetSelect.value };
    }
  });

  localStorage.setItem("productList", JSON.stringify(data));
  updateResetButtonVisibility();
}

function setCheckbox(name) {
  highlightProduct(name, document.getElementById(`checkbox-${name}`).checked ? 1 : 0);
  saveToLocalStorage();
}

function changeQuantity(name, delta) {
  const input = document.getElementById(`input-${name}`);
  let current = parseInt(input.value, 10) || 0;
  current = Math.max(0, current + delta);
  input.value = current;
  highlightProduct(name, current);
  saveToLocalStorage();
}

function setQuantity(name) {
  const input = document.getElementById(`input-${name}`);
  let value = parseInt(input.value, 10) || 0;
  value = Math.max(0, value);
  input.value = value;
  highlightProduct(name, value);
  saveToLocalStorage();
}

function updateResetButtonVisibility() {
  const savedData = JSON.parse(localStorage.getItem("productList") || "{}");
  const productsSelected = Object.values(savedData.products || {}).some(q => Number(q) > 0);
  const employeesSelected = Object.keys(savedData.employees || {}).length > 0;
  document.getElementById("resetContainer").style.display = (productsSelected || employeesSelected) ? "block" : "none";
}

function highlightProduct(name, quantity) {
  const box = document.querySelector(`[data-nazwa="${name}"]`);
  if (!box) return;
  box.classList.remove("highlight-1", "highlight-2", "highlight-3");
  const numQuantity = Number(quantity);
  if (numQuantity === 1) box.classList.add("highlight-1");
  else if (numQuantity === 2) box.classList.add("highlight-2");
  else if (numQuantity >= 3) box.classList.add("highlight-3");
}

function darkenColor(hex, percent) {
  let num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) - Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00FF) - Math.round(255 * (percent / 100));
  let b = (num & 0x0000FF) - Math.round(255 * (percent / 100));

  r = Math.max(0, r);
  g = Math.max(0, g);
  b = Math.max(0, b);

  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function resetAll() {
  // Czyszczenie produktów
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

  // Czyszczenie pól pracowników
  employees.forEach(name => {
    const id = name.toLowerCase();
    const fromEl = document.getElementById(`${id}_od`);
    const toEl = document.getElementById(`${id}_do`);
    if (fromEl) fromEl.value = "";
    if (toEl) toEl.value = "";
  });
  document.querySelectorAll('.time-preset-select').forEach(select => select.value = "");

  localStorage.removeItem("productList");
  updateResetButtonVisibility();
  alert("Lista zresetowana!");
}

function fallbackCopyToClipboard(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    alert("Lista skopiowana alternatywnie!");
  } catch (err) {
    alert("Kopiowanie nieudane.");
  }
  document.body.removeChild(textarea);
}

function showLocationModal() {
  document.getElementById("lokalModal").style.display = "flex";
}

function closeLocationModal() {
  document.getElementById("lokalModal").style.display = "none";
}

function confirmLocation(name) {
  selectedLocation = name;
  closeLocationModal();
  generateList();
}

function generateList() {
  const location = selectedLocation;
  const currentDate = new Date();
  const dateStr = currentDate.toLocaleDateString("pl-PL");
  let plainReport = `🧾 ${location} ${dateStr}\n`;
  let workersReport = "";
  
  employees.forEach(name => {
    const id = name.toLowerCase();
    const from = document.getElementById(`${id}_od`).value;
    const to = document.getElementById(`${id}_do`).value;
    if (from && to) {
      workersReport += `• ${name}: ${from} – ${to}\n`;
    }
  });

  if (workersReport) {
    plainReport += `\n${workersReport}`;
  }

  let productsReport = "";
  Object.entries(categories).forEach(([category, group]) => {
    let textSection = "";
    group.items.forEach(product => {
      let quantity = 0;
      const { name, type } = product;

      if (type === 's') {
        quantity = document.getElementById(`checkbox-${name}`)?.checked ? 1 : 0;
      } else {
        quantity = parseInt(document.getElementById(`input-${name}`).value, 10) || 0;
      }

      if (quantity > 0) {
        textSection += `  • ${name}${type === 's' ? "" : ": " + quantity}\n`;
      }
    });

    if (textSection.length > 0) {
      productsReport += `\n${category}\n${textSection}`;
    }
  });

  if (productsReport) {
    plainReport += productsReport;
  }

  navigator.clipboard.writeText(plainReport.trim()).then(() => {
    alert("Lista skopiowana!");
  }).catch(() => {
    fallbackCopyToClipboard(plainReport.trim());
    resetAll();
  });
}