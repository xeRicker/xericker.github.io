import { calculateHours } from '../utils.js';
import { calculateCashDesk, calculateEffectiveRevenue, calculateGlovoNet } from './revenue.js';

export class AnalyticsService {
    processReports(reports) {
        const map = new Map();
        reports.forEach(r => {
            if (!map.has(r.date)) {
                const [d, m, y] = r.date.split('.');
                const dateObj = new Date(y, m - 1, d);
                map.set(r.date, {
                    dateStr: r.date,
                    dateObj,
                    timestamp: dateObj.getTime(),
                    dayOfWeek: dateObj.toLocaleDateString('pl-PL', { weekday: 'long' }),
                    oswiecim: 0, osiek: 0, total: 0,
                    wilamowice: 0,
                    oswiecimCard: 0, osiekCard: 0, cardTotal: 0,
                    wilamowiceCard: 0,
                    oswiecimCash: 0, osiekCash: 0, cashTotal: 0,
                    wilamowiceCash: 0,
                    oswiecimGlovo: 0, osiekGlovo: 0, glovoTotal: 0,
                    wilamowiceGlovo: 0,
                    oswiecimGlovoNet: 0, osiekGlovoNet: 0, glovoNetTotal: 0,
                    wilamowiceGlovoNet: 0,
                    cashDeskTotal: 0,
                    locations: {},
                    rawReports: []
                });
            }
            const entry = map.get(r.date);
            const revGross = r.revenueGross ?? r.revenue ?? 0;
            const card = r.cardRevenue || 0;
            const glovo = r.glovoRevenue || 0;
            const glovoNet = r.glovoNetRevenue ?? calculateGlovoNet(glovo);
            const rev = r.revenue ?? calculateEffectiveRevenue(revGross, glovo);
            const cashDesk = Math.max(0, calculateCashDesk(revGross, card, glovo));
            const cash = cashDesk;
            const locationKey = this.getLocationKey(r.location);

            if (!entry.locations[r.location]) {
                entry.locations[r.location] = {
                    name: r.location,
                    key: locationKey,
                    total: 0,
                    card: 0,
                    cash: 0,
                    glovo: 0,
                    glovoNet: 0,
                    cashDesk: 0,
                    reports: []
                };
            }

            const locationEntry = entry.locations[r.location];
            locationEntry.total += rev;
            locationEntry.card += card;
            locationEntry.cash += cash;
            locationEntry.glovo += glovo;
            locationEntry.glovoNet += glovoNet;
            locationEntry.cashDesk += cashDesk;
            locationEntry.reports.push(r);

            if (locationKey) {
                entry[locationKey] += rev;
                entry[`${locationKey}Card`] += card;
                entry[`${locationKey}Cash`] += cash;
                entry[`${locationKey}Glovo`] += glovo;
                entry[`${locationKey}GlovoNet`] += glovoNet;
            }

            entry.total += rev;
            entry.cardTotal += card;
            entry.cashTotal += cash;
            entry.glovoTotal += glovo;
            entry.glovoNetTotal += glovoNet;
            entry.cashDeskTotal += cashDesk;
            entry.rawReports.push(r);
        });
        return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
    }

    calculateEmployeeStats(mergedData) {
        const stats = new Map();
        mergedData.forEach(day => {
            day.rawReports.forEach(r => {
                if (!r.employees) return;
                Object.entries(r.employees).forEach(([name, time]) => {
                    const h = calculateHours(time);
                    if (!stats.has(name)) stats.set(name, { name, hours: 0, locBreakdown: {} });
                    const s = stats.get(name);
                    s.hours += h;
                    s.locBreakdown[r.location] = (s.locBreakdown[r.location] || 0) + h;
                });
            });
        });
        return Array.from(stats.values()).sort((a, b) => b.hours - a.hours);
    }

    filterByMonth(data, year, month) {
        return data.filter(d => d.dateObj.getFullYear() == year && (d.dateObj.getMonth() + 1) == month);
    }

    getLocationKey(location) {
        if (location === 'Oświęcim') return 'oswiecim';
        if (location === 'Osiek') return 'osiek';
        if (location === 'Wilamowice') return 'wilamowice';
        return '';
    }
}

export const analytics = new AnalyticsService();
