---
name: Burbone
description: Profesjonalne centrum operacyjne dla codziennej pracy burgerowni.
colors:
  brand-orange: "#D4521A"
  brand-orange-hover: "#E76A32"
  brand-orange-pressed: "#B74112"
  brand-orange-subtle: "#3A2118"
  app-black: "#151312"
  surface-dark: "#1F1B19"
  surface-raised: "#28221F"
  surface-overlay: "#302824"
  text-primary: "#F2ECE8"
  text-secondary: "#C8BAB3"
  text-muted: "#94847C"
  success: "#7DCE82"
  danger: "#FF8F82"
  warning: "#F6C85F"
  info: "#7AB8FF"
typography:
  display:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "8px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "8px 20px"
  card:
    backgroundColor: "{colors.surface-dark}"
    rounded: "{rounded.md}"
    padding: "20px"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
---

# Design System: Burbone

## Overview

**Creative North Star: "Nocna kuchnia pod kontrolą"**

Burbone ma charakter profesjonalnego centrum operacyjnego pracującego w tle lokalu: ciemne powierzchnie ograniczają wizualny hałas, a neonowy pomarańczowy akcent natychmiast wskazuje działanie, stan aktywny lub ważny wynik. System jest konkretny i użytkowy, ale zachowuje ciepło wynikające z marki burgerowni.

Układ jest gęsty, funkcjonalny i oparty na wyraźnych panelach. Hierarchia wynika przede wszystkim z kontrastu tonalnego, rozmiaru tekstu i ograniczonego użycia pomarańczu, nie z dekoracyjnych ozdobników.

**Key Characteristics:**
- Profesjonalny, operacyjny ton
- Czarny motyw z neonowym pomarańczowym akcentem
- Gęste, skanowalne panele i kontrolki
- Ciepłe neutralne teksty zamiast czystej bieli
- Ikony Material Symbols jako funkcjonalne oznaczenia

## Colors

Paleta łączy niemal czarne tło z ciepłymi, brunatnymi powierzchniami i jednym dominującym akcentem: neonową pomarańczą Burbone.

### Primary
- **Neonowa pomarańcza Burbone**: Główny kolor akcji, aktywnych zakładek, wybranych produktów, ikon i kluczowych wyników.
- **Pomarańczowy stan hover**: Jaśniejsza reakcja na interakcję i fokus.
- **Ciemna pomarańcza pressed**: Stan wciśnięcia oraz mocniejszy wariant akcentu.

### Neutral
- **Czerń operacyjna**: Główne tło aplikacji.
- **Ciepła powierzchnia**: Standardowe karty, sekcje i tabele.
- **Podniesiona powierzchnia**: Pola formularzy, grupy kontrolek i elementy aktywne tonalnie.
- **Warstwa overlay**: Dropdowny, dialogi, tooltipy i elementy unoszące się nad treścią.
- **Ciepła biel**: Najważniejsze wartości i tekst podstawowy.
- **Ciepły szary**: Opisy, etykiety i tekst pomocniczy.

### Named Rules
**The One Accent Rule.** Pomarańczowy jest sygnałem działania lub stanu; nie służy do dekorowania każdej powierzchni.

## Typography

**Display Font:** Segoe UI (with system sans-serif fallbacks)

**Body Font:** Segoe UI (with system sans-serif fallbacks)

**Label/Mono Font:** Brak odrębnego kroju mono; wartości techniczne mogą używać istniejącego kroju kodowego Atlassian.

**Character:** Jedna rodzina typograficzna utrzymuje profesjonalny, spokojny rytm. Mocniejsze wagi i kapitaliki etykiet wspierają skanowanie paneli, a tekst treści pozostaje neutralny i czytelny.

### Hierarchy
- **Display** (700, 24px, 1.2): Nazwa marki i najważniejsze tytuły.
- **Headline** (700, 22px, 1.25): Główne nagłówki powierzchni i kluczowe wartości.
- **Title** (700, 18px, 1.3): Nagłówki sekcji i kart.
- **Body** (400, 14px, 1.5): Opisy, formularze, tabele i treść raportów.
- **Label** (700, 12px, 1.2, lekko zwiększony tracking): Etykiety kontrolek, statusy i nagłówki pomocnicze.

## Layout

Generator korzysta z centralnego kontenera o maksymalnej szerokości około 600px, natomiast panel administracyjny rozszerza się do około 1240px. Sekcje są ułożone pionowo i grupowane w karty; generator przełącza się między głównymi widokami za pomocą zakładek, a administracja używa gęstych siatek, tabel i paneli analitycznych.

Rytm opiera się głównie na odstępach 8, 12, 16, 20 i 24px. Na mniejszych ekranach siatki przechodzą w jedną kolumnę, zakładki mogą się zawijać, a kontrolki filtrów układają się pionowo. Interfejs musi zachować wygodne cele dotykowe bez utraty gęstości informacji.

## Elevation & Depth

System stosuje hybrydę tonalnego warstwowania i subtelnych cieni. Zwykłe karty są przede wszystkim odróżniane od tła kolorem powierzchni i cienką obwódką. Cień jest zarezerwowany dla elementów podniesionych, overlayów, dialogów i wybranych stanów interakcji.

### Shadow Vocabulary
- **Raised:** `0 1px 1px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 244, 238, 0.04)` — standardowe podniesienie karty.
- **Overlay:** `0 12px 28px rgba(0, 0, 0, 0.46), 0 0 0 1px var(--app-border)` — dropdowny, tooltipy i dialogi.

### Named Rules
**The Layered Surface Rule.** Najpierw używaj różnicy powierzchni, dopiero potem cienia; cień nie powinien zastępować struktury.

## Shapes

Forma jest zwarta i lekko zaokrąglona. Standardowe karty i większe grupy używają promienia 12px, mniejsze kontrolki 6px, a statusy i przełączniki formy pigułki. Obwódki są cienkie, ciepłe i półprzezroczyste; mocniejsza obwódka pojawia się przy fokusu lub aktywności.

## Components

### Buttons
- **Shape:** Zwarty promień 6px, z wyraźnym celem dotykowym.
- **Primary:** Neonowa pomarańcza z ciemnym tekstem kontrastowym, zwykle `8px 20px` paddingu.
- **Hover / Focus:** Jaśniejszy pomarańczowy hover i widoczny focus ring oparty na kolorze marki.
- **Secondary / Ghost:** Przezroczyste lub tonalne tło, spokojniejszy tekst i obwódka; używane do działań pomocniczych.

### Cards / Containers
- **Corner Style:** 12px dla sekcji i kart, 6px dla mniejszych elementów.
- **Background:** Ciepła ciemna powierzchnia na czarnym tle; podniesiona powierzchnia dla grup kontrolek.
- **Shadow Strategy:** Cienie tylko dla podniesienia lub overlayu.
- **Border:** Cienka obwódka semantyczna, pomarańczowa przy aktywności.
- **Internal Padding:** Najczęściej 16–24px.

### Inputs / Fields
- **Style:** Podniesiona ciemna powierzchnia, cienka obwódka, promień 6px i czytelny tekst podstawowy.
- **Focus:** Pomarańczowa obwódka oraz subtelny ring.
- **Error / Disabled:** Błąd używa semantycznego koloru danger; disabled obniża kontrast bez ukrywania stanu.

### Navigation
- **Style:** Zakładki i przełączniki są kompaktowe, oparte na typografii UI i aktywnej powierzchni.
- **Default / Hover:** Neutralny tekst i delikatna zmiana powierzchni.
- **Active:** Pomarańczowa etykieta, ikona lub obwódka oraz tonalne tło aktywne.
- **Mobile:** Zakładki mogą przejść do jednej kolumny albo przewijanej listy zależnie od kontekstu.

### Signature Component: Daily Operations Generator
Generator jest głównym komponentem produktu: łączy sekcje utargu, zespołu, burgerów, składników i kalkulatora godzin w jeden przepływ. Powinien eksponować kolejny krok, utrzymywać stan formularza i kończyć się wyraźną akcją wygenerowania lub skopiowania listy.

## Do's and Don'ts

### Do:
- **Do** używaj istniejących aliasów kolorów i tokenów zamiast nowych wartości.
- **Do** rezerwuj neonowy pomarańczowy dla działania, aktywności i istotnych wyników.
- **Do** utrzymuj jedną rodzinę typograficzną oraz rytm odstępów oparty na małych, powtarzalnych krokach.
- **Do** projektuj równolegle dla generatora mobilnego i gęstego panelu administracyjnego.
- **Do** zachowuj etykiety, fokus klawiatury i semantyczne stany kontrolek.

### Don't:
- **Don't** dodawaj nowych dominujących kolorów ani przypadkowych gradientów.
- **Don't** używaj czystej bieli i czystej czerni jako podstawowego kontrastu, gdy istnieją ciepłe tokeny tekstu i powierzchni.
- **Don't** zamieniaj każdej sekcji w dekoracyjną kartę wewnątrz kolejnej karty.
- **Don't** poświęcaj czytelności danych na rzecz efektów wizualnych.
- **Don't** zmieniaj istniejących formatów danych, funkcji ani zachowania kontrolek podczas prac wizualnych.
