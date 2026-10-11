import { copyText } from '../utils.js';
import { noticeService } from './components/notice.js?v=103';

const getDesignToken = (name, fallback) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

let lastFocusedElement = null;
let scrollState = null;

const FOCUSABLE = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function visibleSheet() {
    return document.querySelector('.bottom-sheet.visible');
}

function sheetFocusables(sheet) {
    return Array.from(sheet.querySelectorAll(FOCUSABLE)).filter(node => node.offsetParent !== null);
}

function lockPageScroll(locked) {
    if (locked) {
        scrollState = {
            html: document.documentElement.style.overflow,
            body: document.body.style.overflow
        };
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        return;
    }
    if (!scrollState) return;
    document.documentElement.style.overflow = scrollState.html;
    document.body.style.overflow = scrollState.body;
    scrollState = null;
}

function openSheet(sheet) {
    if (!sheet) return;
    lastFocusedElement = document.activeElement;
    document.getElementById('locationOverlay')?.classList.add('visible');
    sheet.classList.add('visible');
    lockPageScroll(true);
    const preferred = sheet.querySelector('[data-sheet-initial]') || sheetFocusables(sheet)[0];
    preferred?.focus({ preventScroll: true });
}

document.addEventListener('keydown', event => {
    const sheet = visibleSheet();
    if (!sheet) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        uiShared.closeModals();
        return;
    }
    if (event.key !== 'Tab') return;
    const focusable = sheetFocusables(sheet);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!sheet.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
        return;
    }
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
});

export const uiShared = {
    showModal(id) {
        openSheet(document.getElementById(id));
    },

    closeModals() {
        document.querySelectorAll('.bottom-sheet, .overlay').forEach(el => el.classList.remove('visible'));
        uiShared.stopFireworks();
        lockPageScroll(false);
        const target = lastFocusedElement;
        lastFocusedElement = null;
        if (target?.isConnected) target.focus({ preventScroll: true });
    },

    showSuccess(text, { saveError = null } = {}) {
        this.closeModals();
        const sheet = document.getElementById('successSheet');
        const icon = document.getElementById('successIcon');
        const btn = document.getElementById('finalCopyBtn');
        const title = document.getElementById('successTitle');
        const message = document.getElementById('successMessage');
        const saveFailed = Boolean(saveError);

        icon.style.color = getDesignToken('--brand-primary', '#D4521A');
        icon.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">content_copy</span>';
        title.innerText = saveFailed ? 'Lista nie została wysłana' : 'Lista gotowa!';
        message.innerText = saveFailed
            ? `GitHub nie zapisał listy. Możesz mimo to ją skopiować. ${saveError.message || ''}`
            : 'Kliknij poniżej, aby skopiować i wklej na Messengerze.';
        btn.innerText = "Skopiuj listę";
        btn.style.background = "";

        btn.onclick = async () => {
            const copied = await copyText(text);
            if (!copied) {
                noticeService.toast({ variant: 'danger', text: 'Nie udało się skopiować listy. Zaznacz tekst i skopiuj ręcznie.' });
                return;
            }
            btn.innerText = "Skopiowano!";
            title.innerText = 'Lista skopiowana';
            if (saveFailed) message.innerText = 'Lista została skopiowana, ale nie została wysłana do GitHub. Spróbuj zapisać ją później.';
            btn.style.background = getDesignToken('--success-color', '#7DCE82');
            icon.style.color = getDesignToken('--success-color', '#7DCE82');
            icon.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">check_circle</span>';
            this.triggerConfetti();
            this.startFireworks();
            if (!saveFailed) setTimeout(() => this.closeModals(), 4000);
        };

        openSheet(sheet);
    },

    triggerConfetti() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const c = document.getElementById('confetti-container');
        const colors = [
            getDesignToken('--app-chart-1', '#D4521A'),
            getDesignToken('--app-chart-4', '#F6C85F'),
            getDesignToken('--danger-color', '#FF8F82')
        ];
        for(let i=0; i<40; i++) {
            const el = document.createElement('div');
            el.className = 'confetti-piece';
            el.style.setProperty('--tx', `${(Math.random()-0.5)*600}px`);
            el.style.setProperty('--ty', `${-(Math.random()*500+300)}px`);
            el.style.backgroundColor = colors[Math.floor(Math.random()*colors.length)];
            el.style.left = '50%'; el.style.bottom = '0';
            c.appendChild(el);
            setTimeout(() => el.remove(), 1200);
        }
    },

    fireworksInterval: null,
    startFireworks() {
        if(this.fireworksInterval) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        this.fireworksInterval = setInterval(() => {
            if (!visibleSheet()) return this.stopFireworks();
            const c = document.getElementById('confetti-container');
            const x = Math.random()*100; const y = Math.random()*50+10;
            const colors = [
                getDesignToken('--danger-color', '#FF8F82'),
                getDesignToken('--app-chart-4', '#F6C85F'),
                getDesignToken('--app-chart-3', '#7AB8FF')
            ];
            const col = colors[Math.floor(Math.random()*colors.length)];
            for(let i=0; i<20; i++) {
                const p = document.createElement('div');
                p.className = 'firework-particle';
                p.style.backgroundColor = col; p.style.color = col;
                p.style.left = `${x}%`; p.style.top = `${y}%`;
                const a = (Math.PI*2*i)/20; const v = 100+Math.random()*50;
                p.style.setProperty('--tx', `${Math.cos(a)*v}px`);
                p.style.setProperty('--ty', `${Math.sin(a)*v}px`);
                c.appendChild(p);
                setTimeout(() => p.remove(), 1000);
            }
        }, 800);
    },

    stopFireworks() {
        if(this.fireworksInterval) clearInterval(this.fireworksInterval);
        this.fireworksInterval = null;
        document.getElementById('confetti-container').innerHTML = '';
    }
};
