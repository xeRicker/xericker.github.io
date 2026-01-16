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

        // Lista symulowanych produktów
        // Typ: inventory (stan magazynowy - np. Bułki) vs order (zamówienie)
        const mockCatalog = [
            { name: "Bułki", type: "inventory", max: 50 },
            { name: "Mięso: Duże", type: "order", max: 30 },
            { name: "Frytki", type: "order", max: 10 },
            { name: "Pepsi", type: "order", max: 12 },
            { name: "Folia", type: "order", max: 2 },
            { name: "Drwal: Sos Jalapeño", type: "order", max: 5 },
            { name: "Serwetki", type: "order", max: 3 },
            { name: "Torby: Duże", type: "order", max: 5 },
            { name: "Sos: Czosnek", type: "order", max: 8 }
        ];

        for (let i = 0; i < 60; i++) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;

            locs.forEach(l => {
                if (Math.random() > 0.1) { // 90% szans na raport
                    const rev = Math.floor(Math.random() * 3000) + 500;

                    const products = {};
                    mockCatalog.forEach(p => {
                        // 30% szans, że produkt pojawi się w raporcie
                        if (Math.random() > 0.7) {
                            if (p.type === 'inventory') {
                                // Bułki: losowa liczba 10-50 (jako stan)
                                products[p.name] = Math.floor(Math.random() * (p.max - 10)) + 10;
                            } else {
                                // Zamówienia: mniejsze liczby, np. 1-5 sztuk
                                // Chyba że to mięso, wtedy trochę więcej
                                const qty = Math.floor(Math.random() * (p.max / 2)) + 1;
                                products[p.name] = qty;
                            }
                        }
                    });

                    data.push({
                        location: l,
                        date: dateStr,
                        revenue: rev,
                        cardRevenue: Math.floor(rev * 0.4),
                        employees: { [emps[Math.floor(Math.random()*emps.length)]]: "12:00-20:00" },
                        products: products
                    });
                }
            });
        }
        return Promise.resolve(data);
    }
}

export const apiService = new ApiService();