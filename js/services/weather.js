const OSWIECIM_COORDS = {
    latitude: 50.0344,
    longitude: 19.2104
};

const WEATHER_CODE_LABELS = {
    0: 'Bezchmurnie',
    1: 'Przeważnie słonecznie',
    2: 'Częściowe zachmurzenie',
    3: 'Pochmurno',
    45: 'Mgła',
    48: 'Szadź i mgła',
    51: 'Lekka mżawka',
    53: 'Mżawka',
    55: 'Silna mżawka',
    56: 'Lekka marznąca mżawka',
    57: 'Marznąca mżawka',
    61: 'Lekki deszcz',
    63: 'Deszcz',
    65: 'Mocny deszcz',
    66: 'Lekki marznący deszcz',
    67: 'Marznący deszcz',
    71: 'Lekki śnieg',
    73: 'Śnieg',
    75: 'Mocny śnieg',
    77: 'Ziarnisty śnieg',
    80: 'Przelotne opady',
    81: 'Silniejsze przelotne opady',
    82: 'Ulewy',
    85: 'Przelotny śnieg',
    86: 'Mocny śnieg z przelotami',
    95: 'Burza',
    96: 'Burza z gradem',
    99: 'Silna burza z gradem'
};

class WeatherService {
    constructor() {
        this.cache = new Map();
    }

    async enrichReports(data) {
        const uniqueDates = [...new Set(data.map(entry => this.toIsoDate(entry.dateStr)))].filter(Boolean);
        if (!uniqueDates.length) return data;

        const weatherMap = await this.fetchWeatherMap(uniqueDates);
        return data.map(entry => {
            const weather = weatherMap.get(this.toIsoDate(entry.dateStr)) || null;
            return {
                ...entry,
                weather
            };
        });
    }

    async fetchWeatherMap(isoDates) {
        const uncachedDates = isoDates.filter(date => !this.cache.has(date));
        if (uncachedDates.length) {
            const from = uncachedDates.reduce((min, date) => date < min ? date : min, uncachedDates[0]);
            const to = uncachedDates.reduce((max, date) => date > max ? date : max, uncachedDates[0]);
            const url = new URL('https://archive-api.open-meteo.com/v1/archive');
            url.searchParams.set('latitude', OSWIECIM_COORDS.latitude);
            url.searchParams.set('longitude', OSWIECIM_COORDS.longitude);
            url.searchParams.set('start_date', from);
            url.searchParams.set('end_date', to);
            url.searchParams.set('timezone', 'Europe/Warsaw');
            url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_hours');

            try {
                const response = await fetch(url);
                if (response.ok) {
                    const payload = await response.json();
                    const daily = payload.daily || {};
                    (daily.time || []).forEach((date, index) => {
                        this.cache.set(date, {
                            code: daily.weather_code?.[index] ?? null,
                            label: this.getWeatherLabel(daily.weather_code?.[index]),
                            tempMax: daily.temperature_2m_max?.[index] ?? null,
                            tempMin: daily.temperature_2m_min?.[index] ?? null,
                            precipitationSum: daily.precipitation_sum?.[index] ?? 0,
                            precipitationHours: daily.precipitation_hours?.[index] ?? 0
                        });
                    });
                }
            } catch (error) {
                console.error('Weather fetch failed', error);
            }

            uncachedDates.forEach(date => {
                if (!this.cache.has(date)) this.cache.set(date, null);
            });
        }

        return new Map(isoDates.map(date => [date, this.cache.get(date) || null]));
    }

    getWeatherLabel(code) {
        return WEATHER_CODE_LABELS[code] || 'Brak danych';
    }

    toIsoDate(dateStr) {
        if (!dateStr) return null;
        const [day, month, year] = dateStr.split('.');
        if (!day || !month || !year) return null;
        return `${year}-${month}-${day}`;
    }
}

export const weatherService = new WeatherService();
