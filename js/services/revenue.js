const GLOVO_COMMISSION_RATE = 0.3;

export function calculateGlovoNet(glovoGross) {
    return (glovoGross || 0) * (1 - GLOVO_COMMISSION_RATE);
}

export function calculateEffectiveRevenue(totalRevenue, glovoGross) {
    return (totalRevenue || 0) - ((glovoGross || 0) - calculateGlovoNet(glovoGross));
}

export function calculateCashDesk(totalRevenue, cardRevenue, glovoGross) {
    return calculateEffectiveRevenue(totalRevenue, glovoGross) - (cardRevenue || 0) - calculateGlovoNet(glovoGross);
}
