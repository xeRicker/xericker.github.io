import { GITHUB_CONFIG } from '../config.js';

/**
 * Zapisuje dane w formacie JSON do repozytorium GitHub.
 * @param {object} data - Obiekt z danymi raportu do zapisania.
 */
export async function saveReportToGithub(data) {
  const { TOKEN, REPO_OWNER, REPO_NAME } = GITHUB_CONFIG;
  if (!TOKEN || TOKEN === 'TWOJ_PERSONAL_ACCESS_TOKEN' || !REPO_OWNER || !REPO_NAME) {
    console.error("Konfiguracja GitHub nie została uzupełniona w pliku js/config.js.");
    alert("Błąd: Konfiguracja do zapisu na GitHubie jest niekompletna. Sprawdź konsolę (F12).");
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
    } else if (response.status !== 404) {
      throw new Error(`Błąd podczas sprawdzania pliku: ${response.statusText}`);
    }

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    const commitMessage = `Aktualizacja danych dla ${data.location} z dnia ${data.date}`;
    const body = { message: commitMessage, content, sha };

    const putResponse = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(body) });

    if (putResponse.ok) {
      console.log("Dane pomyślnie zapisane na GitHubie!");
    } else {
      const errorData = await putResponse.json();
      throw new Error(`Błąd podczas zapisu na GitHub: ${putResponse.statusText} - ${errorData.message}`);
    }
  } catch (error) {
    console.error("Wystąpił błąd podczas zapisu na GitHub:", error);
    alert(`Nie udało się zapisać danych w bazie danych na GitHubie. Sprawdź konsolę (F12).`);
  }
}

/**
 * Pobiera i zwraca dane ze wszystkich raportów JSON z bieżącego miesiąca.
 * @returns {Promise<Array<object>>} Obietnica, która zwraca tablicę obiektów raportów.
 */
export async function fetchMonthlyData() {
  const { TOKEN, REPO_OWNER, REPO_NAME } = GITHUB_CONFIG;
  const API_BASE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/`;
  const headers = {
    'Authorization': `token ${TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
  };

  const currentDate = new Date();
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
  const currentYear = currentDate.getFullYear();

  try {
    // 1. Pobierz listę lokalizacji (folderów 'osiek', 'oswiecim' itp.)
    const locationsResponse = await fetch(`${API_BASE_URL}database`, { headers });
    if (!locationsResponse.ok) throw new Error("Nie można pobrać listy lokalizacji.");
    const locations = (await locationsResponse.json()).filter(item => item.type === 'dir');

    // 2. Dla każdej lokalizacji, pobierz listę plików i odfiltruj te z bieżącego miesiąca
    const allFilesPromises = locations.map(async (location) => {
      const filesResponse = await fetch(location.url, { headers });
      if (!filesResponse.ok) return [];
      const files = await filesResponse.json();

      return files
        .filter(file => {
          // Sprawdzamy, czy nazwa pliku pasuje do formatu DD.MM.RRRR.json
          const match = file.name.match(/(\d{2})\.(\d{2})\.(\d{4})\.json/);
          return match && match[2] === currentMonth && match[3] === String(currentYear);
        })
        .map(file => file.download_url); // Interesuje nas tylko URL do pobrania surowej zawartości
    });

    const monthlyFilesUrls = (await Promise.all(allFilesPromises)).flat();

    if (monthlyFilesUrls.length === 0) {
      return []; // Zwróć pustą tablicę, jeśli nie ma danych
    }

    // 3. Pobierz zawartość każdego pliku
    const allFileContentPromises = monthlyFilesUrls.map(async (url) => {
        const contentResponse = await fetch(url); // Nie trzeba tu nagłówków, bo to publiczny download_url
        if (!contentResponse.ok) return null;
        return contentResponse.json();
    });

    const reports = (await Promise.all(allFileContentPromises)).filter(Boolean); // odfiltruj ewentualne nulle

    return reports;

  } catch (error) {
    console.error("Błąd podczas pobierania danych miesięcznych:", error);
    alert("Wystąpił błąd podczas pobierania danych miesięcznych z GitHub. Sprawdź konsolę.");
    return []; // Zwróć pustą tablicę w razie błędu
  }
}