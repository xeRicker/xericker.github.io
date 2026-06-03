import { GITHUB_CONFIG } from '../config/config.js';
import { isLocalhost } from '../utils.js';
import { getMonthKeyFromReportDate, getMonthKeyFromReportFileName } from './reportDates.js';

class ApiService {
    constructor() {
        this.baseUrl = `https://api.github.com/repos/${GITHUB_CONFIG.REPO_OWNER}/${GITHUB_CONFIG.REPO_NAME}/contents/`;
        this.headers = {
            'Authorization': `token ${GITHUB_CONFIG.TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
        };
    }

    hasGithubToken() {
        return Boolean(GITHUB_CONFIG.TOKEN && GITHUB_CONFIG.TOKEN !== '__GH_TOKEN__');
    }

    async checkFileExists(location, date) {
        if (isLocalhost()) {
            const localPath = `database/${location.toLowerCase()}/${date}.json`;
            try {
                const response = await fetch(localPath, { method: 'HEAD' });
                return response.ok;
            } catch {
                return false;
            }
        }
        const url = `${this.baseUrl}database/${location.toLowerCase()}/${date}.json`;
        try {
            const response = await fetch(url, { method: 'GET', headers: this.headers });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async saveReport(data) {
        if (isLocalhost()) {
            await this.saveLocalJson(`database/${data.location.toLowerCase()}/${data.date}.json`, data, 'Local report save failed.');
            return;
        }
        const filePath = `database/${data.location.toLowerCase()}/${data.date}.json`;
        const url = `${this.baseUrl}${filePath}`;

        let sha;
        try {
            const getRes = await fetch(url, { method: 'GET', headers: this.headers });
            if (getRes.ok) {
                const json = await getRes.json();
                sha = json.sha;
            }
        } catch (e) {}

        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        const body = { message: `Update ${data.location} ${data.date}`, content, sha };

        const res = await fetch(url, { method: 'PUT', headers: this.headers, body: JSON.stringify(body) });
        if (!res.ok) throw new Error("GitHub Save Failed");
    }

    async fetchProducts() {
        const path = 'database/products.json';

        try {
            if (this.hasGithubToken()) {
                const githubProducts = await this.fetchGithubProducts(path);
                if (githubProducts) return githubProducts;
            }

            if (isLocalhost()) {
                return this.fetchLocalProducts(path);
            }

            return null;
        } catch (error) {
            console.warn('Products config unavailable, falling back to defaults.', error);
            return null;
        }
    }

    async fetchGithubProducts(path) {
        const response = await fetch(`${this.baseUrl}${path}?v=${Date.now()}`, { headers: this.headers });
        if (!response.ok) return null;
        const file = await response.json();
        if (file.content) {
            return JSON.parse(decodeURIComponent(escape(atob(file.content))));
        }
        return null;
    }

    async fetchLocalProducts(path) {
        const response = await fetch(`${path}?v=${Date.now()}`);
        return response.ok ? response.json() : null;
    }

    async saveProducts(data) {
        const filePath = 'database/products.json';
        if (this.hasGithubToken()) {
            await this.saveGithubProducts(filePath, data);
            return;
        }

        if (isLocalhost()) {
            await this.saveLocalProducts(filePath, data);
            return;
        }

        throw new Error("GitHub token is not configured");
    }

    async saveGithubProducts(filePath, data) {
        const url = `${this.baseUrl}${filePath}`;
        let sha;

        try {
            const getRes = await fetch(url, { method: 'GET', headers: this.headers });
            if (getRes.ok) {
                const json = await getRes.json();
                sha = json.sha;
            }
        } catch (e) {}

        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        const body = { message: 'Update products catalog', content, sha };
        const res = await fetch(url, { method: 'PUT', headers: this.headers, body: JSON.stringify(body) });
        if (!res.ok) throw new Error("GitHub Products Save Failed");
    }

    async saveLocalProducts(filePath, data) {
        await this.saveLocalJson(filePath, data, "Local products save failed. Uruchom lokalny dev-server z obslugą PUT.");
    }

    async saveLocalJson(filePath, data, message) {
        const res = await fetch(filePath, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data, null, 2)
        });

        if (!res.ok) {
            throw new Error(message);
        }
    }

    getRecentMonthKeys(count = 2, referenceDate = new Date()) {
        return Array.from({ length: count }, (_, index) => {
            const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - index, 1);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        });
    }

    getMonthKeyFromDateString(dateString) {
        return getMonthKeyFromReportDate(dateString);
    }

    getMonthKeyFromFileName(fileName) {
        return getMonthKeyFromReportFileName(fileName);
    }

    filterReportsByRecentMonths(reports, monthCount = 2) {
        const monthKeys = new Set(this.getRecentMonthKeys(monthCount));
        return reports.filter(report => monthKeys.has(this.getMonthKeyFromDateString(report?.date)));
    }

    reportProgress(onProgress, loaded, total) {
        if (typeof onProgress === 'function') {
            onProgress({
                loaded,
                total,
                percent: total ? Math.round((loaded / total) * 100) : 0
            });
        }
    }

    async fetchAllData(options = {}) {
        const { recentMonths = null, onProgress = null } = options;
        if (isLocalhost()) {
            try {
                const params = new URLSearchParams({ v: Date.now() });
                if (recentMonths) params.set('recentMonths', recentMonths);
                const response = await fetch(`__local-data?${params.toString()}`);
                if (response.ok) {
                    const localData = await response.json();
                    if (Array.isArray(localData) && localData.length) {
                        this.reportProgress(onProgress, localData.length, localData.length);
                        return localData;
                    }
                }
            } catch (error) {
                console.warn('Local data endpoint unavailable, using mock data.', error);
            }
            const mockData = await this.getMockData();
            const data = recentMonths ? this.filterReportsByRecentMonths(mockData, recentMonths) : mockData;
            this.reportProgress(onProgress, data.length, data.length);
            return data;
        }

        try {
            const locRes = await fetch(`${this.baseUrl}database`, { headers: this.headers });
            if (!locRes.ok) return [];
            const locations = (await locRes.json()).filter(i => i.type === 'dir');
            const monthKeys = recentMonths ? new Set(this.getRecentMonthKeys(recentMonths)) : null;

            const filesByLocation = await Promise.all(locations.map(async loc => {
                const filesRes = await fetch(loc.url, { headers: this.headers });
                if (!filesRes.ok) return [];
                return (await filesRes.json())
                    .filter(f => f.name.endsWith('.json'))
                    .filter(f => !monthKeys || monthKeys.has(this.getMonthKeyFromFileName(f.name)));
            }));

            const files = filesByLocation.flat();
            let loaded = 0;
            this.reportProgress(onProgress, loaded, files.length);

            const results = await Promise.all(files.map(async f => {
                try {
                    const r = await fetch(f.download_url);
                    return r.ok ? await r.json() : null;
                } finally {
                    loaded += 1;
                    this.reportProgress(onProgress, loaded, files.length);
                }
            }));

            return results.filter(Boolean);
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    getMockData() {
        const data = [];
        const locs = ['Oświęcim', 'Osiek'];
        const emps = ["Paweł", "Radek", "Sebastian", "Tomek", "Kacper", "Natalia", "Dominik"];
        const mockCatalog = ["Bułki", "Mięso: Duże", "Frytki", "Pepsi", "Folia", "Serwetki", "Torby: Duże", "Sos: Czosnek"];

        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        for (let d = new Date(startDate), i = 0; d <= endDate; d.setDate(d.getDate() + 1), i++) {
            const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
            const weekday = d.getDay();

            locs.forEach((location, locationIndex) => {
                const seed = i + (locationIndex * 7);
                const revenue = 1250 + ((seed * 173) % 2800) + (weekday === 0 || weekday === 6 ? 650 : 0);
                const employees = {};
                const firstEmployee = emps[seed % emps.length];
                const secondEmployee = emps[(seed + 3) % emps.length];
                const firstStart = weekday === 0 ? '13:00' : '12:00';
                const firstEnd = weekday === 5 || weekday === 6 ? '21:30' : '20:00';
                const secondStart = weekday === 0 ? '14:00' : '16:00';
                const secondEnd = weekday === 5 || weekday === 6 ? '22:00' : '20:30';

                employees[firstEmployee] = `${firstStart}-${firstEnd}`;
                employees[secondEmployee] = `${secondStart}-${secondEnd}`;

                const products = mockCatalog.reduce((acc, name, productIndex) => {
                    acc[name] = name === 'Bułki'
                        ? 18 + ((seed + productIndex) % 34)
                        : 1 + ((seed + productIndex) % 8);
                    return acc;
                }, {});

                data.push({
                    location,
                    date: dateStr,
                    revenue,
                    cardRevenue: Math.round(revenue * (0.34 + ((seed % 8) / 100))),
                    glovoRevenue: Math.round(revenue * (0.09 + ((seed % 6) / 100))),
                    employees,
                    products
                });
            });
        }
        return Promise.resolve(data);
    }
}

export const apiService = new ApiService();
