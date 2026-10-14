export const kindOf=p=>p.category==='aksesuar'?'accessory':'phone';
export const fold=value=>String(value??'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('ı','i');
export const phoneFields=[['brand','Marka'],['model','Model'],['ram','RAM'],['storage','Hafıza'],['origin','KVK / Yurtdışı'],['registration','Kayıt durumu'],['method','Kayıt yöntemi'],['line1','1. hat süresi'],['line2','2. hat süresi'],['rom','ROM'],['state','Cihaz durumu'],['cosmetic','Kasa puanı'],['color','Renk']];
export function fieldValue(p,key){if(key==='brand')return p.brand;return p.device_details?.[key]??(key==='state'?(['Sıfır','İkinci el'].includes(p.condition)?p.condition:(p.category==='ikinciel'?'İkinci el':'')):'');}
export function optionLabel(key,value){if(key==='ram')return value+' GB';if(key==='storage')return value==='1024'?'1 TB':value+' GB';if(key==='line1'||key==='line2')return value+' gün';if(key==='cosmetic')return value+'/10';return value;}
export function matchesPhone(p,f={}){
 if(kindOf(p)!=='phone')return false;
 if(f.query&&!fold([p.title,p.brand,p.description,p.device_details?.model].join(' ')).includes(fold(f.query)))return false;
 if(f.collection&&p.collection_id!==f.collection)return false;
 if(f.available&&p.stock<=0)return false;
 for(const [key]of phoneFields)if(f[key]&&String(fieldValue(p,key))!==f[key])return false;
 for(const [key,actual]of [['price',p.price],['battery',p.device_details?.battery_percent],['cycles',p.device_details?.battery_cycles]]){
  for(const [suffix,accept]of [['Min',(a,b)=>a>=b],['Max',(a,b)=>a<=b]]){
   const limit=f[key+suffix];if(limit!==''&&limit!=null&&(actual==null||actual===''||!Number.isFinite(Number(limit))||!accept(Number(actual),Number(limit))))return false;
  }
 }
 return true;
}
export const isOffer=p=>Boolean(p.featured&&p.published&&p.stock>0);
