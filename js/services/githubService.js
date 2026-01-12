import { GITHUB_CONFIG } from '../config.js';

export const isLocalhost = () => {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

function getMockData() {
    const mockData = [];
    const locations = ['Oświęcim', 'Wilamowice'];
    const employeesList = ["Paweł", "Radek", "Sebastian", "Tomek", "Kacper", "Natalia", "Dominik"];

    for (let i = 0; i < 90; i++) { // Zwiększyłem zakres do 90 dni
        const date = new Date();
        date.setDate(date.getDate() - i);

        const dayStr = String(date.getDate()).padStart(2, '0');
        const monthStr = String(date.getMonth() + 1).padStart(2, '0');
        const yearStr = date.getFullYear();
        const dateString = `${dayStr}.${monthStr}.${yearStr}`;

        locations.forEach(loc => {
            // Symulacja: Czasami brak raportu
            if (Math.random() > 0.1) {
                const dailyEmployees = {};
                const numWorkers = Math.floor(Math.random() * 3) + 1;
                const shuffled = [...employeesList].sort(() => 0.5 - Math.random());
                const selected = shuffled.slice(0, numWorkers);

                selected.forEach(emp => {
                    const startHour = 12;
                    const endHour = startHour + Math.floor(Math.random() * 5) + 5;
                    dailyEmployees[emp] = `${startHour}:00 - ${endHour}:00`;
                });

                const totalRev = Math.floor(Math.random() * 2500) + 500;
                // Symulacja kart: od 20% do 60% utargu to karty
                const cardRev = Math.floor(totalRev * (0.2 + Math.random() * 0.4));

                mockData.push({
                    location: loc,
                    date: dateString,
                    revenue: totalRev,
                    cardRevenue: cardRev, // Dodane dane kart
                    last_updated_at: new Date().toISOString(),
                    employees: dailyEmployees
                });
            }
        });
    }
    return Promise.resolve(mockData);
}

export async function checkFileExists(location, date) {
    if (isLocalhost()) return false;

    const { TOKEN, REPO_OWNER, REPO_NAME } = GITHUB_CONFIG;
    if (!TOKEN || !REPO_OWNER || !REPO_NAME) return false;

    const filePath = `database/${location.toLowerCase()}/${date}.json`;
    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;

    const headers = {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
    };

    try {
        const response = await fetch(apiUrl, { method: 'GET', headers });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

export async function saveReportToGithub(data) {
    if (isLocalhost()) {
        console.log("LOCALHOST: Mock save", data);
        return;
    }

    const { TOKEN, REPO_OWNER, REPO_NAME } = GITHUB_CONFIG;
    if (!TOKEN || !REPO_OWNER || !REPO_NAME) return;

    const filePath = `database/${data.location.toLowerCase()}/${data.date}.json`;
    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;

    const headers = {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
    };

    try {
        let sha;
        const response = await fetch(apiUrl, { method: 'GET', headers });
        if (response.ok) {
            const fileData = await response.json();
            sha = fileData.sha;
        }

        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        const commitMessage = `Update ${data.location} - ${data.date}`;
        const body = { message: commitMessage, content, sha };

        const putResponse = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(body) });

        if (!putResponse.ok) throw new Error("Save failed");
    } catch (error) {
        console.error(error);
        alert("Błąd zapisu do GitHub.");
    }
}

export async function fetchAllData() {
    if (isLocalhost()) return getMockData();

    const { TOKEN, REPO_OWNER, REPO_NAME } = GITHUB_CONFIG;
    const API_BASE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/`;
    const headers = {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
    };

    if (!TOKEN) return [];

    try {
        const locationsResponse = await fetch(`${API_BASE_URL}database`, { headers });
        if (!locationsResponse.ok) return [];
        const locations = (await locationsResponse.json()).filter(item => item.type === 'dir');

        const allFileContentPromises = locations.map(async (location) => {
            const filesResponse = await fetch(location.url, { headers });
            if (!filesResponse.ok) return [];
            const files = await filesResponse.json();

            return Promise.all(
                files
                    .filter(file => file.name.endsWith('.json'))
                    .map(async file => {
                        const contentResponse = await fetch(file.download_url);
                        return contentResponse.ok ? contentResponse.json() : null;
                    })
            );
        });

        const reportsNested = await Promise.all(allFileContentPromises);
        return reportsNested.flat().filter(Boolean);

    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function fetchMonthlyData() { return []; }