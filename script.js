const checkboxItems = ["Rękawiczki", "Serwetki", "Folia aluminiowa"];

const categories = {
  "Warzywa i Owoce": {
    icon: "icons/warzywa.png",
    items: ["Sałata", "Pomidory", "Cebula", "Ogórki kanapkowe", "Jalapeno", "Cytryna", "Ostre papryczki"]
  },
  "Mięso i Drób": {
    icon: "icons/mieso.png",
    items: ["Mięso małe", "Mięso duże", "Stripsy", "Chorizo", "Boczek"]
  },
  "Nabiał i Sery": {
    icon: "icons/nabial.png",
    items: ["Ser cheddar", "Ser halloumi", "Majonez"]
  },
  "Dodatki Skrobiowe / Smażone": {
    icon: "icons/frytki.png",
    items: ["Frytki", "Placki Ziemniaczane", "Krążki cebulowe"]
  },
  "Pieczywo": {
    icon: "icons/pieczywo.png",
    items: ["Bułki"]
  },
  "Sosy i Przyprawy": {
    icon: "icons/sosy.png",
    items: [
      "Ketchup", "Sriracha", "Sos carolina", "Sos czosnkowy", "Sos BBQ",
      "Sos sweet chilli", "Ketchup saszetki", "Tabasco",
      "Cebula prażona", "Przyprawa do grilla", "Sól do frytek", "Czosnek sypany"
    ]
  },
  "Tłuszcze i Oleje": {
    icon: "icons/oleje.png",
    items: ["Tłuszcz wołowy", "Frytura"]
  },
  "Napoje": {
    icon: "icons/napoje.png",
    items: ["Pepsi", "Pepsi Max", "Dobry materiał", "Woda 5L"]
  },
  "Opakowania i Jednorazowe": {
    icon: "icons/opakowania.png",
    items: [
      "Torby małe", "Torby średnie", "Torby duże", "Opakowania na frytki",
      "Sos: Pojemniki", "Sos: Pokrywki", "Folia aluminiowa",
      "Serwetki", "Rękawiczki"
    ]
  },
  "Chemia i Zaopatrzenie": {
    icon: "icons/chemia.png",
    items: [
      "Szmaty", "Zielony Papier", "Odtłuszczacz", "Worki na śmieci",
      "Drobne 1,2,5", "Drobne 10,20", "Artykuły Biurowe"
    ]
  }
};

let wybranyLokalModalnie = null;

window.onload = () => {
  const container = document.getElementById("produkty");

  Object.entries(categories).forEach(([category, { icon, items }]) => {
    const section = document.createElement("div");
    section.innerHTML = `
      <h3 class="kategoria-naglowek">
        <img src="${icon}" alt="${category}" class="kategoria-ikona">
        ${category}
      </h3>
    `;

    const group = document.createElement("div");
    group.className = "produkty-grid";

    items.forEach(name => {
      const el = document.createElement("div");
      el.className = "produkt";
      el.setAttribute("data-nazwa", name);

      if (checkboxItems.includes(name)) {
        el.innerHTML = `
          <div class="produkt-name">${name}</div>
          <div class="counter">
            <label><input type="checkbox" id="checkbox-${name}" onchange="setCheckbox('${name}')"></label>
          </div>
        `;
      } else {
        el.innerHTML = `
          <div class="produkt-name">${name}</div>
          <div class="counter">
            <button onclick="changeQuantity('${name}', -1)">−</button>
            <input type="number" id="input-${name}" value="0" min="0" onchange="setQuantity('${name}')">
            <button onclick="changeQuantity('${name}', 1)">+</button>
          </div>
        `;
      }

      group.appendChild(el);
    });

    section.appendChild(group);
    container.appendChild(section);
  });

  const savedData = JSON.parse(localStorage.getItem("lista_produktow") || "{}");
  const FIFTEEN_MINUTES = 15 * 60 * 1000;

  if (savedData && savedData.time && Date.now() - savedData.time < FIFTEEN_MINUTES) {
    Object.entries(savedData.values || {}).forEach(([name, quantity]) => {
      if (checkboxItems.includes(name)) {
        const checkbox = document.getElementById(`checkbox-${name}`);
        if (checkbox) {
          checkbox.checked = !!quantity;
          highlightProduct(name, quantity);
        }
      } else {
        const input = document.getElementById(`input-${name}`);
        if (input) {
          input.value = quantity;
          highlightProduct(name, parseInt(quantity));
        }
      }
    });
  } else {
    localStorage.removeItem("lista_produktow");
  }

  updateResetButtonVisibility();
};

function setCheckbox(name) {
  const checkbox = document.getElementById(`checkbox-${name}`);
  const value = checkbox.checked ? 1 : 0;
  highlightProduct(name, value);
  saveToLocalStorage();
}

function updateResetButtonVisibility() {
  const anySelected = Object.entries(categories).some(([_, group]) =>
    group.items.some(name => {
      if (checkboxItems.includes(name)) {
        const checkbox = document.getElementById(`checkbox-${name}`);
        return checkbox?.checked;
      } else {
        const input = document.getElementById(`input-${name}`);
        return input && parseInt(input.value) > 0;
      }
    })
  );

  document.getElementById("resetContainer").style.display = anySelected ? "block" : "none";
}

function saveToLocalStorage() {
  const data = { time: Date.now(), values: {} };

  Object.entries(categories).forEach(([_, group]) => {
    group.items.forEach(name => {
      if (checkboxItems.includes(name)) {
        const checkbox = document.getElementById(`checkbox-${name}`);
        if (checkbox) data.values[name] = checkbox.checked ? 1 : 0;
      } else {
        const input = document.getElementById(`input-${name}`);
        if (input) data.values[name] = input.value;
      }
    });
  });

  localStorage.setItem("lista_produktow", JSON.stringify(data));
}

function changeQuantity(name, delta) {
  const input = document.getElementById(`input-${name}`);
  let current = parseInt(input.value) || 0;
  current = Math.max(0, current + delta);
  input.value = current;
  highlightProduct(name, current);
  saveToLocalStorage();
}

function setQuantity(name) {
  const input = document.getElementById(`input-${name}`);
  let value = parseInt(input.value) || 0;
  value = Math.max(0, value);
  input.value = value;
  highlightProduct(name, value);
  saveToLocalStorage();
}

function highlightProduct(name, quantity) {
  const box = document.querySelector(`[data-nazwa="${name}"]`);
  box.classList.remove("highlight-1", "highlight-2", "highlight-3");

  if (quantity === 1) box.classList.add("highlight-1");
  else if (quantity === 2) box.classList.add("highlight-2");
  else if (quantity >= 3) box.classList.add("highlight-3");

  updateResetButtonVisibility();
}

function resetAll() {
  Object.entries(categories).forEach(([_, group]) => {
    group.items.forEach(name => {
      if (checkboxItems.includes(name)) {
        const checkbox = document.getElementById(`checkbox-${name}`);
        if (checkbox) {
          checkbox.checked = false;
          highlightProduct(name, 0);
        }
      } else {
        const input = document.getElementById(`input-${name}`);
        if (input) {
          input.value = 0;
          highlightProduct(name, 0);
        }
      }
    });
  });

  ["pawel", "radek", "sebastian", "dominik", "tomek", "natalia", "kacper"].forEach(id => {
    const od = document.getElementById(`${id}_od`);
    const do_ = document.getElementById(`${id}_do`);
    if (od) od.value = "";
    if (do_) do_.value = "";
  });

  localStorage.removeItem("lista_produktow");
  updateResetButtonVisibility();
  alert("Lista została zresetowana!");
}

function fallbackCopyToClipboard(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    alert("Lista została skopiowana alternatywnie!");
  } catch (err) {
    alert("Kopiowanie nieudane.");
  }
  document.body.removeChild(textarea);
}

function pokazLokalModal() {
  document.getElementById("lokalModal").style.display = "flex";
}

function zatwierdzLokal(nazwa) {
  wybranyLokalModalnie = nazwa;
  document.getElementById("lokalModal").style.display = "none";
  generujListe();
}

function generujListe() {
  if (!wybranyLokalModalnie) {
    alert("Najpierw wybierz lokalizację.");
    return;
  }

  const location = wybranyLokalModalnie;
  const currentDate = new Date();
  const dateStr = currentDate.toLocaleDateString("pl-PL");

  let htmlReport = `<p><strong>Lokalizacja:</strong> ${location}</p>`;
  htmlReport += `<p><strong>Data:</strong> ${dateStr}</p><br>`;

  const workers = {
    "Paweł": "pawel",
    "Radek": "radek",
    "Sebastian": "sebastian",
    "Dominik": "dominik",
    "Tomek": "tomek",
    "Natalia": "natalia",
    "Kacper": "kacper"
  };

  htmlReport += `<strong>Godziny pracy:</strong><br>`;
  let plainReport = `🧾 Lista Produktów\n${location} ${dateStr}\n\nGodziny pracy:\n`;

  Object.entries(workers).forEach(([name, id]) => {
    const from = document.getElementById(`${id}_od`).value || "-";
    const to = document.getElementById(`${id}_do`).value || "-";
    htmlReport += `${name}: <strong>${from} – ${to}</strong><br>`;
    plainReport += `  • ${name}: ${from} – ${to}\n`;
  });

  htmlReport += `<br>`;
  plainReport += `\n`;

  Object.entries(categories).forEach(([category, group]) => {
    let htmlSection = "";
    let textSection = "";

    group.items.forEach(name => {
      let quantity = 0;

      if (checkboxItems.includes(name)) {
        const checkbox = document.getElementById(`checkbox-${name}`);
        quantity = checkbox?.checked ? 1 : 0;
      } else {
        quantity = parseInt(document.getElementById(`input-${name}`).value) || 0;
      }

      if (quantity > 0) {
        htmlSection += `  - ${name}: <strong>${checkboxItems.includes(name) ? "✔️" : quantity}</strong><br>`;
        textSection += `  - ${name}: ${checkboxItems.includes(name) ? "✔️" : quantity}\n`;
      }
    });

    if (htmlSection.length > 0) {
      htmlReport += `<strong>${category}:</strong><br>${htmlSection}<br>`;
      plainReport += `${category}:\n${textSection}\n`;
    }
  });

  navigator.clipboard.writeText(plainReport).then(() => {
    alert("Lista została skopiowana do schowka!");
  }).catch(() => {
    fallbackCopyToClipboard(plainReport);
  });

  localStorage.removeItem("lista_produktow");
}
