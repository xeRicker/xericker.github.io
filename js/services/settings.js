import { apiService } from './api.js?v=170';

export const DEFAULT_SETTINGS = {
    version: 1,
    updatedAt: null,
    dailyRevenueTarget: 0
};

export function normalizeSettings(input) {
    const source = input && typeof input === 'object' ? input : {};
    return {
        version: Number(source.version) || DEFAULT_SETTINGS.version,
        updatedAt: source.updatedAt || null,
        dailyRevenueTarget: Math.max(0, Number(source.dailyRevenueTarget) || 0)
    };
}

export async function loadSettings() {
    return normalizeSettings(await apiService.fetchSettings());
}

export async function saveSettings(settings) {
    const payload = normalizeSettings({ ...settings, updatedAt: new Date().toISOString() });
    await apiService.saveSettings(payload);
    return payload;
}
