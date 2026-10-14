import {validateDevice} from './device-fields.js';
export function buildTradeMessage(input){
 const clean=(key,max,required=false)=>{const v=String(input[key]??'').trim();if((required&&!v)||v.length>max)throw Error('Lütfen '+key+' bilgisini kontrol edin.');return v;};
 const brand=clean('brand',60,true),model=clean('model',200,true),title=clean('title',160),notes=clean('notes',1000);
 const d=validateDevice({...input,model,photos:[],defects:[]});
 const lines=['Merhaba GÜR-TECH GSM,','Cihazımı satmak / takas etmek istiyorum. Bilgileri aşağıdadır:',''];
 if(title)lines.push('Ürün adı: '+title);
 lines.push('Marka: '+brand,'Model: '+model,'RAM: '+d.ram+' GB','Hafıza: '+(d.storage==='1024'?'1 TB':d.storage+' GB'),'KVK / Yurtdışı: '+d.origin,'Kayıt durumu: '+d.registration);
 if(d.registration==='Kayıtsız')lines.push('1. hat kullanım süresi: '+d.line1+' gün','2. hat kullanım süresi: '+d.line2+' gün');
 else lines.push('Kayıt yöntemi: '+d.method);
 lines.push('ROM: '+d.rom,'Cihaz durumu: '+d.state);
 if(d.state==='İkinci el')lines.push('Kasa durumu: '+d.cosmetic+'/10');
 lines.push('Renk: '+(d.color||'Belirtilmedi'));
 if(d.battery_percent!=null)lines.push('Pil yüzdesi: %'+d.battery_percent,'Pil devri: '+d.battery_cycles);
 else lines.push('Pil yüzdesi / devri: Bilinmiyor');
 const box=clean('box',60,true);if(!['Kutu ve faturası var','Sadece kutusu var','Sadece faturası var','Kutu ve faturası yok'].includes(box))throw Error('Kutu ve fatura durumunu seçin.');
 lines.push('Kutu / Fatura: '+box);
 if(notes)lines.push('Ek açıklama / kusurlar: '+notes);
 lines.push('','Nakit alım veya takas teklifinizi öğrenebilir miyim?');return lines.join('\n');
}
export function tradeUrl(message){return 'https://wa.me/905316374839?text='+encodeURIComponent(message);}
