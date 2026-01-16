export function getFormattedDate() {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

export function formatMoney(amount) {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(amount);
}

export function calculateHours(timeStr) {
    if (!timeStr) return 0;
    const normalizedTime = timeStr.replace('–', '-');
    if (!normalizedTime.includes('-')) return 0;
    const [start, end] = normalizedTime.split('-').map(t => t.trim());
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let hours = h2 - h1;
    let minutes = m2 - m1;
    if (minutes < 0) { hours--; minutes += 60; }
    if (hours < 0) hours += 24;
    return hours + (minutes / 60);
}

export function capitalize(s) {
    return s && s[0].toUpperCase() + s.slice(1);
}

export function isLocalhost() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

export function fallbackCopyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    let success = false;
    try {
        success = document.execCommand('copy');
    } catch (err) {
        console.error(err);
    }
    document.body.removeChild(textArea);
    return success;
}