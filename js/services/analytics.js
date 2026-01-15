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

    filterByMonth(data, year, month) {
        return data.filter(d => d.dateObj.getFullYear() == year && (d.dateObj.getMonth() + 1) == month);
    }
}

export const analytics = new AnalyticsService();