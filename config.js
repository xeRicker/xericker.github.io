export const GITHUB_CONFIG = {
  // Wklej tutaj swój Personal Access Token z GitHuba.
  TOKEN: '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', // <--- WAŻNE: ZASTĄP TO SWOIM TOKENEM

  // Wpisz nazwę użytkownika lub organizacji, do której należy repozytorium.
  REPO_OWNER: 'xeRicker', // <--- np. 'jankowalski'

  // Wpisz nazwę repozytorium, w którym będą zapisywane dane.
  REPO_NAME: 'xericker.github.io' // <--- np. 'baza-produktow'
};

// Konfiguracja aplikacji
export const APP_CONFIG = {
    // Czas w milisekundach, po którym zapisane dane w localStorage wygasają
    LOCAL_STORAGE_EXPIRATION: 15 * 60 * 1000, // 15 minut
};