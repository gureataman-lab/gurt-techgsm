import { db, configured, categories, money, imageUrl, validateProduct } from '../assets/catalog-client.js';
const $ = id => document.getElementById(id);
let products = [], editing = null, selectedImage = null, photoRemoved = false, preview = '', busy = false, sessionEpoch = 0;
let recovering = new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
function message(text = '', error = false) { $('notice').textContent = text; $('notice').classList.toggle('error', error); }
function view(name) { ['loginView', 'resetView', 'dashboard'].forEach(id => { $(id).hidden = id !== name; }); }
function lock(value) {
    busy = value;
    $('productFields').disabled = value;
    ['saveProduct', 'deleteProduct', 'cancelEdit', 'newProduct', 'refresh', 'logout'].forEach(id => { $(id).disabled = value; });
}
function explain(error) {
    if (error?.code === '42501' || error?.status === 403) return 'İşlem yetkiniz yok. Hesabınızın yönetici olarak tanımlandığını kontrol edin.';
    return error?.message === 'CONFLICT' ? 'Bu ürün başka bir yönetici tarafından değiştirildi veya silindi. Formdaki bilgileri not edip kapatın, listeyi yenileyerek tekrar açın.' : 'İşlem tamamlanamadı. Bağlantıyı ve oturumunuzu kontrol edip tekrar deneyin.';
}
function node(tag, text, className = '') { const el = document.createElement(tag); el.textContent = text; el.className = className; return el; }

async function authorize(session) {
    const epoch = ++sessionEpoch;
    if (!session) {
        products = []; $('productList').replaceChildren();
        if ($('editor').open) $('editor').close();
        view('loginView'); return;
    }
    const { data, error } = await db.rpc('is_catalog_admin');
    if (epoch !== sessionEpoch) return;
    if (error || data !== true) {
        view('loginView'); products = []; $('productList').replaceChildren();
        if ($('editor').open) $('editor').close();
        await db.auth.signOut({ scope: 'local' });
        message(error ? 'Yetki kontrolü tamamlanamadı. Tekrar giriş yapın.' : 'Bu hesap yönetim paneli için yetkilendirilmemiş.', true);
        return;
    }
    $('accountEmail').textContent = session.user.email;
    if (recovering) { view('resetView'); message(); return; }
    view('dashboard'); message(); await loadProducts();
}

async function loadProducts() {
    const epoch = sessionEpoch;
    $('listStatus').textContent = 'Ürünler yükleniyor…';
    const { data, error } = await db.from('products').select('*').order('created_at', { ascending: false }).abortSignal(AbortSignal.timeout(15000));
    if (epoch !== sessionEpoch) return;
    if (error) { $('listStatus').textContent = 'Liste yenilenemedi. Yenile düğmesiyle tekrar deneyin.'; message(explain(error), true); return; }
    products = data; renderList();
}
function renderList() {
    $('totalCount').textContent = products.length;
    $('publishedCount').textContent = products.filter(p => p.published).length;
    $('stockCount').textContent = products.reduce((sum, p) => sum + p.stock, 0);
    $('emptyCount').textContent = products.filter(p => p.stock === 0).length;
    const query = $('search').value.toLocaleLowerCase('tr');
    const filter = $('listFilter').value;
    const filtered = products.filter(p => `${p.title} ${p.brand}`.toLocaleLowerCase('tr').includes(query))
        .filter(p => filter === 'all' || (filter === 'published' && p.published) || (filter === 'draft' && !p.published) || (filter === 'empty' && p.stock === 0));
    const fragment = document.createDocumentFragment();
    filtered.forEach(product => {
        const card = node('article', '', 'product');
        if (product.image_path) {
            const img = document.createElement('img'); img.src = imageUrl(product.image_path); img.alt = product.title; img.loading = 'lazy'; card.append(img);
        } else card.append(node('div', '▯', 'placeholder'));
        const meta = node('div', '', 'meta');
        meta.append(node('span', categories[product.category]), node('span', product.published ? 'Yayında' : 'Taslak', product.published ? 'status' : 'status draft'));
        card.append(meta, node('h3', product.title), node('span', money(product.price), 'price'));
        card.append(node('div', `Stok: ${product.stock} adet · ${product.condition || 'Durum belirtilmedi'}`, 'small muted'));
        const edit = node('button', 'Düzenle'); edit.type = 'button'; edit.addEventListener('click', () => openEditor(product));
        card.append(edit); fragment.append(card);
    });
    $('productList').replaceChildren(fragment);
    $('listStatus').textContent = filtered.length ? `${filtered.length} ürün gösteriliyor.` : (products.length ? 'Aramanıza uygun ürün bulunamadı.' : 'Henüz ürün eklemediniz. İlk ürününüzü ekleyerek başlayın.');
}
function showPhoto(url) { $('photoPreview').hidden = !url; $('photoPreview').src = url || ''; }
function openEditor(product = null) {
    if (busy) return;
    editing = product ? { ...product } : null; selectedImage = null; photoRemoved = false;
    if (preview) { URL.revokeObjectURL(preview); preview = ''; }
    const form = $('productForm'); form.reset(); $('formError').textContent = '';
    if (product) {
        ['title', 'brand', 'category', 'price', 'stock', 'condition', 'description'].forEach(key => { form.elements[key].value = product[key]; });
        form.elements.published.checked = product.published;
    }
    $('editorTitle').textContent = product ? 'Ürünü düzenle' : 'Yeni ürün';
    $('deleteProduct').hidden = !product;
    showPhoto(imageUrl(product?.image_path));
    $('editor').showModal();
}
$('editor').addEventListener('cancel', event => { if (busy) event.preventDefault(); });
$('cancelEdit').onclick = () => { if (!busy) $('editor').close(); };
$('newProduct').onclick = () => openEditor();
$('refresh').onclick = loadProducts;
$('search').oninput = renderList; $('listFilter').onchange = renderList;
$('photo').onchange = () => {
    const file = $('photo').files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        $('formError').textContent = 'En fazla 5 MB boyutunda JPG, PNG veya WebP seçin.'; $('photo').value = ''; return;
    }
    $('formError').textContent = ''; selectedImage = file; photoRemoved = false;
    if (preview) URL.revokeObjectURL(preview);
    preview = URL.createObjectURL(file); showPhoto(preview);
};
$('removePhoto').onclick = () => { selectedImage = null; photoRemoved = true; $('photo').value = ''; showPhoto(''); };

$('productForm').onsubmit = async event => {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    let value;
    try {
        value = validateProduct({ title: form.elements.title.value, brand: form.elements.brand.value, category: form.elements.category.value,
            price: Number(form.elements.price.value), stock: Number(form.elements.stock.value), condition: form.elements.condition.value,
            description: form.elements.description.value, published: form.elements.published.checked, image_path: photoRemoved ? null : editing?.image_path });
    } catch (error) { $('formError').textContent = error.message; return; }
    lock(true); $('formError').textContent = ''; $('saveProduct').textContent = 'Kaydediliyor…';
    try {
        if (selectedImage) {
            const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[selectedImage.type];
            const path = `${crypto.randomUUID()}.${ext}`;
            const { error } = await db.storage.from('product-images').upload(path, selectedImage, { contentType: selectedImage.type, upsert: false });
            if (error) throw error;
            value.image_path = path;
        }
        let request = editing ? db.from('products').update(value).eq('id', editing.id).eq('version', editing.version) : db.from('products').insert(value);
        const { data, error } = await request.select('id');
        if (error) throw error;
        if (!data?.length) throw new Error('CONFLICT');
        $('editor').close(); message('Ürün kaydedildi. Yayındaki ürünler mağazaya en geç bir dakika içinde yansır.');
        await loadProducts();
    } catch (error) { $('formError').textContent = explain(error); }
    finally { lock(false); $('saveProduct').textContent = 'Kaydet'; }
};
$('deleteProduct').onclick = async () => {
    if (busy || !editing || !confirm(`“${editing.title}” katalogdan silinsin mi?`)) return;
    lock(true);
    try {
        const { data, error } = await db.from('products').delete().eq('id', editing.id).eq('version', editing.version).select('id');
        if (error) throw error; if (!data?.length) throw new Error('CONFLICT');
        $('editor').close(); message('Ürün silindi.'); await loadProducts();
    } catch (error) { $('formError').textContent = explain(error); }
    finally { lock(false); }
};
$('loginForm').onsubmit = async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button'); button.disabled = true; message('Giriş yapılıyor…');
    try {
        const { data, error } = await db.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
        $('password').value = '';
        if (error) message('Giriş yapılamadı. E-posta ve şifrenizi kontrol edin.', true);
        else await authorize(data.session);
    } catch { message('Bağlantı kurulamadı. Tekrar deneyin.', true); }
    finally { button.disabled = false; }
};
$('logout').onclick = async () => {
    const { error } = await db.auth.signOut({ scope: 'local' });
    if (error) { message('Çıkış tamamlanamadı. Tekrar deneyin.', true); return; }
    await authorize(null); message('Güvenli çıkış yapıldı.');
};
$('forgot').onclick = async () => {
    if (!$('email').reportValidity()) return;
    $('forgot').disabled = true;
    try {
        const { error } = await db.auth.resetPasswordForEmail($('email').value.trim(), { redirectTo: new URL('./', location.href).href });
        message(error ? 'Sıfırlama isteği gönderilemedi. Mağaza hesap yöneticinize başvurun.' : 'Hesabınız kayıtlıysa şifre yenileme bağlantısı e-posta adresinize gönderilecek.', Boolean(error));
    } catch { message('Bağlantı kurulamadı.', true); }
    finally { $('forgot').disabled = false; }
};
$('resetForm').onsubmit = async event => {
    event.preventDefault();
    if ($('newPassword').value !== $('confirmPassword').value) { message('Şifreler eşleşmiyor.', true); return; }
    const button = event.currentTarget.querySelector('button'); button.disabled = true;
    try {
        const { error } = await db.auth.updateUser({ password: $('newPassword').value });
        if (error) { message('Şifre kaydedilemedi. Yeni bir sıfırlama bağlantısı isteyin.', true); return; }
        recovering = false; event.target.reset();
        await db.auth.signOut({ scope: 'local' }); await authorize(null); message('Şifreniz kaydedildi. Yeni şifrenizle giriş yapın.');
    } catch { message('Bağlantı kurulamadı. Tekrar deneyin.', true); }
    finally { button.disabled = false; }
};

if (!configured) {
    view('loginView'); $('loginForm').querySelector('button').disabled = true; $('forgot').disabled = true;
    message('Panel kurulumu henüz tamamlanmadı. Önce mağazanın hesap bağlantısı yapılmalı.', true);
} else {
    db.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') recovering = true;
        if (['SIGNED_OUT', 'PASSWORD_RECOVERY', 'INITIAL_SESSION'].includes(event)) setTimeout(() => authorize(session).catch(() => message('Oturum doğrulanamadı.', true)), 0);
    });
}
