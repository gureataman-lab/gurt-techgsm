import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.102.0/+esm';

const config = window.GURTECH_CONFIG || {};
export const configured = Boolean(config.supabaseUrl && config.supabasePublishableKey);
export const db = configured ? createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.sessionStorage }
}) : null;

export const categories = { apple: 'Apple iPhone', samsung: 'Samsung', xiaomi: 'Xiaomi / Redmi', ikinciel: '2. El Garantili', aksesuar: 'Aksesuar & Şarj' };
export const money = value => Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' ₺';
export function imageUrl(path) {
    return path && db ? db.storage.from('product-images').getPublicUrl(path).data.publicUrl : '';
}
export function validateProduct(value) {
    const title = String(value.title || '').trim();
    const description = String(value.description || '').trim();
    const condition = String(value.condition || '').trim();
    const brand = String(value.brand || '').trim();
    if (!title || title.length > 160) throw new Error('Ürün adı 1–160 karakter olmalı.');
    if (!brand || brand.length > 60) throw new Error('Marka 1–60 karakter olmalı.');
    if (!Object.hasOwn(categories, value.category)) throw new Error('Bir kategori seçin.');
    if (!Number.isFinite(value.price) || value.price <= 0 || value.price > 10000000) throw new Error('Geçerli bir fiyat girin.');
    if (!Number.isInteger(value.stock) || value.stock < 0 || value.stock > 100000) throw new Error('Stok adedi 0–100.000 arasında olmalı.');
    if (description.length > 2000 || condition.length > 120) throw new Error('Açıklama veya durum bilgisi çok uzun.');
    return { title, brand, category: value.category, description, condition,
        price: Math.round(value.price * 100) / 100, stock: value.stock,
        published: Boolean(value.published), image_path: value.image_path || null };
}
