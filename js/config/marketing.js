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

export const BURGER_MARKETING = {
    classic: {
        hooks: [
            'Nie wymyślamy koła na nowo. Klasyk robi robotę.',
            'Klasyk, od którego zaczęła się cała historia.'
        ],
        short: 'Klasyk, który nigdy nie zawodzi.',
        description: 'Soczysta wołowina, chrupiąca sałata, pomidor, ogórek i cebula, a wszystko na bułce brioche z grilla. Zero udziwnień, maksimum smaku.'
    },
    cheese: {
        hooks: [
            'Podwójny cheddar, który ciągnie się przy każdym gryzie.',
            'Dla tych, którzy mówią: „poproszę więcej sera”.'
        ],
        short: 'Cheddar, który ciągnie się do ostatniego kęsa.',
        description: 'Do klasyka dokładamy solidną porcję cheddara, który rozpływa się po ciepłej wołowinie. Ser ciągnie się aż do ostatniego kęsa, więc przygotuj się na lekki bałagan na palcach.'
    },
    bacon: {
        hooks: [
            'Bekon chrupie tak głośno, że słychać go przy stoliku obok.',
            'Dymny, wędzony i bez litości — bekon rządzi.'
        ],
        short: 'Chrupiący bekon i wędzony cheddar.',
        description: 'Chrupiący bekon, wędzony cheddar i sos, który spina to wszystko w jedną całość. Jeśli lubisz dymny smak, ten burger jest dla Ciebie jak znalazł.'
    },
    vege: {
        hooks: [
            'Halloumi z grilla. Mięso dziś zostaje w domu.',
            'Wege, które nie smakuje jak „opcja zapasowa”.'
        ],
        short: 'Grillowane halloumi zamiast mięsa.',
        description: 'Grillowane halloumi zamiast wołowiny, a do tego wszystkie świeże dodatki i sos. Wegetariański, ale tak samo konkretny jak reszta naszej karty.'
    },
    spicy: {
        hooks: [
            'Ostry tak, że sięgasz po kolejny kęs i po wodę.',
            'Chorizo, jalapeño i bekon. Ostrzeżenie: wciąga.'
        ],
        short: 'Chorizo, jalapeño i bekon. Ostro.',
        description: 'Chorizo, jalapeño, bekon i cheddar — ostre, ale wciąż zbalansowane. Jeśli lubisz, gdy burger daje kopa, zamów coś do picia i nie mów, że nie ostrzegaliśmy.'
    },
    chicken: {
        hooks: [
            'Chrupiące stripsy zamiast wołowiny. Robi się ciekawie.',
            'Kurczak w panierce, świeże warzywa i sos.'
        ],
        short: 'Chrupiące stripsy zamiast wołowiny.',
        description: 'Stripsy w chrupiącej panierce, świeże warzywa i sos, który wszystko spina. Lżejsza wersja burgera, ale wcale nie mniej konkretna.'
    },
    dwarf: {
        hooks: [
            'Krasnolud jest niski tylko z nazwy.',
            'Niepozorny? Dopóki nie spróbujesz go podnieść.'
        ],
        short: 'Podwójna wołowina i zero umiaru.',
        description: 'Podwójna wołowina, krążki cebulowe, placek ziemniaczany, cheddar i bekon. Krasnolud wygląda skromnie, a potem okazuje się, że ledwo mieści się w dłoni. Dla naprawdę głodnych.'
    },
    beast: {
        hooks: [
            'Bydlak. Prawie pół kilo wołowiny. Powodzenia.',
            'Trzy kotlety, góra sera i zero umiaru.'
        ],
        short: 'Prawie pół kilo wołowiny. Wyzwanie.',
        description: 'Trzy duże kotlety wołowe, dziewięć plastrów cheddara, bekonu i chorizo. Bydlak nie jest dla każdego — jest dla tych, którzy podchodzą do burgera jak do wyzwania.'
    }
};

export const MARKETING_HOOKS = {
    burger: [
        'Dziś na grillu: {label}.',
        'Kto dziś zamawia {label}?',
        'Dziś króluje: {label}.',
        'Świeżo z grilla: {label}.',
        'Głodny? Dziś mamy {label}.'
    ],
    locations: [
        'Dziś stoimy w {locations}.',
        'Gdzie nas dziś znajdziesz? Podpowiadamy.',
        'Dwa food trucki, dwa miasta, jeden grill.',
        'Blisko Ciebie? Sprawdź, gdzie jesteśmy dziś.',
        '{locations} — wybierz, gdzie Ci wygodniej.',
        'Truck rozstawiony, grill rozgrzany. Zapraszamy.'
    ],
    glovo: [
        'Nie chce Ci się nigdzie ruszać? Glovo dowozi.',
        'Burger bez wychodzenia z kanapy. Da się.',
        'Otwórz Glovo i wpisz Burbone.',
        'Zostań w domu, my przywieziemy.',
        'Głodny? Kilka kliknięć i jedzie.',
        'Dostawa prosto pod drzwi — bez wychodzenia z domu.'
    ],
    promo: [
        'Tylko teraz: {promo}',
        'Łap okazję: {promo}',
        'Dziś działa: {promo}',
        'Nie mów nikomu, ale dziś: {promo}.',
        'Mamy coś dla Was: {promo}.'
    ],
    behind: [
        'Zapach z grilla czuć z drugiej strony ulicy.',
        'Zanim trafi do Ciebie, musi przejść przez grill.',
        'Kulisy: bułki, mięso, ogień i dużo cierpliwości.',
        'Świeże warzywa kroimy na bieżąco. Zawsze.',
        'Najlepszy moment dnia? Kiedy bekon trafia na patelnię.'
    ]
};

export const MARKETING_BODIES = {
    burger: [
        'Wpadnij i sprawdź, jak smakuje na żywo.',
        'Przekonaj się, czy to Twój nowy numer jeden.',
        'Czekamy z rozgrzanym grillem.',
        'Dostępny na miejscu albo w Glovo.'
    ],
    locations: [
        'Wpadnij na miejscu — burgery lecą prosto z grilla.',
        'Bez rezerwacji i ceregieli. Przyjeżdżaj, kiedy chcesz.',
        'Zabierz ekipę i zamówcie na miejscu.',
        'Stoimy tam, gdzie zawsze. Do zobaczenia!',
        'Świeże warzywa pokrojone, mięso gotowe. Czekamy.'
    ],
    glovo: [
        'Wpisz Burbone w aplikacji Glovo i czekaj na kuriera.',
        'Otwórz Glovo, wrzuć burgera do koszyka i gotowe.',
        'Zamów z dostawą, gdziekolwiek jesteś w zasięgu.',
        'Kilka kliknięć i burger jedzie do Ciebie.',
        'Dostawa prosto pod drzwi, bez wychodzenia z domu.'
    ],
    promo: [
        'Skorzystaj, póki trwa.',
        'Wpadnij, zanim się skończy.',
        'Okazja dostępna w obu truckach.',
        'Zamów na miejscu albo przez Glovo.'
    ],
    behind: [
        'Do zobaczenia przy okienku.',
        'Wpadnij i zobacz, jak to robimy.',
        'Robimy to codziennie, od pierwszej do ostatniej bułki.',
        'Dla nas liczy się każdy szczegół — od bułki po ostatni plaster sera.'
    ]
};

export const MARKETING_INSTAGRAM = {
    burger: ['Dziś na grillu.', 'Dla głodnych.', 'Wpadnij, zanim się skończy.', 'Świeżo z grilla.'],
    locations: ['Oświęcim i Osiek. Czekamy!', 'Dwa trucki, jeden smak.', 'Jesteśmy na miejscu.'],
    glovo: ['Zamów przez Glovo.', 'Klik, klik i gotowe.', 'Dowozimy pod drzwi.'],
    promo: ['Tylko teraz!', 'Wpadnij i skorzystaj.', 'Okazja dnia.'],
    behind: ['Kulisy grillowania.', 'Tak to robimy.', 'Od grilla do Ciebie.']
};

export const MARKETING_PROMPTS = [
    'Napisz w komentarzu, na którego masz dziś ochotę.',
    'A Ty co wybierasz? Daj znać w komentarzu.',
    'Który burger kusi Cię najbardziej? Pisz śmiało.',
    'Oznacz kogoś, z kim zjadłbyś takiego burgera.',
    'Jesteś team klasyk czy team bydlak?',
    'Zgadnij, ile waży Bydlak. Nagroda: szacunek.'
];

export const MARKETING_TYPE_HASHTAGS = {
    burger: ['DobryBurger', 'BurgerLover', 'BurgerTime'],
    locations: ['FoodTruckLife', 'GdzieZjeść', 'Małopolska'],
    glovo: ['Glovo', 'Dostawa', 'JedzenieNaWynos'],
    promo: ['Promocja', 'Okazja', 'Rabat'],
    behind: ['ZaKulisami', 'Rzemioslo', 'Kuchnia']
};

export const MARKETING_BASE_HASHTAGS = ['Burger', 'FoodTruck', 'StreetFood', 'Małopolska', 'Smacznego'];
