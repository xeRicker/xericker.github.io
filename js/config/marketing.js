export const MARKETING_BRAND = {
    name: 'Burbone',
    locations: [
        { name: 'Oświęcim', phone: '783 969 572', hours: '12:00-21:00', glovo: true },
        { name: 'Osiek', phone: '663 141 122', hours: '14:00-20:00', glovo: false }
    ],
    hashtags: ['Burbone', 'Burgery', 'FoodTruck', 'Oświęcim', 'Osiek', 'Glovo']
};

export const MARKETING_POST_TYPES = [
    { id: 'burger', label: 'Post o burgerze', icon: 'lunch_dining' },
    { id: 'locations', label: 'Przypomnienie o lokalizacjach', icon: 'storefront' },
    { id: 'glovo', label: 'Przypomnienie o dostawie Glovo', icon: 'delivery_dining' },
    { id: 'promo', label: 'Promocja', icon: 'local_offer' }
];
