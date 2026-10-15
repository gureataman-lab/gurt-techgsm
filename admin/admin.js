import {createAccessoryEditor} from './accessory-editor.js';
import {createInventory} from './inventory.js';
import { createDeviceEditor } from './device-editor.js?v=model-memory-1';
import { db, configured, categories, money, imageUrl, validateProduct } from '../assets/catalog-client.js';
const $ = id => document.getElementById(id);
let products = [], busy = false, sessionEpoch = 0;
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
        if ($('accessoryEditor').open) $('accessoryEditor').close(); inventory.clear();
        view('loginView'); return;
    }
    const { data, error } = await db.rpc('is_catalog_admin');
    if (epoch !== sessionEpoch) return;
    if (error || data !== true) {
        view('loginView'); products = []; $('productList').replaceChildren();
        if ($('editor').open) $('editor').close();
        if ($('accessoryEditor').open) $('accessoryEditor').close(); inventory.clear();
        await db.auth.signOut({ scope: 'local' });
        message(error ? 'Yetki kontrolü tamamlanamadı. Tekrar giriş yapın.' : 'Bu hesap yönetim paneli için yetkilendirilmemiş.', true);
        return;
    }
    $('accountEmail').textContent = session.user.email;
    if (recovering) { view('resetView'); message(); return; }
    view('dashboard'); message(); deviceEditor.loadBrands(); await loadProducts();
}

async function loadProducts() {
    const epoch = sessionEpoch;
    $('listStatus').textContent = 'Ürünler yükleniyor…';
    const { data, error } = await db.from('products').select('*').order('created_at', { ascending: false }).abortSignal(AbortSignal.timeout(15000));
    if (epoch !== sessionEpoch) return;
    if (error) { $('listStatus').textContent = 'Liste yenilenemedi. Yenile düğmesiyle tekrar deneyin.'; message(explain(error), true); return; }
    const {data:groups,error:groupError}=await db.from('product_groups').select('*').order('name').abortSignal(AbortSignal.timeout(15000));
    if(epoch!==sessionEpoch)return;
    products=data;renderList();
    if(groupError){inventory.clear();$('inventoryCount').textContent='Stok yönetimi yüklenemedi. Yenile düğmesine basın.';message('Stok kategorileri yüklenemedi. Veritabanı güncellemesini ve bağlantıyı kontrol edin.',true);}
    else inventory.setData(products,groups||[]);
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
        meta.append(node('span', product.category==='aksesuar'?'Aksesuar':'Telefon'), node('span', product.published ? 'Yayında' : 'Taslak', product.published ? 'status' : 'status draft'));
        card.append(meta, node('h3', product.title), node('span', money(product.price), 'price'));
        card.append(node('div', `Stok: ${product.stock} adet · ${product.device_details?.state || product.condition || 'Durum belirtilmedi'}`, 'small muted'));
        const edit = node('button', 'Düzenle'); edit.type = 'button'; edit.addEventListener('click', () => openEditor(product));
        card.append(edit); fragment.append(card);
    });
    $('productList').replaceChildren(fragment);
    $('listStatus').textContent = filtered.length ? `${filtered.length} ürün gösteriliyor.` : (products.length ? 'Aramanıza uygun ürün bulunamadı.' : 'Henüz ürün eklemediniz. İlk ürününüzü ekleyerek başlayın.');
}
const deviceEditor = createDeviceEditor({ db, imageUrl, validateProduct, lock, message, loadProducts });
const accessoryEditor=createAccessoryEditor({db,validateProduct,loadProducts,message});
const inventory=createInventory({db,money,message,loadProducts});
function openEditor(product = null) { if(product?.category==='aksesuar')accessoryEditor.open(product);else deviceEditor.open(product); }
function management(inventoryVisible){$('inventoryPanel').hidden=!inventoryVisible;$('productManagement').hidden=inventoryVisible;$('showInventory').setAttribute('aria-pressed',String(inventoryVisible));$('showProducts').setAttribute('aria-pressed',String(!inventoryVisible));}
$('showProducts').onclick=()=>management(false);$('showInventory').onclick=()=>management(true);
$('refresh').onclick = loadProducts;
$('search').oninput = renderList; $('listFilter').onchange = renderList;
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
