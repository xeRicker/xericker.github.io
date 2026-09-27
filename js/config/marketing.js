export const MARKETING_BRAND = {
    name: 'Burbone',
    locations: [
        { name: 'Oświęcim', phone: '783 969 572', hours: '12:00-21:00', glovo: true },
        { name: 'Osiek', phone: '663 141 122', hours: '14:00-20:00', glovo: false }
    ]
};

export const MARKETING_POST_TYPES = [
    { id: 'burger', label: 'Post o burgerze', icon: 'lunch_dining' },
    { id: 'locations', label: 'Przypomnienie o lokalizacjach', icon: 'storefront' },
    { id: 'glovo', label: 'Przypomnienie o dostawie Glovo', icon: 'delivery_dining' },
    { id: 'promo', label: 'Promocja', icon: 'local_offer' },
    { id: 'behind', label: 'Za kulisami', icon: 'local_fire_department' }
];

export const MARKETING_TEMPLATES = {
    burger: [
        '{emoji}{label}',
        '{label}. {taste}',
        '{hook}',
        '{hook} {cta}',
        'Dziś zachcianka: {label}.',
        'Dzisiejsza zachcianka? {label}.',
        '{description}',
        '{label} — {taste}',
        '{question}',
        'Szukasz konkretu? {label} jest gotowy.',
        'Dziś bez zastanawiania się: {label}.',
        'Chodzą za nami myśli o {label}.',
        '{label}, świeżo z grilla.',
        'Na tapecie: {label}.',
        'Masz ochotę? {label} czeka.',
        'Dzisiaj {label}. Reszta się nie liczy.',
        '{taste} {cta}',
        'Krótko: {label}. {taste}',
        'Dziś wybierz {label}. {cta}',
        'Ktoś tu ma ochotę na {label}? My też.',
        '{hook} {taste}',
        '{question} {cta}'
    ],
    locations: [
        'Dziś stoimy: {locations}.',
        '{emoji}Dziś jesteśmy: {locations}.',
        'Dziś znajdziesz nas tu: {locations}.',
        'Rozstawiliśmy się: {locations}.',
        'Dziś {location} — {hours}.',
        'Jeśli jesteś w okolicy, wpadnij. Dziś {locations}.',
        'Blisko Ciebie? Dziś {locations}.',
        'Truck rozstawiony, grill rozgrzany. {locations}.',
        'Dziś znowu na miejscu: {locations}.',
        '{locations}. Bez rezerwacji i ceregieli.',
        '{location}, dziś coś się dzieje. Grill.',
        '{location} dziś gra. Kto wpadnie?',
        '{location}, mamy dla Was grilla.',
        'Dziś na miejscu: {locations}.',
        'Grill rozgrzany, warzywa pokrojone. {locations}.',
        'Wpadnij, gdy będziesz w pobliżu. Dziś {locations}.',
        'Nie trzeba daleko szukać. Dziś jesteśmy tu: {locations}.',
        'Dziś {location}, godziny {hours}.',
        'Spotkamy się? {location}, my już jesteśmy.',
        '{emoji}{locations}, czekamy.',
        'Krótkie przypomnienie: dziś {locations}.',
        'Masz ochotę na burgera? Dziś {locations}.',
        '{question}',
        'Jesteśmy tam, gdzie zwykle. {locations}.'
    ],
    glovo: [
        'Nie chce Ci się wychodzić? Glovo dowozi.',
        'Burger prosto pod drzwi.',
        'Zamów w Glovo i czekaj na kuriera.',
        '{emoji}Zostań w domu, my przywieziemy.',
        'Wpisujesz {brand} w Glovo i gotowe.',
        'Wieczór, kanapa i Glovo. Brzmi znajomo?',
        'Dostawa na wyciągnięcie ręki — Glovo.',
        'Nie musisz nigdzie ruszać się z domu.',
        'Kilka kliknięć i burger jest w drodze.',
        'Dziś dostawa. Glovo.',
        'Dla wygodnych: Glovo.',
        'Głodny, a nie chce Ci się wychodzić? Jest Glovo.',
        'Wolisz kanapę? Zamów przez Glovo.',
        'Twoje zamówienie, nasz grill, kurier Glovo.',
        'Dostawa przez Glovo: {glovo}. Burger dojedzie sam.',
        'Zamawiasz, my robimy, Glovo dowozi.',
        'Bez wychodzenia z domu. Serio da się.',
        'Czasem po prostu nie chce się wychodzić. Wtedy Glovo.',
        '{question}',
        'Glovo i tyle w temacie.',
        'Dostawa pod drzwi, bez parkowania i kolejek.',
        'Dziś dowozimy. Sprawdź Glovo.'
    ],
    promo: [
        'Dziś: {promo}',
        'Mamy coś dla Was: {promo}',
        'Okazja na dziś: {promo}',
        '{emoji}{promo}',
        'Łap, póki trwa: {promo}',
        'Ktoś tu coś kombinuje: {promo}',
        'Skorzystaj, póki trwa: {promo}',
        'Dziś działa: {promo}',
        'Wpadnij i skorzystaj: {promo}',
        'Nie mów nikomu, ale: {promo}',
        'Coś dla głodnych: {promo}',
        'Sprawdź: {promo}',
        'Dobra wiadomość: {promo}',
        'Zgadnij, co dziś przygotowaliśmy? {promo}',
        'Mamy to: {promo}',
        'Wpadnij, zanim się skończy: {promo}',
        'Okazja dnia: {promo}',
        'Krótko: {promo}',
        '{promo} — tyle dziś potrzebujesz wiedzieć.',
        'Dla tych, którzy dziś wpadną: {promo}'
    ],
    behind: [
        'Mięso na grillu, dym w powietrzu. Tak wygląda u nas zwykły dzień.',
        'Zanim burger trafi do Ciebie, przechodzi przez grill.',
        'Smażenie mięsa to u nas codzienny rytuał.',
        'Składanie burgera to kilka sekund. Wcześniej jest przygotowanie.',
        'Warzywa kroimy na bieżąco. Zawsze świeże.',
        'Przygotowania przed otwarciem: bułki, mięso, sosy.',
        'Food truck to nie tylko grill. To też cała logistyka.',
        'Zdjęcie z grilla. Bez filtra i bez ściemy.',
        'Kawałek naszego punktu między jednym zamówieniem a drugim.',
        'Nasz pracownik przy przygotowywaniu zamówienia. Klatka z życia.',
        'Od kuchni: tak powstaje jeden burger.',
        'Kiedy nie ma kolejki, robimy dokładnie to samo. Tylko spokojniej.',
        'Świeży bekon na patelni. Najlepszy moment dnia.',
        'Każdy kotlet trafia na grill dopiero po zamówieniu.',
        'Za kulisami: składniki przygotowane, grill gotowy.',
        'Krojenie warzyw, formowanie kotletów, grill. Powtarzamy to codziennie.',
        'Ruch w punkcie? Wtedy każda sekunda się liczy.',
        'Zanim otworzymy, mamy już za sobą godzinę przygotowań.',
        '{emoji}Dziś z grilla: bułki i mięso. Jak zawsze.',
        'Nie ma tu wielkiej filozofii. Jest dobra robota.',
        'Zdjęcie z zaplecza. Tak to naprawdę wygląda.',
        'Praca przy food trucku to ciągły ruch i ład.',
        'Sos, ser, warzywa, mięso, bułka. W tej kolejności.',
        'Grill nie czeka. Dlatego robimy wszystko na bieżąco.',
        'Jeszcze chwilę i zaczynamy wydawać. Zapach już czuć.',
        'Codziennie od pierwszej do ostatniej bułki.',
        'Świeże składniki to nie hasło, to lista zakupów.',
        'Tak wygląda nasz truck przed otwarciem.'
    ]
};

export const MARKETING_CTAS = {
    burger: [
        'Wpadnij i sprawdź na żywo.',
        'Czekamy z rozgrzanym grillem.',
        'Dostępny na miejscu albo w Glovo.',
        'Do zobaczenia przy okienku.',
        'Przekonaj się sam.',
        'Wpadnij, gdy będziesz głodny.'
    ],
    locations: [
        'Wpadnij, kiedy chcesz.',
        'Bez rezerwacji i ceregieli.',
        'Do zobaczenia na miejscu.',
        'Zabierz ekipę i zamówcie razem.',
        'Świeże warzywa już pokrojone.',
        'Czekamy z grillem.',
        'Przyjeżdżaj, kiedy chcesz.'
    ],
    glovo: [
        'Wpisz {brand} i czekaj na kuriera.',
        'Kilka kliknięć i gotowe.',
        'Dostawa, gdy tylko masz ochotę.',
        'Zamów bez wychodzenia z domu.',
        'Otwórz Glovo i działaj.',
        'Twój burger już może być w drodze.'
    ],
    promo: [
        'Skorzystaj, póki trwa.',
        'Wpadnij albo zamów w Glovo.',
        'Okazja działa w naszych punktach.',
        'Zamów, zanim się skończy.'
    ],
    behind: [
        'Do zobaczenia przy okienku.',
        'Wpadnij i zobacz, jak to robimy.',
        'Robimy to codziennie.',
        'Dla nas liczy się każdy szczegół.'
    ]
};

export const MARKETING_QUESTIONS = {
    burger: [
        'Którego dziś wybierasz?',
        'Masz już swojego faworyta?',
        'Klasyk czy coś mocniejszego?',
        'Kto dziś na burgera?',
        'A Ty co bierzesz?',
        'Głodny?',
        'Zgadniesz, co dziś polecamy?'
    ],
    locations: [
        'Który punkt wybierasz dziś?',
        'Jesteś blisko któregoś z nas?',
        'Widzimy się dziś?',
        'Do którego trucka dziś wpadniesz?'
    ],
    glovo: [
        'Wolisz kanapę czy stolik przy trucku?',
        'Zamawiasz dziś do domu?',
        'Głodny, a nie chce Ci się wychodzić?'
    ],
    promo: [
        'Korzystasz?',
        'Wchodzisz w to?'
    ],
    behind: [
        'Zgadniesz, co robimy?',
        'Ciekawi Cię, jak to wygląda od środka?'
    ]
};

export const MARKETING_INSTAGRAM = {
    burger: [
        '{emoji}{label}',
        'Dziś {label}.',
        '{taste}',
        '{label}. {cta}',
        'Świeżo z grilla.',
        '{hook}',
        'Dla głodnych.',
        '{label} czeka.'
    ],
    locations: [
        '{emoji}{locations}',
        'Dziś {locations}.',
        'Dwa trucki, jeden grill.',
        'Jesteśmy na miejscu.',
        'Wpadnij, gdy będziesz w pobliżu.',
        '{location}, czekamy.',
        'Grill rozgrzany.'
    ],
    glovo: [
        '{emoji}Zamów przez Glovo.',
        'Burger pod drzwiami.',
        'Klik, klik i jedzie.',
        'Dowozimy.',
        'Nie chce Ci się wychodzić? Glovo.',
        'Dziś dostawa.'
    ],
    promo: [
        '{emoji}{promo}',
        'Okazja dnia.',
        '{promo} — wpadnij.',
        'Mamy coś dla Was.',
        'Dziś działa: {promo}'
    ],
    behind: [
        '{emoji}Kulisy grillowania.',
        'Tak to robimy.',
        'Od grilla do Ciebie.',
        'Świeże składniki, codzienna robota.',
        'Zdjęcie z zaplecza.',
        'Kawałek naszego dnia.'
    ]
};

export const MARKETING_PROMPTS = [
    'Napisz w komentarzu, na którego masz dziś ochotę.',
    'A Ty co wybierasz? Daj znać w komentarzu.',
    'Który burger kusi Cię najbardziej? Pisz śmiało.',
    'Oznacz kogoś, z kim zjadłbyś takiego burgera.',
    'Jesteś team klasyk czy team bydlak?',
    'Zgadnij, ile waży Bydlak. Nagroda: szacunek.',
    'Wrzuć serduszko, jeśli dziś burger.',
    'Napisz, z czym lubisz go najbardziej.',
    'Oznacz kogoś, kto dziś stawia.',
    'Który punkt wybierasz? Pisz w komentarzu.'
];

export const MARKETING_TYPE_HASHTAGS = {
    burger: ['DobryBurger', 'BurgerLover', 'BurgerTime'],
    locations: ['FoodTruckLife', 'GdzieZjeść', 'Małopolska'],
    glovo: ['Glovo', 'Dostawa', 'JedzenieNaWynos'],
    promo: ['Promocja', 'Okazja', 'Rabat'],
    behind: ['ZaKulisami', 'Rzemioslo', 'Kuchnia']
};

export const MARKETING_BASE_HASHTAGS = ['Burger', 'FoodTruck', 'StreetFood', 'Małopolska', 'Smacznego'];
