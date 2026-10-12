import { db, configured, imageUrl, money } from './catalog-client.js';
const grid = document.getElementById('productGrid');
let loading = false, category = 'all';
function element(tag, className, text) {
    const node = document.createElement(tag); node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}
function applyFilters() {
    const query = (document.getElementById('searchInput')?.value || '').toLocaleLowerCase('tr');
    grid.querySelectorAll('.product-item').forEach(card => {
        card.style.display = (category === 'all' || card.dataset.category === category) && card.dataset.title.includes(query) ? 'flex' : 'none';
    });
}
function render(products) {
    const fragment = document.createDocumentFragment();
    products.forEach(product => {
        const used = product.category === 'ikinciel';
        const card = element('div', 'glass-card rounded-2xl p-4 flex flex-col justify-between product-item');
        card.dataset.category = product.category;
        card.dataset.title = `${product.brand} ${product.title} ${product.condition}`.toLocaleLowerCase('tr');
        const top = element('div', '');
        const visual = element('div', 'relative bg-gray-900 rounded-xl p-6 text-center mb-4 border border-gray-800 group');
        if (product.condition) visual.append(element('span', 'absolute top-2 left-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded', product.condition));
        if (product.image_path) {
            const img = element('img', 'w-full h-32 object-contain mx-auto'); img.src = imageUrl(product.image_path); img.alt = product.title; img.loading = 'lazy'; visual.append(img);
        } else visual.append(element('i', 'fa-solid fa-mobile-screen-button text-6xl text-gray-400 group-hover:scale-110 transition duration-300'));
        const meta = element('div', 'flex items-center justify-between text-xs text-gray-400 mb-1');
        meta.append(element('span', '', product.brand), element('span', product.stock > 0 ? 'text-emerald-400 font-semibold' : 'text-gray-400 font-semibold', product.stock > 0 ? 'Stokta Var' : 'Tükendi'));
        top.append(visual, meta, element('h3', 'font-bold text-white text-base mb-1', product.title), element('p', 'text-xs text-gray-400 line-clamp-2', product.description));
        const bottom = element('div', 'mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between');
        const price = element('div', '');
        price.append(element('span', 'text-xs text-gray-500 block', 'Dükkan Fiyatı'), element('span', `text-lg font-black ${used ? 'text-amber-400' : 'text-brand-400'}`, money(product.price)));
        const button = element('button', `${used ? 'bg-amber-600 hover:bg-amber-500' : 'bg-brand-500 hover:bg-brand-600'} text-white text-xs font-bold px-3.5 py-2 rounded-lg transition flex items-center gap-1.5`);
        button.type = 'button'; button.disabled = product.stock <= 0;
        if (button.disabled) button.classList.add('opacity-50', 'cursor-not-allowed');
        button.append(element('i', 'fa-solid fa-cart-plus'), document.createTextNode(button.disabled ? 'Tükendi' : 'Sepete Ekle'));
        button.addEventListener('click', event => window.addToCart(product.title, Number(product.price), event.currentTarget));
        bottom.append(price, button); card.append(top, bottom); fragment.append(card);
    });
    if (!products.length) fragment.append(element('p', 'text-sm text-gray-400 col-span-full py-6', 'Kataloğumuz güncelleniyor. Yeni ürünler yakında burada.'));
    grid.replaceChildren(fragment); applyFilters();
}
async function refresh() {
    if (loading) return; loading = true;
    try {
        const { data, error } = await db.from('products').select('id,title,brand,category,price,stock,condition,description,image_path').eq('published', true).order('created_at', { ascending: false }).abortSignal(AbortSignal.timeout(15000));
        if (error) throw error;
        render(data);
    } catch {
        grid.replaceChildren(element('p', 'text-sm text-gray-400 col-span-full py-6', 'Ürün listesi şu anda yüklenemiyor. Lütfen biraz sonra tekrar deneyin.'));
    } finally { loading = false; }
}
if (configured && grid) {
    // Existing category and search buttons keep their look; dynamic cards share both filters.
    document.getElementById('filterButtons').addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        const match = button.getAttribute('onclick')?.match(/filterCategory\('([^']+)'\)/);
        if (match) { category = match[1]; applyFilters(); }
    });
    document.getElementById('searchInput')?.addEventListener('input', applyFilters);
    grid.replaceChildren(element('p', 'text-sm text-gray-400 col-span-full py-6', 'Ürünler yükleniyor…'));
    refresh();
    setInterval(() => { if (!document.hidden) refresh(); }, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
}
