(() => {
    'use strict';
    const container = document.getElementById('newsTicker');
    if (!container) return;
    const allowedHosts = { ShiftDelete: 'shiftdelete.net', 'DonanımHaber': 'www.donanimhaber.com' };
    const cacheKey = 'cepplaza-mobile-news-v1';
    let signature = '';
    let busy = false;

    function render(items) {
        if (!Array.isArray(items)) return false;
        const valid = items.filter(item => {
            try {
                const url = new URL(item.link);
                return typeof item.title === 'string' && item.title.trim() &&
                    Object.hasOwn(allowedHosts, item.source) && url.protocol === 'https:' &&
                    url.hostname === allowedHosts[item.source] && !url.username && !url.password &&
                    !['/', '/mobil', '/cep-telefonlari'].includes(url.pathname.replace(/\/$/, '') || '/');
            } catch { return false; }
        }).slice(0, 20);
        if (!valid.length) return false;
        const nextSignature = JSON.stringify(valid);
        if (signature === nextSignature) return true;
        const fragment = document.createDocumentFragment();
        for (let copy = 0; copy < 2; copy++) {
            valid.forEach(item => {
                const link = document.createElement('a');
                link.href = item.link;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.className = 'cursor-pointer hover:underline hover:text-white transition flex items-center gap-1.5';
                const badge = document.createElement('span');
                badge.className = 'bg-brand-500/20 text-brand-400 border border-brand-500/30 text-[9px] px-1.5 py-0.2 rounded';
                badge.textContent = item.source;
                const title = document.createElement('span');
                title.textContent = item.title;
                const arrow = document.createElement('i');
                arrow.className = 'fa-solid fa-chevron-right text-[9px] text-gray-500';
                link.append(badge, title, arrow);
                if (copy) {
                    link.tabIndex = -1;
                    link.setAttribute('aria-hidden', 'true');
                }
                const separator = document.createElement('span');
                separator.className = 'text-gray-700';
                separator.textContent = '•';
                fragment.append(link, separator);
            });
        }
        container.replaceChildren(fragment);
        signature = nextSignature;
        return true;
    }

    async function refresh() {
        if (busy) return;
        busy = true;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(new URL('data/news.json', document.baseURI), {
                cache: 'no-store', signal: controller.signal
            });
            if (!response.ok) throw new Error('News unavailable');
            const data = await response.json();
            if (!render(data.items)) throw new Error('Empty news feed');
            try { localStorage.setItem(cacheKey, JSON.stringify(data.items)); } catch { /* Storage is optional. */ }
        } catch {
            if (!signature) container.textContent = 'Haber akışı şu anda yüklenemiyor.';
        } finally {
            clearTimeout(timeout);
            busy = false;
        }
    }

    container.textContent = 'Güncel mobil haberler yükleniyor…';
    try { render(JSON.parse(localStorage.getItem(cacheKey))); } catch { /* First visit or blocked storage. */ }
    refresh();
    setInterval(() => { if (!document.hidden) refresh(); }, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    const pause = () => { container.style.animationPlayState = 'paused'; };
    const resume = () => { container.style.animationPlayState = container.matches(':hover, :focus-within') ? 'paused' : 'running'; };
    container.addEventListener('mouseenter', pause);
    container.addEventListener('mouseleave', resume);
    container.addEventListener('focusin', pause);
    container.addEventListener('focusout', resume);
})();
