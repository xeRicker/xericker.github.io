import { APP_CONFIG } from '../config/config.js';

const KEY = "burbone_state";

export const storageService = {
    save(data) {
        const payload = { time: Date.now(), data };
        localStorage.setItem(KEY, JSON.stringify(payload));
    },

    load() {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.time > APP_CONFIG.LOCAL_STORAGE_EXPIRATION) {
            localStorage.removeItem(KEY);
            return null;
        }
        return parsed.data;
    },

    clear() {
        localStorage.removeItem(KEY);
    }
};