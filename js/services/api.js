import { GITHUB_CONFIG } from '../config/config.js';
import { isLocalhost } from '../utils.js';
import { getMonthKeyFromReportDate, getMonthKeyFromReportFileName, getReportKey } from './reportDates.js';
import { generateMockReports } from './mockData.js?v=101';
import { reportCache } from './reportCache.js?v=102';

const FILE_FETCH_CONCURRENCY = 10;
const REPORT_INDEX_KEY = 'report-index';
const READ_RESOURCE_LABELS = {
    Products: 'produkty',
    Employees: 'ekipa',
    Locations: 'punkty',
    Payments: 'opłaty',
    Settings: 'ustawienia',
    'Report index': 'lista raportów'
};

class ApiService {
    constructor() {
        this.repoUrl = `https://api.github.com/repos/${GITHUB_CONFIG.REPO_OWNER}/${GITHUB_CONFIG.REPO_NAME}`;
        this.baseUrl = `${this.repoUrl}/contents/`;
        this.failedReads = [];
        this.headers = {
            'Accept': 'application/vnd.github+json',
        };
        if (this.hasGithubToken()) this.headers.Authorization = `Bearer ${GITHUB_CONFIG.TOKEN}`;
    }

    noteReadFailure(label) {
        const name = READ_RESOURCE_LABELS[label] || String(label);
        if (!this.failedReads.includes(name)) this.failedReads.push(name);
    }

    takeReadFailures() {
        const failures = this.failedReads;
        this.failedReads = [];
        return failures;
    }

    hasGithubToken() {
        return Boolean(GITHUB_CONFIG.TOKEN && GITHUB_CONFIG.TOKEN !== '__GH_TOKEN__');
    }

    getLocationFolder(data, folder) {
        return folder || String(data?.location || '').toLowerCase();
    }

    async checkFileExists(location, date, folder) {
        const directory = this.getLocationFolder({ location }, folder);
        if (isLocalhost()) {
            const localPath = `database/${directory}/${date}.json`;
            try {
                const response = await fetch(localPath, { method: 'HEAD' });
                return response.ok;
            } catch {
                return false;
            }
        }
        const url = `${this.baseUrl}database/${directory}/${date}.json`;
        const response = await this.fetchGithub(url, { method: 'GET', headers: this.headers }, `database/${directory}/${date}.json`);
        if (response.status === 404) return false;
        if (!response.ok) throw await this.createGithubApiError(response, `database/${directory}/${date}.json`);
        return true;
    }

    async saveReport(data, folder) {
        const directory = this.getLocationFolder(data, folder);
        if (isLocalhost()) {
            await this.saveLocalJson(`database/${directory}/${data.date}.json`, data, 'Local report save failed.');
            await reportCache.deleteEntry(REPORT_INDEX_KEY);
            return;
        }
        const filePath = `database/${directory}/${data.date}.json`;
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
        await reportCache.deleteEntry(REPORT_INDEX_KEY);
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
            this.noteReadFailure('Products');
            return null;
        }
    }

    async fetchGithubProducts(path) {
        const response = await fetch(`${this.baseUrl}${path}?v=${Date.now()}`, { headers: this.headers });
        if (!response.ok) {
            if (response.status !== 404) this.noteReadFailure('Products');
            return null;
        }
        const file = await response.json();
        if (file.content) {
            return JSON.parse(decodeURIComponent(escape(atob(file.content))));
        }
        return null;
    }

    async fetchLocalProducts(path) {
        const response = await fetch(`${path}?v=${Date.now()}`);
        if (!response.ok) {
            if (response.status !== 404) this.noteReadFailure('Products');
            return null;
        }
        return response.json();
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
        let response;
        try {
            response = await fetch(filePath, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data, null, 2)
            });
        } catch (error) {
            throw new Error(`${message} Serwer nie przyjął zapisu ${filePath}. Zapis lokalny działa tylko przez \`node dev-server.js\`.`);
        }

        if (!response.ok) {
            throw new Error(`${message} Serwer odpowiedział HTTP ${response.status} na zapis ${filePath}. Zapis lokalny działa tylko przez \`node dev-server.js\`.`);
        }

        await this.verifyLocalSave(filePath, data, message);
    }

    async verifyLocalSave(filePath, data, message) {
        const response = await fetch(`${filePath}?v=${Date.now()}`);
        if (!response.ok) {
            throw new Error(`${message} Nie można potwierdzić zapisu ${filePath} (HTTP ${response.status}).`);
        }
        const saved = await response.json().catch(() => null);
        if (JSON.stringify(saved) !== JSON.stringify(data)) {
            throw new Error(`${message} Plik ${filePath} nie zawiera danych, które zostały wysłane.`);
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

    getReportMonthKeys(reports) {
        return new Set(reports.map(report => this.getMonthKeyFromDateString(report?.date)).filter(Boolean));
    }

    pickRecentMonthKeys(monthKeys, monthCount) {
        return new Set(Array.from(monthKeys).sort().reverse().slice(0, monthCount));
    }

    async fetchReportIndex({ force = false } = {}) {
        if (isLocalhost()) return this.fetchLocalReportIndex();

        const cached = await reportCache.getEntry(REPORT_INDEX_KEY);
        const cachedIndex = cached?.data?.kind === 'github' ? cached.data : null;
        const token = await this.fetchReportToken();
        if (!force && cachedIndex && (!token || token === cachedIndex.token)) return cachedIndex;

        const index = await this.buildGithubReportIndex(token);
        await reportCache.putEntry(REPORT_INDEX_KEY, index);
        return index;
    }

    async fetchReportToken() {
        const url = `${this.repoUrl}/commits?path=database&per_page=1`;

        try {
            const response = await this.fetchGithub(url, { headers: this.headers }, 'database commits');
            if (!response.ok) return null;
            const commits = await response.json();
            return Array.isArray(commits) ? commits[0]?.sha || null : null;
        } catch (error) {
            console.warn('Report index token unavailable, using the cached listing.', error);
            return null;
        }
    }

    async buildGithubReportIndex(token = null) {
        const locRes = await this.fetchGithub(`${this.baseUrl}database`, { headers: this.headers }, 'database');
        if (!locRes.ok) throw await this.createGithubApiError(locRes, 'database');

        const locations = (await locRes.json()).filter(item => item.type === 'dir');
        const filesByLocation = await Promise.all(locations.map(async location => {
            const filesRes = await this.fetchGithub(location.url, { headers: this.headers }, `database/${location.name}`);
            if (!filesRes.ok) throw await this.createGithubApiError(filesRes, `database/${location.name}`);
            return (await filesRes.json()).filter(file => file.name.endsWith('.json'));
        }));

        return {
            kind: 'github',
            token: token || '',
            files: filesByLocation.flat()
                .map(file => ({
                    name: file.name,
                    path: file.path,
                    sha: file.sha,
                    download_url: file.download_url,
                    monthKey: this.getMonthKeyFromFileName(file.name)
                }))
                .filter(file => file.monthKey)
        };
    }

    async fetchLocalReportIndex() {
        const cached = await reportCache.getEntry(REPORT_INDEX_KEY);
        const cachedIndex = cached?.data?.kind === 'local' ? cached.data : null;
        const version = cachedIndex?.version ? `?version=${encodeURIComponent(cachedIndex.version)}` : '';

        try {
            const response = await fetch(`__local-data${version}`);
            if (response.status === 204 && cachedIndex) return cachedIndex;
            if (!response.ok) return cachedIndex || { kind: 'local', version: '', reports: [] };

            const payload = await response.json();
            const index = {
                kind: 'local',
                version: payload?.version || '',
                reports: Array.isArray(payload?.reports) ? payload.reports : []
            };
            await reportCache.putEntry(REPORT_INDEX_KEY, index);
            return index;
        } catch (error) {
            console.warn('Local data endpoint unavailable, using generated data.', error);
            return cachedIndex || { kind: 'local', version: '', reports: [] };
        }
    }

    async fetchEmployees() {
        return this.fetchRootCatalog('database/employees.json', 'Employees');
    }

    async fetchLocations() {
        return this.fetchRootCatalog('database/locations.json', 'Locations');
    }

    async fetchRootCatalog(path, label) {
        try {
            if (this.hasGithubToken()) {
                const response = await this.fetchGithub(`${this.baseUrl}${path}?v=${Date.now()}`, { headers: this.headers }, path);
                if (response.ok) {
                    const file = await response.json();
                    if (file.content) return JSON.parse(decodeURIComponent(escape(atob(file.content))));
                } else if (response.status !== 404) {
                    this.noteReadFailure(label);
                }
            }

            const staticResponse = await fetch(`${path}?v=${Date.now()}`);
            if (staticResponse.ok) return await staticResponse.json();
            if (staticResponse.status !== 404) this.noteReadFailure(label);

            if (isLocalhost()) {
                const response = await fetch(`${path}?v=${Date.now()}`);
                return response.ok ? response.json() : null;
            }
        } catch (error) {
            console.warn(`${label} config unavailable, falling back to defaults.`, error);
            this.noteReadFailure(label);
        }
        return null;
    }

    async saveEmployees(data) {
        const filePath = 'database/employees.json';
        if (this.hasGithubToken()) return this.saveGithubConfig(filePath, data, 'Update employees catalog');
        if (isLocalhost()) return this.saveLocalJson(filePath, data, 'Nie udało się zapisać ekipy.');
        throw new Error('Zapis do GitHuba nie jest skonfigurowany (brak tokenu).');
    }

    async saveLocations(data) {
        const filePath = 'database/locations.json';
        if (this.hasGithubToken()) return this.saveGithubConfig(filePath, data, 'Update locations catalog');
        if (isLocalhost()) return this.saveLocalJson(filePath, data, 'Nie udało się zapisać punktów.');
        throw new Error('Zapis do GitHuba nie jest skonfigurowany (brak tokenu).');
    }

    async fetchPayments() {
        return this.fetchRootCatalog('database/payments.json', 'Payments');
    }

    async savePayments(data) {
        const filePath = 'database/payments.json';
        if (this.hasGithubToken()) return this.saveGithubConfig(filePath, data, 'Update payments catalog');
        if (isLocalhost()) return this.saveLocalJson(filePath, data, 'Nie udało się zapisać opłat.');
        throw new Error('Zapis do GitHuba nie jest skonfigurowany (brak tokenu).');
    }

    async fetchSettings() {
        return this.fetchRootCatalog('database/settings.json', 'Settings');
    }

    async saveSettings(data) {
        const filePath = 'database/settings.json';
        if (this.hasGithubToken()) return this.saveGithubConfig(filePath, data, 'Update settings');
        if (isLocalhost()) return this.saveLocalJson(filePath, data, 'Nie udało się zapisać progu średniego utargu.');
        throw new Error('Zapis do GitHuba nie jest skonfigurowany (brak tokenu).');
    }

    async saveGithubConfig(filePath, data, message) {
        const url = `${this.baseUrl}${filePath}`;
        let sha;
        try { const response = await fetch(url, { headers: this.headers }); if (response.ok) sha = (await response.json()).sha; } catch {}
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        const response = await this.fetchGithub(url, { method: 'PUT', headers: this.headers, body: JSON.stringify({ message, content, sha }) }, filePath);
        if (!response.ok) throw await this.createGithubApiError(response, filePath);
        await this.verifyGithubSave(response, filePath, data);
    }

    async verifyGithubSave(response, filePath, data) {
        let saved;
        try {
            const file = await response.json();
            if (!file?.content) return;
            saved = JSON.parse(decodeURIComponent(escape(atob(file.content))));
        } catch {
            return;
        }
        if (JSON.stringify(saved) !== JSON.stringify(data)) {
            throw new Error(`GitHub zapisał ${filePath}, ale zawartość pliku różni się od wysłanej.`);
        }
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
        }

        const error = new Error(`GitHub API (${resource}) zwróciło błąd HTTP ${response.status}${details}`);
        error.status = response.status;
        error.resource = resource;
        return error;
    }

    async fetchAllData(options = {}) {
        const { recentMonths = null, onProgress = null, onMeta = null, force = false } = options;
        const index = await this.fetchReportIndex({ force });

        if (index.kind === 'local') {
            const merged = this.mergeLocalReports(index.reports, await this.getMockData());
            const availableMonthKeys = this.getReportMonthKeys(merged);
            const monthKeys = recentMonths ? this.pickRecentMonthKeys(availableMonthKeys, recentMonths) : null;
            const data = monthKeys
                ? merged.filter(report => monthKeys.has(this.getMonthKeyFromDateString(report?.date)))
                : merged;
            this.reportMeta(onMeta, monthKeys ? monthKeys.size : availableMonthKeys.size, availableMonthKeys.size);
            this.reportProgress(onProgress, data.length, data.length);
            return data;
        }

        const availableMonthKeys = new Set(index.files.map(file => file.monthKey));
        const monthKeys = recentMonths ? this.pickRecentMonthKeys(availableMonthKeys, recentMonths) : null;
        const files = monthKeys ? index.files.filter(file => monthKeys.has(file.monthKey)) : index.files;
        this.reportMeta(onMeta, monthKeys ? monthKeys.size : availableMonthKeys.size, availableMonthKeys.size);
        let loaded = 0;
        this.reportProgress(onProgress, loaded, files.length);

        const cached = await reportCache.getMany(files.map(file => file.sha));
        const fresh = [];
        const results = await this.mapWithConcurrency(files, FILE_FETCH_CONCURRENCY, async file => {
            if (file.sha && cached.has(file.sha)) {
                loaded += 1;
                this.reportProgress(onProgress, loaded, files.length);
                return cached.get(file.sha);
            }

            try {
                const response = await this.fetchGithub(file.download_url, {}, file.path || file.name);
                if (!response.ok) throw await this.createGithubApiError(response, file.path || file.name);
                const data = await response.json();
                if (file.sha) fresh.push({ sha: file.sha, data });
                return data;
            } finally {
                loaded += 1;
                this.reportProgress(onProgress, loaded, files.length);
            }
        });
        await reportCache.putMany(fresh);

        return results;
    }

    mergeLocalReports(localReports, generatedReports) {
        const taken = new Set(localReports.map(getReportKey));
        return localReports.concat(generatedReports.filter(report => !taken.has(getReportKey(report))));
    }

    async getMockData() {
        const [locations, employees, products] = await Promise.all([
            this.fetchRootCatalog('database/locations.json', 'Locations'),
            this.fetchRootCatalog('database/employees.json', 'Employees'),
            this.fetchRootCatalog('database/products.json', 'Products')
        ]);
        return generateMockReports({ months: 3, locations, employees, products });
    }
}

export const apiService = new ApiService();
