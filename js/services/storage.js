const KEY = "burbone_state";

function endOfLocalDay(time = Date.now()) {
    const end = new Date(time);
    end.setHours(23, 59, 59, 999);
    return end.getTime();
}

export const storageService = {
    save(data) {
        const payload = { time: Date.now(), data };
        localStorage.setItem(KEY, JSON.stringify(payload));
    },

    load() {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch {
            localStorage.removeItem(KEY);
            return null;
        }

        if (!Number.isFinite(parsed?.time) || Date.now() > endOfLocalDay(parsed.time)) {
            localStorage.removeItem(KEY);
            return null;
        }
        return parsed.data ?? null;
    },

    clear() {
        localStorage.removeItem(KEY);
    }
};
