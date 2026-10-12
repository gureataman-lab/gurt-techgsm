import('./admin.js').catch(() => {
    const notice = document.getElementById('notice');
    notice.textContent = 'Yönetim paneli yüklenemedi. Bağlantınızı kontrol edip sayfayı yenileyin.';
    notice.classList.add('error');
});
