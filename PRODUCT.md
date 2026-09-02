# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Głównymi użytkownikami są pracownicy burgerowni oraz osoby zarządzające lokalami. Pracownik korzysta z aplikacji podczas przygotowywania lub zamykania zmiany, aby uzupełnić dane i wygenerować codzienną listę operacyjną. Osoba zarządzająca korzysta z panelu administracyjnego do przeglądania utargu, godzin pracy, produktów i zapisanych raportów.

## Product Purpose

Burbone pomaga prowadzić codzienne operacje burgerowni: tworzyć dzienne listy na podstawie aktualnych danych, zapisywać je oraz analizować wyniki lokali. Sukces oznacza szybkie wygenerowanie poprawnej listy przez pracownika i czytelny, praktyczny podgląd danych dla osoby zarządzającej.

## Positioning

Produkt łączy generator codziennych list operacyjnych z panelem administracyjnym obejmującym utarg, godziny pracowników, katalog produktów i zapisane raporty. To jedno narzędzie dla pracy na zmianie i późniejszej kontroli wyników.

## Operating Context

System jest używany w lokalach burgerowni, w toku codziennych zmian i pracy administracyjnej. Pracownicy wprowadzają dane dotyczące utargu, zespołu, burgerów i składników, a następnie kopiują lub zapisują listę. Administracja przegląda dane według lokalizacji i zakresów dat oraz korzysta z raportów i kalkulatora wypłat.

## Capabilities and Constraints

- Interfejs i treści użytkowe są w języku polskim.
- Aplikacja jest statyczną stroną webową opartą o HTML, CSS i moduły JavaScript bez bundlera.
- Główne powierzchnie to generator `index.html` i panel administracyjny `admin.html`.
- Dane raportów używają formatu daty `dd.mm.yyyy`, a daty formularzy formatu ISO `yyyy-mm-dd`.
- Aplikacja działa na GitHub Pages; lokalny serwer deweloperski obsługuje zapisy JSON metodą `PUT`.
- Należy zachować istniejące funkcje, strukturę danych, lokalizacje, formaty raportów i działanie obecnych kontrolek.
- Generator może obsługiwać tymczasowego pracownika jednej zmiany; nie jest on zapisywany trwale.
- Interfejs powinien pozostać użyteczny na ekranach desktopowych i mobilnych.

## Brand Commitments

- Nazwa produktu: Burbone.
- Obecna paleta marki i aliasy kolorów w `css/theme/palette.css` są wiążące.
- Interfejs ma zachować spokojny, użytkowy charakter ciemnego dashboardu w stylu Atlassian, dostosowanego do ciepłej palety marki.
- Należy używać istniejącego systemu typografii, tokenów i ikon Material Symbols.

## Evidence on Hand

- Obecny generator i panel administracyjny: `index.html`, `admin.html`.
- Istniejące moduły JavaScript, style i tokeny w katalogach `js/` i `css/`.
- Dane produktów i raportów w katalogu `database/`.
- Lokalny serwer deweloperski: `dev-server.js`.
- Brak potwierdzonych zewnętrznych referencji, testimoniali i materiałów marketingowych; nie należy ich tworzyć bez zgody.

## Product Principles

- Codzienna praca na zmianie ma być szybka i bezbłędna.
- Dane operacyjne powinny być czytelne bez dodatkowej interpretacji.
- Generator i administracja mają tworzyć jeden spójny przepływ pracy.
- Zmiany wizualne nie mogą naruszać istniejących funkcji ani danych.
- Interfejs powinien wspierać pracę zarówno na komputerze, jak i na telefonie.

## Accessibility & Inclusion

Produkt powinien zachować dostępne etykiety kontrolek, logiczną obsługę klawiaturą, czytelny kontrast i responsywny układ. Szczegółowe potrzeby użytkowników nie zostały jeszcze potwierdzone.
