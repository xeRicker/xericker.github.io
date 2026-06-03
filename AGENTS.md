# Burbone Site Context

## Cel projektu

Statyczna aplikacja dla Burbone do generowania dziennych list operacyjnych oraz panel admina do analizy utargów, godzin pracowników, produktów i zapisanych raportów. Strona działa jako GitHub Pages, a lokalnie może używać `dev-server.js` do zapisu plików JSON przez `PUT`.

## Stack

- HTML statyczny: `index.html`, `admin.html`
- JavaScript: ES modules bez bundlera
- CSS: importy przez `style.css`
- Dane: pliki JSON w `database/<lokalizacja>/<dd.mm.yyyy>.json`
- Wykresy: Chart.js z CDN na stronie admina
- Ikony: Google Material Symbols Rounded
- Design tokens: lokalny zestaw tokenów Atlassian w `css/atlassian-tokens.css`

## Drzewko plików

```text
.
├── AGENTS.md
├── index.html
├── admin.html
├── style.css
├── dev-server.js
├── css/
│   ├── atlassian-tokens.css
│   ├── base.css
│   ├── layout.css
│   ├── generator.css
│   ├── admin.css
│   ├── admin-products-lists.css
│   ├── feedback.css
│   ├── components/custom-controls.css
│   └── theme/
│       ├── palette.css
│       └── atlassian-overrides.css
├── js/
│   ├── main.js
│   ├── admin.js
│   ├── utils.js
│   ├── config/
│   │   ├── config.js
│   │   └── data.js
│   ├── services/
│   │   ├── analytics.js
│   │   ├── api.js
│   │   ├── products.js
│   │   ├── reportDates.js
│   │   ├── reportFormatter.js
│   │   ├── revenue.js
│   │   ├── storage.js
│   │   ├── trivia.js
│   │   └── weather.js
│   └── ui/
│       ├── adminLists.js
│       ├── adminProducts.js
│       ├── adminRender.js
│       ├── mainRender.js
│       ├── payrollCalculator.js
│       ├── shared.js
│       └── components/customControls.js
└── database/
    ├── products.json
    ├── default.json
    └── <lokalizacja>/*.json
```

## Podzial odpowiedzialnosci

- `js/main.js`: logika generatora raportu, zakladki generator/pracownicy, zapis stanu formularza.
- `js/admin.js`: kontroler panelu admina, filtry, zakladki admina, widok utargow i kalkulator.
- `js/ui/adminLists.js`: widok zapisanych list, filtrowanie, podglad i kopiowanie raportow.
- `js/ui/adminProducts.js`: edycja katalogu produktow, kolejnosc, typy, aktywnosc, zapis.
- `js/ui/adminRender.js`: renderowanie podsumowan, wykresow, tabeli, heatmapy i tooltipow.
- `js/ui/payrollCalculator.js`: wspolny kalkulator godzin dla strony glownej i admina.
- `js/ui/components/customControls.js`: wlasne kontrolki `select`, `date`, `time` i dialogi. Nie uzywac `alert`, `confirm`, `prompt` ani natywnych pickerow jako interfejsu.
- `js/services/reportDates.js`: wspolne parsowanie dat raportow, klucze raportow i sortowanie po dacie.
- `js/services/api.js`: odczyt/zapis danych z GitHub API albo lokalnego dev-servera.
- `js/services/analytics.js`: laczenie raportow dziennych i wyliczenia statystyk.

## Design

Projekt ma isc w kierunku Atlassian: spokojny, uzytkowy, ciemny dashboard z malymi promieniami zaokraglen, czytelnymi kontrolkami i konsekwentna typografia. Preferowane sa tokeny Atlassian oraz zmienne z `css/base.css`; nie wprowadzac losowych kolorow, jesli da sie uzyc istniejacych zmiennych.

Zasady UI:

- Wszystkie kontrolki formularzy maja wygladac jak nasze komponenty. `select`, `date` i `time` powinny przechodzic przez `enhanceCustomControls()`.
- Do dialogow uzywac `dialogService` z `customControls.js`; nie uzywac przegladarkowych `alert`, `confirm`, `prompt`.
- Czcionka ma byc spojna: uzywac `--font-body` i `--font-heading`.
- Ikony w przyciskach preferuja Material Symbols przez `renderMaterialIcon()` albo istniejacy markup Material Symbols.
- Nie dodawac dekoracyjnych kart w kartach. Karty sa dla powtarzalnych elementow, tabel, paneli i modali.
- Przy zmianach CSS sprawdzic mobile, bo panel admina ma wiele siatek i stale akcje w wierszach.

## Praca lokalna

Uruchomienie lokalne:

```bash
node dev-server.js
```

Serwer obsluguje statyczne pliki oraz lokalne zapisy JSON. Bez niego sama strona moze sie otworzyc, ale zapisy przez `PUT` nie beda dzialac.

## Wskazowki dla kolejnych zmian

- Przy zmianie plikow JS importowanych w HTML podbij query string `?v=...`, bo nie ma bundlera.
- Przy dodawaniu wspolnej logiki szukac najpierw w `js/services/` i `js/ui/components/`.
- Daty raportow w danych sa w formacie `dd.mm.yyyy`; daty formularzy w UI sa w formacie ISO `yyyy-mm-dd`.
- Lokalizacje wystepuja z polskimi znakami, np. `Oświęcim`. Nie normalizowac ich agresywnie bez sprawdzenia sciezek w `database/`.
- Nie zmieniac struktury danych JSON bez aktualizacji `api.js`, `analytics.js`, `reportFormatter.js` i panelu admina.
