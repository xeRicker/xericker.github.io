// Konfiguracja połączenia z GitHub API
// Wypełnij te dane!
export const GITHUB_CONFIG = {
  // Wklej tutaj swój Personal Access Token z GitHuba.
  TOKEN: 'TWOJ_PERSONAL_ACCESS_TOKEN', // <--- WAŻNE: ZASTĄP TO SWOIM TOKENEM

  // Wpisz nazwę użytkownika lub organizacji, do której należy repozytorium.
  REPO_OWNER: 'TWOJ_LOGIN_GITHUB', // <--- np. 'jankowalski'

  // Wpisz nazwę repozytorium, w którym będą zapisywane dane.
  REPO_NAME: 'NAZWA_TWOJEGO_REPOZYTORIUM' // <--- np. 'baza-produktow'
};

// Konfiguracja aplikacji
export const APP_CONFIG = {
    // Czas w milisekundach, po którym zapisane dane w localStorage wygasają
    LOCAL_STORAGE_EXPIRATION: 15 * 60 * 1000, // 15 minut
};