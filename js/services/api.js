import { GITHUB_CONFIG } from '../config/config.js';
import { isLocalhost } from '../utils.js';
import { getMonthKeyFromReportDate, getMonthKeyFromReportFileName } from './reportDates.js';

class ApiService {
    constructor() {
        this.baseUrl = `https://api.github.com/repos/${GITHUB_CONFIG.REPO_OWNER}/${GITHUB_CONFIG.REPO_NAME}/contents/`;
        this.headers = {
            'Accept': 'application/vnd.github+json',
        };
        if (this.hasGithubToken()) this.headers.Authorization = `Bearer ${GITHUB_CONFIG.TOKEN}`;
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
        const response = await this.fetchGithub(url, { method: 'GET', headers: this.headers }, `database/${location.toLowerCase()}/${date}.json`);
        if (response.status === 404) return false;
        if (!response.ok) throw await this.createGithubApiError(response, `database/${location.toLowerCase()}/${date}.json`);
        return true;
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

        const res = await this.fetchGithub(url, { method: 'PUT', headers: this.headers, body: JSON.stringify(body) }, filePath);
        if (!res.ok) throw await this.createGithubApiError(res, filePath);
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
        const res = await this.fetchGithub(url, { method: 'PUT', headers: this.headers, body: JSON.stringify(body) }, filePath);
        if (!res.ok) throw await this.createGithubApiError(res, filePath);
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
        const monthKeys = new Set(
            Array.from(new Set(reports
                .map(report => this.getMonthKeyFromDateString(report?.date))
                .filter(Boolean)))
                .sort()
                .reverse()
                .slice(0, monthCount)
        );
        return reports.filter(report => monthKeys.has(this.getMonthKeyFromDateString(report?.date)));
    }

    getRecentAvailableMonthKeys(files, monthCount) {
        return new Set(Array.from(new Set(files
            .map(file => this.getMonthKeyFromFileName(file.name))
            .filter(Boolean)))
            .sort()
            .reverse()
            .slice(0, monthCount));
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

    reportMeta(onMeta, loadedMonths, availableMonths) {
        if (typeof onMeta === 'function') onMeta({ loadedMonths, availableMonths });
    }

    async fetchGithub(url, options, resource) {
        const maxAttempts = 3;
        const requestTimeoutMs = 15000;
        let lastNetworkError;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);
                const response = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(timeoutId);
                const retryable = response.status === 429 || response.status === 503;
                if (!retryable || attempt === maxAttempts) return response;

                const retryAfter = Number(response.headers.get('retry-after'));
                const delay = Number.isFinite(retryAfter) && retryAfter > 0
                    ? retryAfter * 1000
                    : attempt * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            } catch (error) {
                lastNetworkError = error;
                if (attempt < maxAttempts) await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            }
        }

        const error = new Error(`Nie udało się połączyć z GitHub podczas pobierania ${resource}.`);
        error.cause = lastNetworkError;
        error.resource = resource;
        throw error;
    }

    async mapWithConcurrency(items, limit, mapper) {
        const results = new Array(items.length);
        let nextIndex = 0;

        const worker = async () => {
            while (nextIndex < items.length) {
                const index = nextIndex;
                nextIndex += 1;
                results[index] = await mapper(items[index], index);
            }
        };

        await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
        return results;
    }

    async createGithubApiError(response, resource) {
        let details = '';

        try {
            const payload = await response.json();
            details = payload?.message ? `: ${payload.message}` : '';
        } catch {
            // The HTTP status is still enough to explain the failed request.
        }

        const error = new Error(`GitHub API (${resource}) zwróciło błąd HTTP ${response.status}${details}`);
        error.status = response.status;
        error.resource = resource;
        return error;
    }

    async fetchAllData(options = {}) {
        const { recentMonths = null, onProgress = null, onMeta = null } = options;
        if (isLocalhost()) {
            try {
                const params = new URLSearchParams({ v: Date.now() });
                const response = await fetch(`__local-data?${params.toString()}`);
                if (response.ok) {
                    const localData = await response.json();
                    if (Array.isArray(localData) && localData.length) {
                        const availableMonthKeys = new Set(localData.map(report => this.getMonthKeyFromDateString(report?.date)).filter(Boolean));
                        const data = recentMonths ? this.filterReportsByRecentMonths(localData, recentMonths) : localData;
                        this.reportMeta(onMeta, new Set(data.map(report => this.getMonthKeyFromDateString(report?.date)).filter(Boolean)).size, availableMonthKeys.size);
                        this.reportProgress(onProgress, data.length, data.length);
                        return data;
                    }
                }
            } catch (error) {
                console.warn('Local data endpoint unavailable, using mock data.', error);
            }
            const mockData = await this.getMockData();
            const data = recentMonths ? this.filterReportsByRecentMonths(mockData, recentMonths) : mockData;
            this.reportMeta(onMeta, new Set(data.map(report => this.getMonthKeyFromDateString(report?.date)).filter(Boolean)).size, new Set(mockData.map(report => this.getMonthKeyFromDateString(report?.date)).filter(Boolean)).size);
            this.reportProgress(onProgress, data.length, data.length);
            return data;
        }

        const locRes = await this.fetchGithub(`${this.baseUrl}database`, { headers: this.headers }, 'database');
        if (!locRes.ok) throw await this.createGithubApiError(locRes, 'database');

        const locations = (await locRes.json()).filter(i => i.type === 'dir');
        const filesByLocation = await Promise.all(locations.map(async loc => {
            const filesRes = await this.fetchGithub(loc.url, { headers: this.headers }, `database/${loc.name}`);
            if (!filesRes.ok) throw await this.createGithubApiError(filesRes, `database/${loc.name}`);
            return (await filesRes.json())
                .filter(f => f.name.endsWith('.json'));
        }));

        const availableFiles = filesByLocation.flat();
        const availableMonthKeys = new Set(availableFiles.map(file => this.getMonthKeyFromFileName(file.name)).filter(Boolean));
        const monthKeys = recentMonths ? this.getRecentAvailableMonthKeys(availableFiles, recentMonths) : null;
        const files = monthKeys
            ? availableFiles.filter(file => monthKeys.has(this.getMonthKeyFromFileName(file.name)))
            : availableFiles;
        this.reportMeta(onMeta, monthKeys ? new Set(files.map(file => this.getMonthKeyFromFileName(file.name)).filter(Boolean)).size : availableMonthKeys.size, availableMonthKeys.size);
        let loaded = 0;
        this.reportProgress(onProgress, loaded, files.length);

        const results = await this.mapWithConcurrency(files, 3, async f => {
            try {
                const response = await this.fetchGithub(f.download_url, {}, f.path || f.name);
                if (!response.ok) throw await this.createGithubApiError(response, f.path || f.name);
                return await response.json();
            } finally {
                loaded += 1;
                this.reportProgress(onProgress, loaded, files.length);
            }
        });

        return results;
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
