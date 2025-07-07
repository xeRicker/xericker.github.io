import { darkenColor } from './utils.js';

/**
 * Renderuje kontrolki dla pracowników.
 * @param {Array<string>} employees - Lista pracowników.
 * @param {object} employeeColors - Mapa kolorów pracowników.
 * @param {Array<object>} timePresets - Predefiniowane godziny pracy.
 */
export function renderEmployeeControls(employees, employeeColors, timePresets) {
  const container = document.getElementById("employees");
  container.innerHTML = '';
  employees.forEach(name => {
    const id = name.toLowerCase();
    const color = employeeColors[name] || '#ccc';
    const div = document.createElement('div');
    const presetOptions = timePresets.map(p => `<option value="${p.value}">${p.label}</option>`).join('');
    const darkerColorHex = darkenColor(color, 20);

    div.innerHTML = `
      <label>
        <span class="employee-color-dot" style="background-color: ${color};"></span>
        <span style="color: ${darkerColorHex}; font-size: 1.2em; font-weight: bold;">${name}</span>
        <select class="time-preset-select" data-employee-id="${id}">${presetOptions}</select>
        <input type="time" id="${id}_od">
         do <input type="time" id="${id}_do">
      </label>
    `;
    container.appendChild(div);
  });
}

/**
 * Renderuje siatkę produktów.
 * @param {object} categories - Obiekt z kategoriami i produktami.
 */
export function renderProductGrid(categories) {
    const container = document.getElementById("products");
    Object.entries(categories).forEach(([category, { icon, items }]) => {
        const section = document.createElement("div");
        section.innerHTML = `<h3 class="category-header"><img src="${icon}" alt="${category}" class="category-icon"></h3>`;
        const group = document.createElement("div");
        group.className = "products-grid";

        items.forEach(product => {
            const el = document.createElement("div");
            el.className = "product";
            el.setAttribute("data-name", product.name);

            if (product.type === 's') {
                el.innerHTML = `<div class="product-name">${product.name}</div><div class="counter"><label><input type="checkbox" id="checkbox-${product.name}" data-product-name="${product.name}"></label></div>`;
            } else {
                el.innerHTML = `<div class="product-name">${product.name}</div><div class="counter"><button data-action="decrement" data-product-name="${product.name}">−</button><input type="number" id="input-${product.name}" value="0" min="0" data-product-name="${product.name}"><button data-action="increment" data-product-name="${product.name}">+</button></div>`;
            }
            group.appendChild(el);
        });
        section.appendChild(group);
        container.appendChild(section);
    });
}

/**
 * Podświetla produkt w zależności od jego ilości.
 * @param {string} name - Nazwa produktu.
 * @param {number} quantity - Ilość.
 */
export function highlightProduct(name, quantity) {
  const box = document.querySelector(`[data-name="${name}"]`);
  if (!box) return;
  box.classList.remove("highlight-1", "highlight-2", "highlight-3");
  const numQuantity = Number(quantity);
  if (numQuantity === 1) box.classList.add("highlight-1");
  else if (numQuantity === 2) box.classList.add("highlight-2");
  else if (numQuantity >= 3) box.classList.add("highlight-3");
}

/**
 * Pokazuje lub ukrywa przycisk Reset na podstawie stanu aplikacji.
 */
export function updateResetButtonVisibility() {
  const savedData = JSON.parse(localStorage.getItem("productList") || "{}");
  const productsSelected = Object.values(savedData.products || {}).some(q => Number(q) > 0);
  const employeesSelected = Object.keys(savedData.employees || {}).length > 0;
  document.getElementById("resetContainer").style.display = (productsSelected || employeesSelected) ? "block" : "none";
}

/**
 * Pokazuje modal z wyborem lokalizacji.
 */
export function showLocationModal() {
  document.getElementById("locationModal").style.display = "flex";
}

/**
 * Ukrywa modal z wyborem lokalizacji.
 */
export function closeLocationModal() {
  document.getElementById("locationModal").style.display = "none";
}