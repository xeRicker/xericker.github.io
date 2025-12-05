import { GITHUB_CONFIG } from '../config.js';

export const isLocalhost = () => {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

/**
 * Generuje sztuczne dane do testów na localhost (Teraz z pracownikami!)
 */
function getMockData() {
    console.log("🔧 TRYB DEVELOPERSKI: Ładowanie danych testowych...");
    const mockData = [];
    const locations = ['Oświęcim', 'Wilamowice'];
    const employeesList = ["Paweł", "Radek", "Sebastian", "Tomek", "Kacper", "Natalia", "Dominik"];
    
    // Generuj dane dla ostatnich 60 dni
    for (let i = 0; i < 60; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const dayStr = String(date.getDate()).padStart(2, '0');
        const monthStr = String(date.getMonth() + 1).padStart(2, '0');
        const yearStr = date.getFullYear();
        const dateString = `${dayStr}.${monthStr}.${yearStr}`;

        locations.forEach(loc => {
            if (Math.random() > 0.1) { // 90% szans na utarg
                
                // Generuj losowych pracowników dla tego dnia
                const dailyEmployees = {};
                // Od 1 do 3 pracowników na zmianie
                const numWorkers = Math.floor(Math.random() * 3) + 1;
                // Mieszamy tablicę i bierzemy pierwszych N
                const shuffled = [...employeesList].sort(() => 0.5 - Math.random());
                const selected = shuffled.slice(0, numWorkers);

                selected.forEach(emp => {
                    // Losowe godziny (np. 6h do 10h)
                    const startHour = 12;
                    const endHour = startHour + Math.floor(Math.random() * 5) + 5; 
                    dailyEmployees[emp] = `${startHour}:00 - ${endHour}:00`;
                });

                mockData.push({
                    location: loc,
                    date: dateString,
                    revenue: Math.floor(Math.random() * 2500) + 200 + (Math.random() * 99) / 100, // 200 - 2700 zł
                    last_updated_at: new Date().toISOString(),
                    employees: dailyEmployees // Dodano fake'owe godziny
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
        console.log("🔧 TRYB DEVELOPERSKI: Zapis symulowany.", data);
        alert("🔧 TRYB LOCALHOST: Dane wypisane w konsoli, nie wysłano do GitHuba.");
        return;
    }

    const { TOKEN, REPO_OWNER, REPO_NAME } = GITHUB_CONFIG;
    if (!TOKEN || TOKEN === '__GH_TOKEN__' || !REPO_OWNER || !REPO_NAME) {
        alert("Błąd konfiguracji GitHub.");
        return;
    }

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
        const commitMessage = `Aktualizacja danych dla ${data.location} z dnia ${data.date}`;
        const body = { message: commitMessage, content, sha };

        const putResponse = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(body) });

        if (!putResponse.ok) {
            const errorData = await putResponse.json();
            throw new Error(errorData.message);
        }
    } catch (error) {
        console.error("Błąd zapisu:", error);
        alert("Błąd zapisu do bazy danych.");
    }
}

export async function fetchAllData() {
    if (isLocalhost()) {
        return getMockData();
    }

    const { TOKEN, REPO_OWNER, REPO_NAME } = GITHUB_CONFIG;
    const API_BASE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/`;
    const headers = {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
    };

    if (!TOKEN || TOKEN === '__GH_TOKEN__') return [];

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
        console.error("Błąd pobierania:", error);
        return [];
    }
}

export async function fetchMonthlyData() { return []; }