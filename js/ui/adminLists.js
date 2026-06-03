import { buildReportText } from '../services/reportFormatter.js';
import { getReportKey, getReportTimestamp } from '../services/reportDates.js';
import { escapeHtml, fallbackCopyToClipboard } from '../utils.js';

export function createAdminListsPage(config) {
    let selectedListKey = null;

    const getAllData = () => config.getAllData() || [];
    const getCatalog = () => config.getProductCatalog();
    const container = () => document.getElementById('adminListsContent');
    const locationSelect = () => document.getElementById('listLocationFilter');
    const searchInput = () => document.getElementById('listSearchInput');

    function init() {
        populateLocationFilter();
        setupListeners();
        render();
    }

    function refresh() {
        populateLocationFilter();
        render();
    }

    function populateLocationFilter() {
        const select = locationSelect();
        const locations = Array.from(new Set(getAllData().map(report => report.location).filter(Boolean)))
            .sort((a, b) => a.localeCompare(b, 'pl'));

        select.innerHTML = [
            '<option value="all">Wszystkie punkty</option>',
            ...locations.map(location => `<option value="${escapeHtml(location)}">${escapeHtml(location)}</option>`)
        ].join('');
    }

    function setupListeners() {
        locationSelect().addEventListener('change', () => {
            selectedListKey = null;
            render();
        });

        searchInput().addEventListener('input', () => {
            selectedListKey = null;
            render();
        });

        container().addEventListener('click', async event => {
            const previewButton = event.target.closest('[data-list-preview]');
            const copyButton = event.target.closest('[data-list-copy]');

            if (previewButton) {
                selectedListKey = previewButton.dataset.listPreview;
                render();
                return;
            }

            if (copyButton) {
                const report = findReportByKey(copyButton.dataset.listCopy);
                if (report) await copyReportText(report, copyButton);
            }
        });
    }

    function render() {
        const reports = getFilteredReports();
        const selectedReport = reports.find(report => getReportKey(report) === selectedListKey) || reports[0] || null;
        selectedListKey = selectedReport ? getReportKey(selectedReport) : null;

        if (!reports.length) {
            container().innerHTML = `
                <div class="admin-list-empty">
                    <span class="material-symbols-rounded" aria-hidden="true">content_paste_search</span>
                    <strong>Brak list</strong>
                    <p>Nie znaleziono zapisanych raportów dla wybranych filtrów.</p>
                </div>
            `;
            return;
        }

        container().innerHTML = `
            <section class="admin-category-card admin-list-panel">
                <div class="admin-category-head">
                    <div class="admin-category-title">
                        <span class="material-symbols-rounded category-icon" aria-hidden="true">content_paste</span>
                        <div>
                            <h4>Zapisane raporty</h4>
                            <span>${reports.length} ${formatListCount(reports.length)}</span>
                        </div>
                    </div>
                </div>
                <div class="admin-product-list admin-list-items">
                    ${reports.map(report => renderListItem(report, selectedListKey)).join('')}
                </div>
            </section>
            <section class="admin-category-card admin-list-preview">
                ${renderListPreview(selectedReport)}
            </section>
        `;
    }

    function getFilteredReports() {
        const location = locationSelect().value;
        const query = searchInput().value.trim().toLowerCase();

        return [...getAllData()]
            .filter(report => report?.date && report?.location)
            .filter(report => location === 'all' || report.location === location)
            .filter(report => !query || `${report.location} ${report.date}`.toLowerCase().includes(query))
            .sort((left, right) => getReportTimestamp(right) - getReportTimestamp(left));
    }

    function renderListItem(report, activeKey) {
        const key = getReportKey(report);
        const productsCount = Object.values(report.products || {}).filter(value => Number(value) > 0 || value === true).length;
        const employeesCount = Object.keys(report.employees || {}).length;

        return `
            <button class="admin-product-row admin-list-item ${key === activeKey ? 'is-active' : ''}" type="button" data-list-preview="${escapeHtml(key)}">
                <span class="material-symbols-rounded drag-handle" aria-hidden="true">receipt_long</span>
                <span class="admin-list-item__main">
                    <strong>${escapeHtml(report.date)}</strong>
                    <span>${escapeHtml(report.location)} / ${employeesCount} prac. / ${productsCount} prod.</span>
                </span>
                <span class="material-symbols-rounded admin-list-item__chevron" aria-hidden="true">chevron_right</span>
            </button>
        `;
    }

    function renderListPreview(report) {
        if (!report) return '';

        const text = buildReportText(report, getCatalog());

        return `
            <div class="admin-list-preview__head">
                <div>
                    <span class="summary-kicker">${config.buildSymbolIcon('receipt_long')} Podgląd listy</span>
                    <h3>${escapeHtml(report.location)} / ${escapeHtml(report.date)}</h3>
                </div>
                <button class="btn-back admin-save-btn has-unsaved-changes" type="button" data-list-copy="${escapeHtml(getReportKey(report))}">
                    <span class="material-symbols-rounded" aria-hidden="true">content_copy</span>
                    Kopiuj
                </button>
            </div>
            <pre class="admin-list-copy-preview">${escapeHtml(text)}</pre>
        `;
    }

    async function copyReportText(report, button) {
        const text = buildReportText(report, getCatalog());

        try {
            await navigator.clipboard.writeText(text);
        } catch {
            fallbackCopyToClipboard(text);
        }

        button.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">check</span> Skopiowano';
        button.classList.add('is-copied');
        setTimeout(() => {
            button.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">content_copy</span> Kopiuj';
            button.classList.remove('is-copied');
        }, 1800);
    }

    function findReportByKey(key) {
        return key ? getAllData().find(report => getReportKey(report) === key) || null : null;
    }

    return { init, refresh, render };
}

function formatListCount(count) {
    if (count === 1) return 'lista';
    if (count >= 2 && count <= 4) return 'listy';
    return 'list';
}
