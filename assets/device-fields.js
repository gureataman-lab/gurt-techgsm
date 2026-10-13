export const RAM = ['4','6','8','12','16','24'];
export const STORAGE = ['128','256','512','1024'];
export const DAYS = ['30','60','90','120'];
export const PHOTO_LIMIT = 12;
export function validateDevice(d) {
    const allowed = {ram:RAM, storage:STORAGE, origin:['KVK','Yurtdışı'], registration:['Kayıtlı','Kayıtsız'], rom:['Global','Çin','Convert'], state:['Sıfır','İkinci el']};
    for (const [key, values] of Object.entries(allowed)) if (!values.includes(d[key])) throw new Error('Cihaz alanlarını eksiksiz seçin.');
    if (!d.model?.trim() || d.model.length > 200) throw new Error('Bir model seçin.');
    const out = {...d};
    if (d.registration === 'Kayıtsız') {
        if (!DAYS.includes(d.line1) || !DAYS.includes(d.line2)) throw new Error('İki hattın kullanım süresini seçin.');
        out.method = null;
    } else {
        if (!['Server','Direnç'].includes(d.method)) throw new Error('Kayıt yöntemini seçin.');
        out.line1 = out.line2 = null;
    }
    if (d.state === 'İkinci el') {
        if (!/^(10|[1-9])$/.test(String(d.cosmetic))) throw new Error('Kasa durumunu 1–10 arasında seçin.');
    } else out.cosmetic = null;
    for (const key of ['photos','defects']) {
        if (!Array.isArray(d[key]) || d[key].length > PHOTO_LIMIT || d[key].some(p => !/^[0-9a-f-]+\.(jpg|png|webp)$/.test(p))) throw new Error('Fotoğraf listesini kontrol edin.');
    }
    return out;
}
export function deviceRows(p) {
    const d = p.device_details;
    const rows = [['Ürün adı',p.title],['Marka',p.brand]];
    if (d) {
        rows.push(['Model',d.model],['RAM',d.ram+' GB'],['Hafıza',d.storage==='1024'?'1 TB':d.storage+' GB'],['KVK / Yurtdışı',d.origin],['Kayıt durumu',d.registration]);
        if (d.registration==='Kayıtsız') rows.push(['1. hat kullanım süresi',d.line1+' gün'],['2. hat kullanım süresi',d.line2+' gün']);
        else rows.push(['Kayıt yöntemi',d.method]);
        rows.push(['ROM',d.rom],['Cihaz durumu',d.state]);
        if (d.state==='İkinci el') rows.push(['Kasa durumu',d.cosmetic+'/10']);
    } else if (p.condition) rows.push(['Durum',p.condition]);
    rows.push(['Stok',p.stock > 0 ? p.stock+' adet' : 'Tükendi']);
    return rows;
}
export function galleryPaths(p, kind) {
    const stored = p.device_details?.[kind];
    return Array.isArray(stored) ? stored : (kind==='photos' && p.image_path ? [p.image_path] : []);
}
