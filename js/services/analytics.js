import { calculateHours } from '../utils.js';
import { calculateCashDesk, calculateEffectiveRevenue, calculateGlovoNet } from './revenue.js';
import { parseReportDate } from './reportDates.js';
import { slugifyLocation } from './locations.js?v=168';

class AnalyticsService {
    processReports(reports) {
        const map = new Map();
        reports
            .filter(r => r?.date && r?.location)
            .forEach(r => {
            if (!map.has(r.date)) {
                const dateObj = parseReportDate(r.date);
                if (!dateObj) return;
                map.set(r.date, {
                    dateStr: r.date,
                    dateObj,
                    timestamp: dateObj.getTime(),
                    dayOfWeek: dateObj.toLocaleDateString('pl-PL', { weekday: 'long' }),
                    total: 0,
                    cardTotal: 0,
                    cashTotal: 0,
                    glovoTotal: 0,
                    glovoNetTotal: 0,
                    cashDeskTotal: 0,
                    locations: {},
                    rawReports: []
                });
            }
            const entry = map.get(r.date);
            const revGross = r.revenue ?? r.revenueGross ?? 0;
            const card = r.cardRevenue || 0;
            const glovo = r.glovoRevenue || 0;
            const glovoNet = calculateGlovoNet(glovo);
            const rev = calculateEffectiveRevenue(revGross, glovo);
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
                if (!(locationKey in entry)) {
                    entry[locationKey] = 0;
                    entry[`${locationKey}Card`] = 0;
                    entry[`${locationKey}Cash`] = 0;
                    entry[`${locationKey}Glovo`] = 0;
                    entry[`${locationKey}GlovoNet`] = 0;
                }
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
        return slugifyLocation(location);
    }

    getMonthKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    getLastFullMonth(data, reference = new Date()) {
        const referenceKey = this.getMonthKey(reference);
        const months = new Map();

        data.forEach(day => {
            if (!day.dateObj) return;
            const key = this.getMonthKey(day.dateObj);
            if (key >= referenceKey) return;
            if (!months.has(key)) {
                months.set(key, {
                    key,
                    year: day.dateObj.getFullYear(),
                    month: day.dateObj.getMonth() + 1,
                    total: 0
                });
            }
            months.get(key).total += day.total;
        });

        const latest = Array.from(months.values()).sort((left, right) => right.key.localeCompare(left.key))[0];
        if (!latest) return null;

        const days = new Date(latest.year, latest.month, 0).getDate();
        return { ...latest, days, averageDay: latest.total / days };
    }

    getRecentTrend(data, windowSize = 7) {
        const days = [...data].sort((left, right) => left.timestamp - right.timestamp);
        if (days.length < windowSize * 2) return null;

        const recent = this.getAverageDay(days.slice(-windowSize));
        const previous = this.getAverageDay(days.slice(-windowSize * 2, -windowSize));
        if (!previous) return null;

        return {
            windowSize,
            recent,
            previous,
            percent: ((recent - previous) / previous) * 100
        };
    }

    getAverageDay(days) {
        return days.reduce((sum, day) => sum + day.total, 0) / days.length;
    }

    getTargetComparison(averageDay, target) {
        if (!target) return null;
        const difference = averageDay - target;
        return {
            target,
            difference,
            percent: (difference / target) * 100,
            isBelow: difference < 0
        };
    }
}

export const analytics = new AnalyticsService();
