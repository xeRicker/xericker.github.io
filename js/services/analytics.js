import { calculateHours } from '../utils.js';

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
                    oswiecim: 0, wilamowice: 0, total: 0,
                    oswiecimCard: 0, wilamowiceCard: 0, cardTotal: 0,
                    rawReports: []
                });
            }
            const entry = map.get(r.date);
            const rev = r.revenue || 0;
            const card = r.cardRevenue || 0;

            if (r.location === 'Oświęcim') { entry.oswiecim += rev; entry.oswiecimCard += card; }
            if (r.location === 'Wilamowice') { entry.wilamowice += rev; entry.wilamowiceCard += card; }

            entry.total += rev;
            entry.cardTotal += card;
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

    calculateProductStats(data) {
        const frequencies = {}; // Ile razy produkt wystąpił w raportach
        const quantities = {};  // Suma ilości (dla zamówień)

        data.forEach(d => d.rawReports.forEach(r => {
            if(r.products) Object.entries(r.products).forEach(([name, qty]) => {
                // 1. Zliczamy wystąpienia (częstotliwość zgłoszeń)
                if(!frequencies[name]) frequencies[name] = 0;
                frequencies[name]++;

                // 2. Zliczamy ilości - Z WYJĄTKIEM BUŁEK
                // Bułki w raporcie oznaczają "Stan magazynowy" (np. 25 sztuk zostało),
                // więc sumowanie ich (25 + 30 + 20...) dałoby bezsensowny wynik 75.
                // Pozostałe produkty traktujemy jako "Do kupienia/Zużyte", więc je sumujemy.
                if (!name.toLowerCase().includes("bułki")) {
                    if(!quantities[name]) quantities[name] = 0;
                    quantities[name] += qty;
                }
            });
        }));

        // Konwersja do tablic i sortowanie
        const requestsChartData = Object.entries(frequencies)
            .map(([name, val]) => ({ name, val }))
            .sort((a, b) => b.val - a.val)
            .slice(0, 10); // Bierzemy tylko TOP 10 najczęściej zgłaszanych

        const countsChartData = Object.entries(quantities)
            .map(([name, val]) => ({ name, val }))
            .sort((a, b) => b.val - a.val)
            .slice(0, 10); // Bierzemy tylko TOP 10 pod względem ilości

        return {
            requests: requestsChartData, // Wykres "Najczęściej zgłaszane"
            counts: countsChartData      // Wykres "Największe zapotrzebowanie (ilość)"
        };
    }

    filterByMonth(data, year, month) {
        return data.filter(d => d.dateObj.getFullYear() == year && (d.dateObj.getMonth() + 1) == month);
    }
}

export const analytics = new AnalyticsService();