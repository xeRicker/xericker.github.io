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
        const locs = ['Oświęcim', 'Wilamowice'];
        const emps = ["Paweł", "Radek", "Sebastian", "Tomek"];
        for (let i = 0; i < 60; i++) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
            locs.forEach(l => {
                if (Math.random() > 0.2) {
                    const rev = Math.floor(Math.random() * 3000) + 500;
                    data.push({
                        location: l, date: dateStr, revenue: rev, cardRevenue: Math.floor(rev * 0.4),
                        employees: { [emps[Math.floor(Math.random()*emps.length)]]: "12:00-20:00" }
                    });
                }
            });
        }
        return Promise.resolve(data);
    }
}

export const apiService = new ApiService();