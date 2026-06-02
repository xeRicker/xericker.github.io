import { GITHUB_CONFIG } from '../config/config.js';
import { isLocalhost } from '../utils.js';

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
        if (isLocalhost()) return false;
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
            console.log("LOCALHOST SAVE:", data);
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
        const res = await fetch(filePath, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data, null, 2)
        });

        if (!res.ok) {
            throw new Error("Local products save failed. Uruchom lokalny dev-server z obslugą PUT.");
        }
    }

    async fetchAllData() {
        if (isLocalhost()) return this.getMockData();

        try {
            const locRes = await fetch(`${this.baseUrl}database`, { headers: this.headers });
            if (!locRes.ok) return [];
            const locations = (await locRes.json()).filter(i => i.type === 'dir');

            const promises = locations.map(async loc => {
                const filesRes = await fetch(loc.url, { headers: this.headers });
                if (!filesRes.ok) return [];
                const files = await filesRes.json();
                return Promise.all(files.filter(f => f.name.endsWith('.json')).map(async f => {
                    const r = await fetch(f.download_url);
                    return r.ok ? r.json() : null;
                }));
            });

            const results = await Promise.all(promises);
            return results.flat().filter(Boolean);
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
