export const RAM = ['4','6','8','12','16','24'];
export const STORAGE = ['128','256','512','1024'];
export const DAYS = ['30','60','90','120'];
export const PHOTO_LIMIT = 12;
export const COSMETIC = [...Array.from({length:16},(_,i)=>String(1+i/2)), ...Array.from({length:11},(_,i)=>String((90+i)/10))];
export const COLORS = ['Siyah','Beyaz','Gri','Gümüş','Altın','Rose Gold','Titanyum','Doğal Titanyum','Siyah Titanyum','Beyaz Titanyum','Mavi Titanyum','Çöl Titanyum','Mavi','Açık Mavi','Koyu Mavi','Lacivert','Buz Mavisi','Gece Mavisi','Yeşil','Açık Yeşil','Koyu Yeşil','Mint Yeşili','Zeytin Yeşili','Zümrüt Yeşili','Kırmızı','Bordo','Pembe','Açık Pembe','Mor','Lila','Lavanta','Sarı','Turuncu','Bakır','Bronz','Kahverengi','Bej','Krem','Şampanya','Grafit','Uzay Grisi','Gece Yarısı','Yıldız Işığı','İnci Beyazı','Turkuaz','Petrol Mavisi','Mercan','Şeffaf','Çok Renkli'];
export function validateExtras(d) {
    const out={...d};
    const percent=d.battery_percent, cycles=d.battery_cycles;
    if (percent == null || percent === '') { out.battery_percent=null; out.battery_cycles=null; }
    else {
        if (!/^\d{1,3}$/.test(String(percent)) || Number(percent)>100) throw new Error('Pil yüzdesi 0–100 arasında tam sayı olmalı.');
        if (cycles == null || !/^\d{1,4}$/.test(String(cycles)) || Number(cycles)>1500) throw new Error('Pil devri 0–1500 arasında tam sayı olmalı.');
        out.battery_percent=Number(percent); out.battery_cycles=Number(cycles);
    }
    if (d.color != null && typeof d.color !== 'string') throw new Error('Rengi kontrol edin.');
    out.color=d.color?.trim()||null;
    if (out.color?.length>80) throw new Error('Renk en fazla 80 karakter olmalı.');
    return out;
}
export function validateDevice(d) {
    const allowed = {ram:RAM, storage:STORAGE, origin:['KVK','Yurtdışı'], registration:['Kayıtlı','Kayıtsız'], rom:['Global','Çin','Convert'], state:['Sıfır','İkinci el']};
    for (const [key, values] of Object.entries(allowed)) if (!values.includes(d[key])) throw new Error('Cihaz alanlarını eksiksiz seçin.');
    if (!d.model?.trim() || d.model.length > 200) throw new Error('Bir model seçin.');
    const out = validateExtras(d);
    if (d.registration === 'Kayıtsız') {
        if (!DAYS.includes(d.line1) || !DAYS.includes(d.line2)) throw new Error('İki hattın kullanım süresini seçin.');
        out.method = null;
    } else {
        if (!['Server','Direnç'].includes(d.method)) throw new Error('Kayıt yöntemini seçin.');
        out.line1 = out.line2 = null;
    }
    if (d.state === 'İkinci el') {
        if (!COSMETIC.includes(String(d.cosmetic))) throw new Error('Kasa durumunu listeden seçin.');
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
        if (d.color) rows.push(['Renk',d.color]);
        if (d.battery_percent != null && d.battery_percent !== '') {
            rows.push(['Pil yüzdesi','%'+d.battery_percent]);
            if (d.battery_cycles != null && d.battery_cycles !== '') rows.push(['Pil devri',String(d.battery_cycles)]);
        }
    } else if (p.condition) rows.push(['Durum',p.condition]);
    rows.push(['Stok',p.stock > 0 ? p.stock+' adet' : 'Tükendi']);
    return rows;
}
export function galleryPaths(p, kind) {
    const stored = p.device_details?.[kind];
    return Array.isArray(stored) ? stored : (kind==='photos' && p.image_path ? [p.image_path] : []);
}
