export const mainRender = {
    renderEmployees(container, list, colors, presets) {
        container.innerHTML = list.map((name, i) => {
            const id = name.toLowerCase();
            const opts = presets.map(p => `<option value="${p.value}">${p.label}</option>`).join('');
            return `
            <div class="employee-row animate-stagger" style="animation-delay:${i*0.05}s">
                <div class="employee-info">
                    <div class="avatar" style="background-color:${colors[name]||'#ccc'}">${name[0]}</div>
                    <div class="emp-name">${name}</div>
                    <div class="preset-btn-wrapper">
                        <button class="btn-preset" style="color:var(--primary-color)">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </button>
                        <select class="hidden-preset-select" data-id="${id}"><option></option>${opts}</select>
                    </div>
                </div>
                <div class="time-inputs">
                    <input type="time" id="${id}_od"><span style="color:#666">-</span><input type="time" id="${id}_do">
                </div>
            </div>`;
        }).join('');
    },

    renderProducts(container, categories) {
        let idx = 0;
        container.innerHTML = Object.entries(categories).map(([cat, {items}]) => `
            <div class="category-header animate-stagger" style="animation-delay:${idx++*0.05}s">${cat}</div>
            <div class="products-grid">
                ${items.map(p => {
            const delay = idx++ * 0.02;
            if(p.type === 's') {
                return `
                        <div class="product-card animate-stagger type-toggle" data-name="${p.name}" style="animation-delay:${delay}s">
                            <div class="product-name">${p.name}</div>
                            <div class="controls">
                                <div class="toggle-indicator"><svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                <input type="checkbox" id="checkbox-${p.name}" data-name="${p.name}" style="display:none">
                            </div>
                        </div>`;
            } else {
                return `
                        <div class="product-card animate-stagger" data-name="${p.name}" style="animation-delay:${delay}s">
                            <div class="product-name">${p.name}</div>
                            <div class="controls">
                                <div class="counter-wrapper">
                                    <button class="btn-qty btn-minus" data-act="dec" data-name="${p.name}">−</button>
                                    <input type="number" id="input-${p.name}" class="qty-display" value="0" data-name="${p.name}">
                                    <button class="btn-qty btn-plus" data-act="inc" data-name="${p.name}">+</button>
                                </div>
                            </div>
                        </div>`;
            }
        }).join('')}
            </div>
        `).join('');
    },

    toggleHighlight(name, isActive) {
        const el = document.querySelector(`.product-card[data-name="${name}"]`);
        if(el) el.classList.toggle('active', isActive);
    },

    updateResetBtn() {
        const hasData = localStorage.getItem("burbone_state");
        document.getElementById("resetContainer").style.display = hasData ? "block" : "none";
    }
};