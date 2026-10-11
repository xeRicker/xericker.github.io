const DB_NAME = 'burbone-reports';
const STORE = 'reports';
const META_STORE = 'meta';
const DB_VERSION = 2;
const MAX_ENTRIES = 4000;

let dbPromise = null;
const reportMemory = new Map();
const entryMemory = new Map();

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
            if (!db.objectStoreNames.contains(META_STORE)) {
                db.createObjectStore(META_STORE, { keyPath: 'key' });
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

async function readRecord(storeName, key) {
    const db = await openDatabase();
    if (!db) return null;

    try {
        return await toPromise(db.transaction(storeName, 'readonly').objectStore(storeName).get(key)) || null;
    } catch (error) {
        console.warn(`Report cache read failed (${storeName}).`, error);
        return null;
    }
}

async function writeRecords(storeName, records) {
    const db = await openDatabase();
    if (!db) return;

    try {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        records.forEach(record => store.put(record));
        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
        });
    } catch (error) {
        console.warn(`Report cache write failed (${storeName}).`, error);
    }
}

async function deleteRecord(storeName, key) {
    const db = await openDatabase();
    if (!db) return;

    try {
        const transaction = db.transaction(storeName, 'readwrite');
        transaction.objectStore(storeName).delete(key);
        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
        });
    } catch (error) {
        console.warn(`Report cache delete failed (${storeName}).`, error);
    }
}

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

export const reportCache = {
    async getMany(shas) {
        const result = new Map();
        const missing = [];
        Array.from(new Set(shas.filter(Boolean))).forEach(sha => {
            if (reportMemory.has(sha)) result.set(sha, reportMemory.get(sha));
            else missing.push(sha);
        });

        if (!missing.length) return result;

        const db = await openDatabase();
        if (!db) return result;

        try {
            const store = db.transaction(STORE, 'readonly').objectStore(STORE);
            await Promise.all(missing.map(async sha => {
                const record = await toPromise(store.get(sha));
                if (!record) return;
                reportMemory.set(sha, record.data);
                result.set(sha, record.data);
            }));
        } catch (error) {
            console.warn('Report cache read failed.', error);
        }

        return result;
    },

    async putMany(entries) {
        if (!entries.length) return;
        const savedAt = Date.now();
        entries.forEach(entry => reportMemory.set(entry.sha, entry.data));
        await writeRecords(STORE, entries.map(entry => ({ sha: entry.sha, data: entry.data, savedAt })));

        const db = await openDatabase();
        if (!db) return;
        try {
            await prune(db);
        } catch (error) {
            console.warn('Report cache prune failed.', error);
        }
    },

    async getEntry(key) {
        if (entryMemory.has(key)) return entryMemory.get(key);

        const record = await readRecord(META_STORE, key);
        if (!record) return null;

        const entry = { data: record.data, savedAt: record.savedAt };
        entryMemory.set(key, entry);
        return entry;
    },

    async putEntry(key, data) {
        const savedAt = Date.now();
        const entry = { data, savedAt };
        entryMemory.set(key, entry);
        await writeRecords(META_STORE, [{ key, data, savedAt }]);
        return entry;
    },

    async deleteEntry(key) {
        entryMemory.delete(key);
        await deleteRecord(META_STORE, key);
    }
};
