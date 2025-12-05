import { darkenColor, fallbackCopyToClipboard } from './utils.js';
let fireworksInterval = null; 

// ... (funkcje renderujące BEZ ZMIAN) ...
export function renderEmployeeControls(employees, employeeColors, timePresets) {
  const container = document.getElementById("employees");
  container.innerHTML = '';
  employees.forEach((name, index) => {
    const id = name.toLowerCase();
    const color = employeeColors[name] || '#ccc';
    const div = document.createElement('div');
    div.className = 'employee-row animate-stagger';
    div.style.animationDelay = `${index * 0.05}s`;
    const presetOptions = timePresets.map(p => `<option value="${p.value}">${p.label}</option>`).join('');
    const initials = name.substring(0, 1);
    div.innerHTML = `
      <div class="employee-info">
          <div class="avatar" style="background-color: ${color};">${initials}</div>
          <div class="emp-name">${name}</div>
          <div class="preset-btn-wrapper">
              <button class="btn-preset" aria-label="Wybierz zmianę">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </button>
              <select class="hidden-preset-select" data-employee-id="${id}">
                  <option value="" disabled selected style="display:none;"></option>
                  ${presetOptions}
              </select>
          </div>
      </div>
      <div class="time-inputs">
        <input type="time" id="${id}_od" aria-label="Od">
        <span style="color:#666">-</span>
        <input type="time" id="${id}_do" aria-label="Do">
      </div>
    `;
    container.appendChild(div);
  });
}

export function renderProductGrid(categories) {
    const container = document.getElementById("products");
    let globalIndex = 0;
    Object.entries(categories).forEach(([category, { items }]) => {
        const header = document.createElement("div");
        header.className = "category-header animate-stagger";
        header.style.animationDelay = `${globalIndex++ * 0.05}s`;
        header.innerHTML = `<span>${category}</span>`;
        container.appendChild(header);
        const group = document.createElement("div");
        group.className = "products-grid";
        items.forEach(product => {
            const el = document.createElement("div");
            el.className = "product-card animate-stagger";
            el.setAttribute("data-name", product.name);
            el.style.animationDelay = `${globalIndex++ * 0.02}s`;
            if (product.type === 's') {
                el.classList.add('type-toggle');
                el.onclick = (e) => toggleProductState(product.name, el);
                el.innerHTML = `
                  <div class="product-name">${product.name}</div>
                  <div class="controls">
                     <div class="toggle-indicator">
                        <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                     </div>
                     <input type="checkbox" id="checkbox-${product.name}" data-product-name="${product.name}" style="display:none;">
                  </div>
                `;
            } else {
                el.innerHTML = `
                  <div class="product-name">${product.name}</div>
                  <div class="controls">
                    <div class="counter-wrapper">
                      <button class="btn-qty btn-minus" data-action="decrement" data-product-name="${product.name}">−</button>
                      <input type="number" id="input-${product.name}" class="qty-display" value="0" data-product-name="${product.name}">
                      <button class="btn-qty btn-plus" data-action="increment" data-product-name="${product.name}">+</button>
                    </div>
                  </div>
                `;
            }
            group.appendChild(el);
        });
        container.appendChild(group);
    });
}

function toggleProductState(name, cardElement) {
    const checkbox = document.getElementById(`checkbox-${name}`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        const event = new Event('change', { bubbles: true });
        checkbox.dispatchEvent(event);
    }
}

export function highlightProduct(name, quantity) {
  const card = document.querySelector(`.product-card[data-name="${name}"]`);
  if (!card) return;
  const numQuantity = Number(quantity);
  if (numQuantity > 0) card.classList.add("active");
  else card.classList.remove("active");
}

export function updateResetButtonVisibility() {
  const savedData = JSON.parse(localStorage.getItem("productList") || "{}");
  const productsSelected = Object.values(savedData.products || {}).some(q => Number(q) > 0);
  const employeesSelected = Object.keys(savedData.employees || {}).length > 0;
  
  const resetContainer = document.getElementById("resetContainer");
  if (productsSelected || employeesSelected) {
      resetContainer.style.display = "block";
      resetContainer.style.animation = "fadeInUp 0.3s forwards";
  } else {
      resetContainer.style.display = "none";
  }
}

export function showLocationModal() {
  const sheet = document.getElementById("locationSheet");
  const overlay = document.getElementById("locationOverlay");
  overlay.classList.add("visible");
  sheet.classList.add("visible");
}

export function showSuccessModal(textToCopy) {
    const sheet = document.getElementById("successSheet");
    const overlay = document.getElementById("locationOverlay");
    const copyBtn = document.getElementById("finalCopyBtn");

    document.getElementById("locationSheet").classList.remove("visible");
    overlay.classList.add("visible");
    sheet.classList.add("visible");

    copyBtn.innerText = "SKOPIUJ";
    copyBtn.style.backgroundColor = ""; 

    copyBtn.onclick = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => handleCopySuccess(copyBtn))
                .catch(() => {
                    if(fallbackCopyToClipboard(textToCopy)) handleCopySuccess(copyBtn);
                });
        } else {
            if(fallbackCopyToClipboard(textToCopy)) handleCopySuccess(copyBtn);
        }
    };
}

function handleCopySuccess(btn) {
    btn.innerText = "SKOPIOWANO!";
    btn.style.backgroundColor = "#27AE60";
    triggerConfetti();
    startFireworks();
    
    // ZMIANA: Wydłużono czas do 5 sekund
    setTimeout(() => {
        closeLocationModal();
    }, 5000);
}

export function closeLocationModal() {
  document.getElementById("locationSheet").classList.remove("visible");
  document.getElementById("successSheet").classList.remove("visible");
  document.getElementById("locationOverlay").classList.remove("visible");
  stopFireworks();
}

// ... (Confetti i Fajerwerki BEZ ZMIAN) ...
function triggerConfetti() {
    const container = document.getElementById('confetti-container');
    for(let i=0; i<40; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-piece';
        const tx = (Math.random() - 0.5) * 600; 
        const ty = -(Math.random() * 500 + 300);
        el.style.setProperty('--tx', `${tx}px`);
        el.style.setProperty('--ty', `${ty}px`);
        const colors = ['#D35400', '#E67E22', '#F1C40F', '#E74C3C', '#ffffff'];
        el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDelay = `${Math.random() * 0.2}s`;
        el.style.left = '50%';
        el.style.bottom = '0';
        container.appendChild(el);
    }
}

function startFireworks() {
    if (fireworksInterval) return;
    fireworksInterval = setInterval(() => { createFirework(); }, 800);
}

function stopFireworks() {
    if (fireworksInterval) {
        clearInterval(fireworksInterval);
        fireworksInterval = null;
    }
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';
}

function createFirework() {
    const container = document.getElementById('confetti-container');
    const startX = Math.random() * 100;
    const startY = Math.random() * 50 + 10;
    const colors = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#ffffff'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    for(let i=0; i<20; i++) {
        const el = document.createElement('div');
        el.className = 'firework-particle';
        el.style.color = color;
        el.style.backgroundColor = color;
        el.style.left = `${startX}%`;
        el.style.top = `${startY}%`;
        const angle = (Math.PI * 2 * i) / 20;
        const velocity = 100 + Math.random() * 50;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;
        el.style.setProperty('--tx', `${tx}px`);
        el.style.setProperty('--ty', `${ty}px`);
        container.appendChild(el);
        setTimeout(() => { el.remove(); }, 1000);
    }
}