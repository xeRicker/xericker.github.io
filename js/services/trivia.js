import { calculateHours, formatMoney } from '../utils.js';

export class TriviaService {
    constructor() {
        this.generators = [
            this.highestRevenueDay,
            this.totalHoursWorked,
            this.locationBattle,
            this.weekendWarrior,
            this.longestShift,
            this.averageFriday,
            this.cardVsCash,
            this.mostShifts,
            this.bestWeekday,
            this.nightOwl,
            this.cashKing,
            this.locationLoyalty,
            this.bestWeekend
        ];
    }

    generate(data, limit = 10) {
        if (!data || data.length === 0) return [];

        const available = this.generators
            .map(gen => gen.call(this, data))
            .filter(Boolean);

        return available.sort(() => 0.5 - Math.random()).slice(0, limit);
    }

    highestRevenueDay(data) {
        const best = data.reduce((max, d) => d.total > max.total ? d : max, data[0]);
        return {
            icon: '🏆',
            title: 'Rekordowy Dzień',
            text: `Najlepszy utarg odnotowano <strong>${best.dateStr}</strong>. Wyniósł on <strong>${formatMoney(best.total)}</strong>!`
        };
    }

    totalHoursWorked(data) {
        let total = 0;
        data.forEach(d => d.rawReports.forEach(r => {
            if(r.employees) Object.values(r.employees).forEach(t => total += calculateHours(t));
        }));
        return {
            icon: '⏱️',
            title: 'Pracowita Ekipa',
            text: `W wybranym okresie pracownicy przepracowali łącznie <strong>${total.toFixed(1)} godzin</strong>.`
        };
    }

    locationBattle(data) {
        const osw = data.reduce((s, d) => s + d.oswiecim, 0);
        const wil = data.reduce((s, d) => s + d.wilamowice, 0);
        const winner = osw > wil ? "Oświęcim" : "Wilamowice";
        const diff = Math.abs(osw - wil);

        return {
            icon: '⚔️',
            title: 'Pojedynek Lokali',
            text: `Liderem sprzedaży jest <strong>${winner}</strong>, wyprzedzając drugi lokal o <strong>${formatMoney(diff)}</strong>.`
        };
    }

    weekendWarrior(data) {
        const workers = {};
        data.forEach(d => {
            const isWeekend = ['piątek', 'sobota', 'niedziela'].includes(d.dayOfWeek);
            if (!isWeekend) return;
            d.rawReports.forEach(r => {
                if(r.employees) Object.entries(r.employees).forEach(([name, t]) => {
                    workers[name] = (workers[name] || 0) + calculateHours(t);
                });
            });
        });

        const entries = Object.entries(workers);
        if (entries.length === 0) return null;
        const best = entries.reduce((a, b) => a[1] > b[1] ? a : b);

        return {
            icon: '🔥',
            title: 'Weekendowy Wojownik',
            text: `<strong>${best[0]}</strong> to król weekendów! Przepracował(a) w nie aż <strong>${best[1].toFixed(1)}h</strong>.`
        };
    }

    longestShift(data) {
        let maxH = 0;
        let empName = '';
        let date = '';

        data.forEach(d => d.rawReports.forEach(r => {
            if(r.employees) Object.entries(r.employees).forEach(([name, t]) => {
                const h = calculateHours(t);
                if (h > maxH) { maxH = h; empName = name; date = d.dateStr; }
            });
        }));

        if (maxH === 0) return null;

        return {
            icon: '💪',
            title: 'Najdłuższa Zmiana',
            text: `Najdłuższą zmianę zaliczył(a) <strong>${empName}</strong> w dniu ${date}. Trwała ona <strong>${maxH.toFixed(1)}h</strong>.`
        };
    }

    averageFriday(data) {
        const fridays = data.filter(d => d.dayOfWeek === 'piątek');
        if (fridays.length === 0) return null;
        const avg = fridays.reduce((s, d) => s + d.total, 0) / fridays.length;

        return {
            icon: '🍔',
            title: 'Piątkowy Szał',
            text: `Średni utarg w piątki wynosi <strong>${formatMoney(avg)}</strong>. To dobry dzień na burgery!`
        };
    }

    cardVsCash(data) {
        const total = data.reduce((s, d) => s + d.total, 0);
        const card = data.reduce((s, d) => s + d.cardTotal, 0);
        if (total === 0) return null;
        const pct = (card / total) * 100;

        return {
            icon: '💳',
            title: 'Karta czy Gotówka?',
            text: `Płatności kartą stanowią <strong>${pct.toFixed(1)}%</strong> całego utargu w tym okresie.`
        };
    }

    mostShifts(data) {
        const counts = {};
        data.forEach(d => d.rawReports.forEach(r => {
            if(r.employees) Object.keys(r.employees).forEach(name => {
                counts[name] = (counts[name] || 0) + 1;
            });
        }));

        const entries = Object.entries(counts);
        if (entries.length === 0) return null;
        const best = entries.reduce((a, b) => a[1] > b[1] ? a : b);

        return {
            icon: '🐝',
            title: 'Pracowita Pszczółka',
            text: `Najwięcej dni w pracy zaliczył(a) <strong>${best[0]}</strong>. Pojawił(a) się w grafiku aż <strong>${best[1]} razy</strong>.`
        };
    }

    bestWeekday(data) {
        const days = {};
        data.forEach(d => {
            if (!days[d.dayOfWeek]) days[d.dayOfWeek] = { sum: 0, count: 0 };
            days[d.dayOfWeek].sum += d.total;
            days[d.dayOfWeek].count++;
        });

        let bestDay = '';
        let maxAvg = 0;

        Object.entries(days).forEach(([day, stats]) => {
            const avg = stats.sum / stats.count;
            if (avg > maxAvg) { maxAvg = avg; bestDay = day; }
        });

        if (!bestDay) return null;

        return {
            icon: '📅',
            title: 'Złoty Dzień',
            text: `Statystycznie najlepszym dniem tygodnia jest <strong>${bestDay}</strong> ze średnim utargiem <strong>${formatMoney(maxAvg)}</strong>.`
        };
    }

    nightOwl(data) {
        const lateWorkers = {};
        data.forEach(d => d.rawReports.forEach(r => {
            if(r.employees) Object.entries(r.employees).forEach(([name, time]) => {
                const parts = time.split('-');
                if (parts.length === 2) {
                    const endHour = parseInt(parts[1].trim().split(':')[0]);
                    if (endHour >= 21 || endHour < 4) {
                        lateWorkers[name] = (lateWorkers[name] || 0) + 1;
                    }
                }
            });
        }));

        const entries = Object.entries(lateWorkers);
        if (entries.length === 0) return null;
        const best = entries.reduce((a, b) => a[1] > b[1] ? a : b);

        return {
            icon: '🦉',
            title: 'Nocny Marek',
            text: `<strong>${best[0]}</strong> najczęściej zamyka lokal. Zmian kończących się po 21:00 miał(a) aż <strong>${best[1]}</strong>.`
        };
    }

    cashKing(data) {
        let maxCashPct = 0;
        let bestDate = '';

        data.forEach(d => {
            if (d.total > 500) {
                const cash = d.total - d.cardTotal;
                const pct = (cash / d.total) * 100;
                if (pct > maxCashPct) { maxCashPct = pct; bestDate = d.dateStr; }
            }
        });

        if (maxCashPct === 0) return null;

        return {
            icon: '💵',
            title: 'Król Gotówki',
            text: `Dnia <strong>${bestDate}</strong> gotówka stanowiła aż <strong>${maxCashPct.toFixed(1)}%</strong> utargu.`
        };
    }

    locationLoyalty(data) {
        const empLocs = {};
        data.forEach(d => d.rawReports.forEach(r => {
            if(r.employees) Object.keys(r.employees).forEach(name => {
                if (!empLocs[name]) empLocs[name] = new Set();
                empLocs[name].add(r.location);
            });
        }));

        const loyal = Object.entries(empLocs).filter(([_, set]) => set.size === 1);
        if (loyal.length === 0) return null;

        const randomLoyal = loyal[Math.floor(Math.random() * loyal.length)];
        const locName = Array.from(randomLoyal[1])[0];

        return {
            icon: '🏰',
            title: 'Lokalny Patriota',
            text: `<strong>${randomLoyal[0]}</strong> w tym okresie pracował(a) wyłącznie w lokalizacji <strong>${locName}</strong>.`
        };
    }

    bestWeekend(data) {
        const weekends = {};
        data.forEach(d => {
            if (['sobota', 'niedziela'].includes(d.dayOfWeek)) {
                const date = new Date(d.dateObj);
                const onejan = new Date(date.getFullYear(), 0, 1);
                const week = Math.ceil((((date - onejan) / 86400000) + onejan.getDay() + 1) / 7);
                const key = `${date.getFullYear()}-W${week}`;

                if (!weekends[key]) weekends[key] = { sum: 0, dates: [] };
                weekends[key].sum += d.total;
                weekends[key].dates.push(d.dateStr);
            }
        });

        const entries = Object.values(weekends);
        if (entries.length === 0) return null;
        const best = entries.reduce((a, b) => a.sum > b.sum ? a : b);

        return {
            icon: '🚀',
            title: 'Weekend Marzeń',
            text: `Najlepszy weekend to <strong>${best.dates[0]}</strong>. Łączny utarg wyniósł wtedy <strong>${formatMoney(best.sum)}</strong>.`
        };
    }
}

export const triviaService = new TriviaService();