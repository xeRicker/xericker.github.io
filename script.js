// Lista składników
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
};

// Zmieniamy ilość składnika
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



// Zbieramy godziny pracowników
function pobierzGodziny(imie) {
  const od = document.getElementById(`${imie}_od`).value || "-";
  const do_ = document.getElementById(`${imie}_do`).value || "-";
  return `${od} – ${do_}`;
}

// Generujemy raport
function generujRaport() {
  const lokal = document.getElementById("lokal").value;
  let raport = `Lokalizacja: ${lokal}\n\n`;

  // Pracownicy
  raport += "Godziny pracy:\n";
  raport += `Paweł: ${pobierzGodziny("pawel")}\n`;
  raport += `Radek: ${pobierzGodziny("radek")}\n`;
  raport += `Sebastian: ${pobierzGodziny("sebastian")}\n`;
  raport += `Dominik: ${pobierzGodziny("dominik")}\n`;
  raport += `Tomek: ${pobierzGodziny("tomek")}\n\n`;

  Object.entries(kategorie).forEach(([kategoria, produkty]) => {
    let kategoriaZawartosc = "";
    produkty.forEach(nazwa => {
      const ilosc = parseInt(document.getElementById(`input-${nazwa}`).value) || 0;
      if (ilosc > 0) {
        kategoriaZawartosc += `  - ${nazwa}: ${ilosc}\n`;
      }
    });

    if (kategoriaZawartosc.length > 0) {
      raport += `${kategoria}:\n${kategoriaZawartosc}\n`;
    }
  });

  // Wyświetlenie w HTML
  document.getElementById("raportContent").textContent = raport;

  // Generowanie obrazka
  html2canvas(document.getElementById("raport"), {
    scale: 2, // poprawia jakość i rozdzielczość
    width: 500, // ustalona szerokość
  }).then(canvas => {
    const link = document.createElement("a");
    link.download = "raport.png";
    link.href = canvas.toDataURL();
    link.click();
  });
}

