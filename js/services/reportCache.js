const DB_NAME = 'burbone-reports';
const STORE = 'reports';
const DB_VERSION = 1;
const MAX_ENTRIES = 4000;

let dbPromise = null;

function openDatabase() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise(resolve => {
        if (typeof indexedDB === 'undefined') {
            resolve(null);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE, { keyPath: 'sha' });
                store.createIndex('savedAt', 'savedAt');
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
    });

    return dbPromise;
}

function toPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/** Drops oldest cached reports once the store grows past MAX_ENTRIES. */
async function prune(db) {
    const count = await toPromise(db.transaction(STORE, 'readonly').objectStore(STORE).count());
    if (count <= MAX_ENTRIES) return;

    const excess = count - MAX_ENTRIES;
    const transaction = db.transaction(STORE, 'readwrite');
    const request = transaction.objectStore(STORE).index('savedAt').openCursor();
    let removed = 0;

    await new Promise((resolve, reject) => {
        request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor || removed >= excess) return;
            cursor.delete();
            removed += 1;
            cursor.continue();
        };
        request.onerror = () => reject(request.error);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
    });
}

/**
 * Report files are immutable per Git blob SHA, so raw report JSON is cached by
 * SHA and only changed/never-seen files are downloaded again.
 */
export const reportCache = {
    async getMany(shas) {
        const result = new Map();
        const unique = Array.from(new Set(shas.filter(Boolean)));
        const db = await openDatabase();
        if (!db || !unique.length) return result;

        try {
            const store = db.transaction(STORE, 'readonly').objectStore(STORE);
            await Promise.all(unique.map(async sha => {
                const record = await toPromise(store.get(sha));
                if (record) result.set(sha, record.data);
            }));
        } catch (error) {
            console.warn('Report cache read failed.', error);
        }

        return result;
    },

    async putMany(entries) {
        const db = await openDatabase();
        if (!db || !entries.length) return;

        try {
            const transaction = db.transaction(STORE, 'readwrite');
            const store = transaction.objectStore(STORE);
            const savedAt = Date.now();
            entries.forEach(entry => store.put({ sha: entry.sha, data: entry.data, savedAt }));
            await new Promise((resolve, reject) => {
                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
            });
            await prune(db);
        } catch (error) {
            console.warn('Report cache write failed.', error);
        }
    }
};
