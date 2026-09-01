import { fallbackCopyToClipboard } from '../utils.js';

const getDesignToken = (name, fallback) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

export const uiShared = {
    showModal(id) {
        document.getElementById('locationOverlay').classList.add('visible');
        document.getElementById(id).classList.add('visible');
    },

    closeModals() {
        document.querySelectorAll('.bottom-sheet, .overlay').forEach(el => el.classList.remove('visible'));
        this.stopFireworks();
    },

    showSuccess(text, { saveError = null } = {}) {
        this.closeModals();
        const sheet = document.getElementById('successSheet');
        const icon = document.getElementById('successIcon');
        const btn = document.getElementById('finalCopyBtn');
        const title = document.getElementById('successTitle');
        const message = document.getElementById('successMessage');
        const saveFailed = Boolean(saveError);

        document.getElementById('locationOverlay').classList.add('visible');
        sheet.classList.add('visible');

        icon.style.color = getDesignToken('--brand-primary', '#D4521A');
        icon.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">content_copy</span>';
        title.innerText = saveFailed ? 'LISTA NIE ZOSTAŁA WYSŁANA' : 'LISTA GOTOWA!';
        message.innerText = saveFailed
            ? `GitHub nie zapisał listy. Możesz mimo to ją skopiować. ${saveError.message || ''}`
            : 'Kliknij poniżej, aby skopiować i wklej na Messengerze.';
        btn.innerText = "SKOPIUJ LISTĘ";
        btn.style.background = "";

        btn.onclick = () => {
            navigator.clipboard.writeText(text).catch(() => fallbackCopyToClipboard(text));
            btn.innerText = "SKOPIOWANO!";
            title.innerText = 'LISTA SKOPIOWANA';
            if (saveFailed) message.innerText = 'Lista została skopiowana, ale nie została wysłana do GitHub. Spróbuj zapisać ją później.';
            btn.style.background = getDesignToken('--success-color', '#7DCE82');
            icon.style.color = getDesignToken('--success-color', '#7DCE82');
            icon.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">check_circle</span>';
            this.triggerConfetti();
            this.startFireworks();
            setTimeout(() => this.closeModals(), 4000);
        };
    },

    triggerConfetti() {
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
        this.fireworksInterval = setInterval(() => {
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
