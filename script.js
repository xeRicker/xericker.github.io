// Kategorie i składniki
const kategorie = {
  "Warzywa": ["Sałata", "Pomidory", "Cebula", "Jalapeno", "Cytryna", "Ostre papryczki", "Ogórki kanapkowe", "Krążki cebulowe"],
  "Mięso": ["Mięso małe", "Mięso duże", "Stripsy", "Chorizo", "Tłuszcz wołowy", "Frytura", "Boczek"],
  "Sosy": ["Ketchup", "Sriracha", "Sos carolina", "Sos czosnkowy", "Sos BBQ", "Sos sweet chilli", "Ketchup saszetki", "Tabasco", "Pojemniki na sos", "Delikeli na sos"],
  "Napoje": ["Pepsi", "Woda 5L"],
  "Nabiał / Sery": ["Ser cheddar", "Ser halloumi"],
  "Pieczywo": ["Bułki", "Placki Ziemniaczane"],
  "Opakowania": ["Torby małe", "Torby średnie", "Torby duże", "Opakowania na frytki", "Folia aluminiowa", "Worki na śmieci"],
  "Inne": ["Cebula prażona", "Dobry materiał", "Serwetki", "Czyścidło", "Rękawiczki", "Przyprawa do grilla", "Sól do frytek", "Majonez", "Płyn do mycia", "Drobne 1,2,5", "Drobne 10,20", "Artykuły Biurowe"]
};

window.onload = () => {
  const container = document.getElementById("produkty");

  // Tworzenie kategorii i produktów
  Object.entries(kategorie).forEach(([kategoria, produkty]) => {
    const section = document.createElement("div");
    section.innerHTML = `<h3>${kategoria}</h3>`;

    const grupa = document.createElement("div");
    grupa.className = "produkty-grid";

    produkty.forEach(nazwa => {
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

// Zmiana ilości +/-
function zmienIlosc(nazwa, delta) {
  const input = document.getElementById(`input-${nazwa}`);
  let current = parseInt(input.value) || 0;
  current = Math.max(0, current + delta);
  input.value = current;
  podswietlProdukt(nazwa, current);
}

// Wpisanie ilości ręcznie
function ustawIlosc(nazwa) {
  const input = document.getElementById(`input-${nazwa}`);
  let value = parseInt(input.value) || 0;
  value = Math.max(0, value);
  input.value = value;
  podswietlProdukt(nazwa, value);
}

// Podświetlanie kolorami
function podswietlProdukt(nazwa, ilosc) {
  const box = document.querySelector(`[data-nazwa="${nazwa}"]`);
  box.classList.remove("highlight-1", "highlight-2", "highlight-3");

  if (ilosc === 1) box.classList.add("highlight-1");
  else if (ilosc === 2) box.classList.add("highlight-2");
  else if (ilosc >= 3) box.classList.add("highlight-3");
}

// Godziny pracowników
function pobierzGodziny(imie) {
  const od = document.getElementById(`${imie}_od`).value || "-";
  const do_ = document.getElementById(`${imie}_do`).value || "-";
  return `${od} – ${do_}`;
}

// Generowanie raportu
function generujRaport() {
  const lokal = document.getElementById("lokal").value;
  const data = document.getElementById("data").value;
  const dataStr = new Date(data).toLocaleDateString("pl-PL");

  let raport = `<p><strong>Lokalizacja:</strong> ${lokal}</p>`;
  raport += `<p><strong>Data:</strong> ${dataStr}</p><br>`;


  // Pracownicy
  raport += `<strong>Godziny pracy:</strong><br>`;
  raport += `Paweł: <strong>${pobierzGodziny("pawel")}</strong><br>`;
  raport += `Radek: <strong>${pobierzGodziny("radek")}</strong><br>`;
  raport += `Sebastian: <strong>${pobierzGodziny("sebastian")}</strong><br>`;
  raport += `Dominik: <strong>${pobierzGodziny("dominik")}</strong><br>`;
  raport += `Tomek: <strong>${pobierzGodziny("tomek")}</strong><br><br>`;

  Object.entries(kategorie).forEach(([kategoria, produkty]) => {
    let kategoriaZawartosc = "";
    produkty.forEach(nazwa => {
      const ilosc = parseInt(document.getElementById(`input-${nazwa}`).value) || 0;
      if (ilosc > 0) {
        kategoriaZawartosc += `  - ${nazwa}: <strong>${ilosc}</strong><br>`;
      }
    });
    if (kategoriaZawartosc.length > 0) {
      raport += `<strong>${kategoria}:</strong><br>${kategoriaZawartosc}<br>`;
    }
  });

  document.getElementById("raportContent").innerHTML = raport;

  // Generowanie obrazka
  html2canvas(document.getElementById("raport"), {
    scale: 2,
    width: 1000,
  }).then(canvas => {
    const link = document.createElement("a");
    const formatted = dataStr.replace(/\./g, "_");
    link.download = `lista_${lokal.toLowerCase()}_${formatted}.png`;
    link.href = canvas.toDataURL();
    link.click();
  });
}
