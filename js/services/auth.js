/**
 * Admin password check.
 *
 * Only a PBKDF2-SHA256 salt and digest live in the source, so the password
 * itself is not readable in the inspector. A static site can never hide the
 * check itself — the digest is public and brute forceable — so this raises the
 * cost of reading the password, it does not make the panel cryptographically
 * private.
 */
const CREDENTIALS = {
    hash: 'SHA-256',
    iterations: 210000,
    salt: 'xUl/njnGwFfbX9NdRavTYw==',
    digest: '1azpPAJyveF0vV0Pl9CbTndXyg0NEp/mzDmXQlCGS30='
};

function base64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
}

async function deriveBits(password, salt, iterations) {
    const keyMaterial = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations, hash: CREDENTIALS.hash },
        keyMaterial,
        256
    );
    return new Uint8Array(bits);
}

export const authService = {
    /**
     * @param {string} password
     * @returns {Promise<boolean>} true when the password matches the stored digest.
     */
    async verifyPassword(password) {
        if (typeof password !== 'string') return false;
        // Mobile keyboards and copy-paste routinely add stray whitespace.
        const candidate = password.trim();
        if (!candidate) return false;
        if (!globalThis.crypto?.subtle) {
            console.error('Web Crypto niedostępny — panel wymaga połączenia HTTPS lub localhost.');
            return false;
        }
        try {
            const derived = await deriveBits(candidate, base64ToBytes(CREDENTIALS.salt), CREDENTIALS.iterations);
            return timingSafeEqual(derived, base64ToBytes(CREDENTIALS.digest));
        } catch (error) {
            console.error('Nie udało się zweryfikować hasła administratora.', error);
            return false;
        }
    }
};
