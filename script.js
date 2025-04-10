// Kategorie i składniki
const kategorie = {
  "Warzywa": { icon: "icons/warzywa.png", items: ["Sałata", "Pomidory", "Cebula", "Jalapeno", "Cytryna", "Ostre papryczki", "Ogórki kanapkowe", "Krążki cebulowe"] },
  "Mięso": { icon: "icons/mieso.png", items: ["Mięso małe", "Mięso duże", "Stripsy", "Chorizo", "Tłuszcz wołowy", "Frytura", "Boczek"] },
  "Sosy": { icon: "icons/sosy.png", items: ["Ketchup", "Sriracha", "Sos carolina", "Sos czosnkowy", "Sos BBQ", "Sos sweet chilli", "Ketchup saszetki", "Tabasco", "Pojemniki na sos", "Delikeli na sos"] },
  "Napoje": { icon: "icons/napoje.png", items: ["Pepsi", "Woda 5L"] },
  "Nabiał / Sery": { icon: "icons/nabial.png", items: ["Ser cheddar", "Ser halloumi"] },
  "Pieczywo": { icon: "icons/pieczywo.png", items: ["Bułki", "Placki Ziemniaczane"] },
  "Opakowania": { icon: "icons/opakowania.png", items: ["Torby małe", "Torby średnie", "Torby duże", "Opakowania na frytki", "Folia aluminiowa", "Worki na śmieci"] },
  "Inne": { icon: "icons/inne.png", items: ["Frytki", "Cebula prażona", "Dobry materiał", "Serwetki", "Czyścidło", "Rękawiczki", "Przyprawa do grilla", "Sól do frytek", "Majonez", "Płyn do mycia", "Drobne 1,2,5", "Drobne 10,20", "Artykuły Biurowe"] }
};

window.onload = () => {
  const container = document.getElementById("produkty");

  // Tworzenie kategorii i produktów
  Object.entries(kategorie).forEach(([kategoria, { icon, items }]) => {
    const section = document.createElement("div");
    section.innerHTML = `
      <h3 class="kategoria-naglowek">
        <img src="${icon}" alt="${kategoria}" class="kategoria-ikona">
        ${kategoria}
      </h3>
    `;

    const grupa = document.createElement("div");
    grupa.className = "produkty-grid";

    items.forEach(nazwa => {
      const el = document.createElement("div");
      el.className = "produkt";
      el.setAttribute("data-nazwa", nazwa);
      el.innerHTML = `
        <div class="produkt-name">${nazwa}</div>
        <div class="counter">
          <button onclick="zmienIlosc('${nazwa}', -1)">−</button>
          <input type="number" id="input-${nazwa}" value="0" min="0" onchange="ustawIlosc('${nazwa}')">
          <button onclick="zmienIlosc('${nazwa}', 1)">+</button>
        </div>
      `;
      grupa.appendChild(el);
    });

    section.appendChild(grupa);
    container.appendChild(section);
  });

  // Ustaw dzisiejszą datę jako domyślną
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("data").value = today;
};


// Zmiana ilości
function zmienIlosc(nazwa, delta) {
  const input = document.getElementById(`input-${nazwa}`);
  let current = parseInt(input.value) || 0;
  current = Math.max(0, current + delta);
  input.value = current;
  podswietlProdukt(nazwa, current);
}

function ustawIlosc(nazwa) {
  const input = document.getElementById(`input-${nazwa}`);
  let value = parseInt(input.value) || 0;
  value = Math.max(0, value);
  input.value = value;
  podswietlProdukt(nazwa, value);
}

function podswietlProdukt(nazwa, ilosc) {
  const box = document.querySelector(`[data-nazwa="${nazwa}"]`);
  box.classList.remove("highlight-1", "highlight-2", "highlight-3");

  if (ilosc === 1) box.classList.add("highlight-1");
  else if (ilosc === 2) box.classList.add("highlight-2");
  else if (ilosc >= 3) box.classList.add("highlight-3");
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

function generujListe() {
  const lokal = document.getElementById("lokal").value;
  const data = document.getElementById("data").value;
  const dataStr = new Date(data).toLocaleDateString("pl-PL");

  let htmlRaport = `<p><strong>Lokalizacja:</strong> ${lokal}</p>`;
  htmlRaport += `<p><strong>Data:</strong> ${dataStr}</p><br>`;

  const pracownicy = {
    "Paweł": "pawel",
    "Radek": "radek",
    "Sebastian": "sebastian",
    "Dominik": "dominik",
    "Tomek": "tomek"
  };

  htmlRaport += `<strong>Godziny pracy:</strong><br>`;
  let plainRaport = `🧾 Lista Produktów\n${lokal} ${dataStr}\n\nGodziny pracy:\n`;

  Object.entries(pracownicy).forEach(([imie, id]) => {
    const od = document.getElementById(`${id}_od`).value || "-";
    const do_ = document.getElementById(`${id}_do`).value || "-";
    htmlRaport += `${imie}: <strong>${od} – ${do_}</strong><br>`;
    plainRaport += `  • ${imie}: ${od} – ${do_}\n`;
  });

  htmlRaport += `<br>`;
  plainRaport += `\n`;

  Object.entries(kategorie).forEach(([kategoria, produkty]) => {
    let htmlKategoria = "";
    let textKategoria = "";

    produkty.items.forEach(nazwa => {
      const ilosc = parseInt(document.getElementById(`input-${nazwa}`).value) || 0;
      if (ilosc > 0) {
        htmlKategoria += `  - ${nazwa}: <strong>${ilosc}</strong><br>`;
        textKategoria += `  - ${nazwa}: ${ilosc}\n`;
      }
    });

    if (htmlKategoria.length > 0) {
      htmlRaport += `<strong>${kategoria}:</strong><br>${htmlKategoria}<br>`;
      plainRaport += `${kategoria}:\n${textKategoria}\n`;
    }
  });

  // Skopiuj tekst
  navigator.clipboard.writeText(plainRaport).then(() => {
    alert("Lista została skopiowana do schowka!");
  }).catch(() => {
    fallbackCopyToClipboard(plainRaport);
  });
}
