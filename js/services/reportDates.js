const REPORT_DATE_PATTERN = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

export function parseReportDate(dateString) {
    const match = String(dateString || '').match(REPORT_DATE_PATTERN);
    if (!match) return null;

    const [, day, month, year] = match.map(Number);
    if (!day || !month || !year) return null;

    return new Date(year, month - 1, day);
}

export function reportDateToIso(dateString) {
    const date = parseReportDate(dateString);
    if (!date) return '';

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
}

export function getMonthKeyFromReportDate(dateString) {
    const date = parseReportDate(dateString);
    if (!date) return '';

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthKeyFromReportFileName(fileName) {
    return getMonthKeyFromReportDate(String(fileName || '').replace(/\.json$/i, ''));
}

export function getReportTimestamp(report) {
    return parseReportDate(report?.date)?.getTime() || 0;
}

export function getReportKey(report) {
    return `${report?.location || ''}|${report?.date || ''}`;
}
