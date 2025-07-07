import { APP_CONFIG } from '../config.js';

const STORAGE_KEY = "productList";

/**
 * Zapisuje aktualny stan pól formularza do localStorage.
 * @param {Map} productMap - Mapa produktów.
 * @param {Array<string>} employees - Lista pracowników.
 */
export function saveStateToLocalStorage(productMap, employees) {
  const data = { time: Date.now(), products: {}, employees: {} };

  productMap.forEach((product, name) => {
    if (product.type === 's') {
      const checkbox = document.getElementById(`checkbox-${name}`);
      if (checkbox) data.products[name] = checkbox.checked ? 1 : 0;
    } else {
      const input = document.getElementById(`input-${name}`);
      if (input) data.products[name] = input.value;
    }
  });

  employees.forEach(name => {
    const id = name.toLowerCase();
    const from = document.getElementById(`${id}_od`).value;
    const to = document.getElementById(`${id}_do`).value;
    const presetSelect = document.querySelector(`select[data-employee-id="${id}"]`);
    if (from || to) {
      data.employees[id] = { from, to, preset: presetSelect.value };
    }
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Wczytuje stan z localStorage i uzupełnia pola formularza.
 * @returns {object|null} Zapisane dane lub null, jeśli są nieaktualne.
 */
export function loadStateFromLocalStorage() {
  const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  
  if (!savedData.time || Date.now() - savedData.time > APP_CONFIG.LOCAL_STORAGE_EXPIRATION) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
  return savedData;
}