import { isLocalhost } from '../utils.js';
import { authService } from './auth.js?v=101';
import { dialogService } from '../ui/components/customControls.js?v=173';

const ADMIN_AUTH_STORAGE_KEY = 'burbone-admin-access';
const ADMIN_FORCE_LOGIN_STORAGE_KEY = 'burbone-admin-force-login';
const ADMIN_AUTH_DURATION_MS = 24 * 60 * 60 * 1000;
const PASSWORD_CHECK_DELAY_MS = 140;

let loginPending = false;

export function isAdminLogoutRequested() {
    try {
        return localStorage.getItem(ADMIN_FORCE_LOGIN_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

export function hasValidAdminAccess() {
    try {
        const access = JSON.parse(localStorage.getItem(ADMIN_AUTH_STORAGE_KEY));
        if (Number.isFinite(access?.expiresAt) && access.expiresAt > Date.now()) return true;
        localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    } catch {
        localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    }
    return false;
}

export function saveAdminAccess() {
    try {
        localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify({
            expiresAt: Date.now() + ADMIN_AUTH_DURATION_MS
        }));
        localStorage.removeItem(ADMIN_FORCE_LOGIN_STORAGE_KEY);
    } catch (error) {
        console.warn('Nie udało się zapamiętać dostępu do panelu admina.', error);
    }
}

export function clearAdminAccess() {
    try {
        localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
        if (isLocalhost()) localStorage.setItem(ADMIN_FORCE_LOGIN_STORAGE_KEY, '1');
    } catch (error) {
        console.warn('Nie udało się usunąć zapisanego dostępu do panelu admina.', error);
    }
}

export function needsAdminAccess() {
    if (!isLocalhost() || isAdminLogoutRequested()) return !hasValidAdminAccess();
    return false;
}

export async function requestAdminAccess() {
    if (loginPending) return false;
    loginPending = true;
    try {
        return await askForAdminPassword();
    } finally {
        loginPending = false;
    }
}

async function askForAdminPassword() {
    let notice;
    for (;;) {
        const pass = await dialogService.prompt("Podaj hasło administratora.", "Burbone Admin", {
            type: 'password',
            inputmode: 'numeric',
            autocomplete: 'current-password',
            size: 'prominent',
            label: 'Hasło administratora',
            notice,
            value: '',
            autoSubmit: value => authService.verifyPassword(value),
            autoSubmitDelay: PASSWORD_CHECK_DELAY_MS,
            action: {
                label: 'Pokaż hasło',
                labelActive: 'Ukryj hasło',
                icon: 'visibility',
                iconActive: 'visibility_off'
            }
        });
        if (pass === null) return false;
        if (await authService.verifyPassword(pass)) return true;
        notice = { variant: 'danger', text: 'Nieprawidłowe hasło. Spróbuj ponownie.' };
    }
}
