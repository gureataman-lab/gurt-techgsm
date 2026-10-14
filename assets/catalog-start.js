(() => {
    const config = window.CEPPLAZA_CONFIG;
    const grid = document.getElementById('productGrid');
    if (!grid || !config?.supabaseUrl || !config?.supabasePublishableKey) return;
    grid.textContent = 'Ürünler yükleniyor…';
    import('./catalog.js').catch(() => {
        grid.textContent = 'Ürün listesi yüklenemedi. Lütfen bağlantınızı kontrol edip sayfayı yenileyin.';
        const stage=document.getElementById('showcaseStage');if(stage)stage.textContent=grid.textContent;
    });
})();
