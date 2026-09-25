import { MARKETING_BRAND, MARKETING_POST_TYPES } from '../config/marketing.js';
import { buildMarketingPost, loadMarketingBurgers } from '../services/marketing.js?v=2';
import { escapeHtml, fallbackCopyToClipboard, renderMaterialIcon } from '../utils.js';
import { dialogService, enhanceCustomControls } from './components/customControls.js?v=173';

const MARKETING_OPTIONS = [
    { id: 'includeLocations', label: 'Punkty' },
    { id: 'includePhones', label: 'Telefony' },
    { id: 'includeHours', label: 'Godziny otwarcia' },
    { id: 'includeGlovo', label: 'Glovo' },
    { id: 'includeCommentPrompt', label: 'Pytanie do komentarzy', defaultOn: false },
    { id: 'includeHashtags', label: 'Hasztagi' },
    { id: 'includeEmoji', label: 'Emoji' }
];

class AdminMarketing {
    constructor() {
        this.container = null;
        this.burgers = [];
        this.type = MARKETING_POST_TYPES[0].id;
        this.variantIndex = 0;
        this.options = Object.fromEntries(MARKETING_OPTIONS.map(option => [option.id, option.defaultOn !== false]));
    }

    async init(container) {
        this.container = container;
        try {
            this.burgers = await loadMarketingBurgers();
        } catch (error) {
            dialogService.error(error.message, 'Błąd konfiguracji burgerów');
        }
        this.render();
        this.container.addEventListener('submit', event => this.handleSubmit(event));
        this.container.addEventListener('click', event => this.handleClick(event));
        this.container.addEventListener('change', event => this.handleChange(event));
    }

    render() {
        this.container.innerHTML = `
            <div class="admin-products-head">
                <div class="section-heading">
                    <h3>${renderMaterialIcon('campaign')} Marketing</h3>
                    <p>Ustaw post, kliknij „Generuj”, a gotowy tekst skopiuj na Facebooka albo Instagrama.</p>
                </div>
            </div>
            <form class="marketing-form" data-action="generate">
                <label class="marketing-field">
                    <span>Rodzaj postu</span>
                    <select id="marketingType" class="calc-input" aria-label="Rodzaj postu">${this.buildTypeOptions()}</select>
                </label>
                <label class="marketing-field" data-context="burger">
                    <span>Burger</span>
                    <select id="marketingBurger" class="calc-input" aria-label="Burger">${this.buildBurgerOptions()}</select>
                </label>
                <label class="marketing-field marketing-field--wide" data-context="burger">
                    <span>Opis burgera</span>
                    <textarea id="marketingDescription" class="calc-input marketing-textarea" rows="3"></textarea>
                </label>
                <label class="marketing-field marketing-field--wide" data-context="promo" hidden>
                    <span>Promocja</span>
                    <input id="marketingPromo" class="calc-input" placeholder="np. drugi burger -30%" aria-label="Opis promocji">
                </label>
                <fieldset class="marketing-options">
                    <legend>Uwzględnij w poście</legend>
                    ${MARKETING_OPTIONS.map(option => this.buildOption(option)).join('')}
                </fieldset>
                <button class="chart-btn active marketing-generate" type="submit">${renderMaterialIcon('auto_awesome')} Generuj post</button>
            </form>
            <div class="marketing-outputs">
                ${this.buildOutput('facebook', 'Facebook', 'thumb_up')}
                ${this.buildOutput('instagram', 'Instagram', 'photo_camera')}
            </div>
        `;
        this.syncDescription();
        this.syncContextFields();
        enhanceCustomControls(this.container);
    }

    buildTypeOptions() {
        return MARKETING_POST_TYPES
            .map(type => `<option value="${type.id}" data-icon="${type.icon}" ${type.id === this.type ? 'selected' : ''}>${escapeHtml(type.label)}</option>`)
            .join('');
    }

    buildBurgerOptions() {
        if (!this.burgers.length) return '<option value="">Brak burgerów</option>';
        return this.burgers
            .map(burger => `<option value="${escapeHtml(burger.id)}">${escapeHtml(burger.label)}</option>`)
            .join('');
    }

    buildOption(option) {
        return `<label class="marketing-option">
            <input type="checkbox" class="custom-native-control" value="${option.id}" ${this.options[option.id] ? 'checked' : ''}>
            <span class="marketing-option__chip">${escapeHtml(option.label)}</span>
        </label>`;
    }

    buildOutput(target, label, icon) {
        return `
            <section class="marketing-output-card">
                <div class="marketing-output-head">
                    <h4>${renderMaterialIcon(icon)} ${label}</h4>
                    <button class="btn-back admin-save-btn" type="button" data-action="copy" data-target="${target}">${renderMaterialIcon('content_copy')} Kopiuj</button>
                </div>
                <textarea id="marketing-${target}" class="marketing-output" readonly placeholder="Kliknij „Generuj post”."></textarea>
            </section>
        `;
    }

    syncDescription() {
        const select = this.container.querySelector('#marketingBurger');
        const textarea = this.container.querySelector('#marketingDescription');
        if (!select || !textarea) return;
        const burger = this.burgers.find(entry => entry.id === select.value);
        textarea.value = burger?.description || '';
    }

    syncContextFields() {
        this.container.querySelectorAll('[data-context]').forEach(field => {
            field.hidden = field.dataset.context !== this.type;
        });
    }

    handleChange(event) {
        const target = event.target;
        if (target.id === 'marketingType') {
            this.type = target.value;
            this.syncContextFields();
            this.clearOutputs();
            return;
        }
        if (target.id === 'marketingBurger') {
            this.syncDescription();
            this.clearOutputs();
            return;
        }
        if (target.type === 'checkbox') this.options[target.value] = target.checked;
    }

    handleSubmit(event) {
        if (event.target.dataset.action !== 'generate') return;
        event.preventDefault();
        const burger = this.burgers.find(entry => entry.id === this.container.querySelector('#marketingBurger')?.value);
        const post = buildMarketingPost({
            type: this.type,
            burger: this.type === 'burger' ? burger?.label || '' : '',
            promo: this.container.querySelector('#marketingPromo')?.value.trim() || '',
            description: this.container.querySelector('#marketingDescription')?.value.trim() || '',
            options: this.options,
            brand: MARKETING_BRAND,
            variantIndex: this.variantIndex++
        });
        this.setOutput('facebook', post.facebook);
        this.setOutput('instagram', post.instagram);
    }

    handleClick(event) {
        const button = event.target.closest('[data-action="copy"]');
        if (button) this.copyOutput(button.dataset.target, button);
    }

    async copyOutput(target, button) {
        const text = this.container.querySelector(`#marketing-${target}`)?.value || '';
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            fallbackCopyToClipboard(text);
        }
        button.innerHTML = `${renderMaterialIcon('check')} Skopiowano`;
        button.classList.add('is-copied');
        setTimeout(() => {
            button.innerHTML = `${renderMaterialIcon('content_copy')} Kopiuj`;
            button.classList.remove('is-copied');
        }, 1800);
    }

    setOutput(target, text) {
        const output = this.container.querySelector(`#marketing-${target}`);
        if (output) output.value = text;
    }

    clearOutputs() {
        ['facebook', 'instagram'].forEach(target => this.setOutput(target, ''));
    }
}

export const adminMarketing = new AdminMarketing();
