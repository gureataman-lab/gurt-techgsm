import { validateDevice, RAM, STORAGE, DAYS, PHOTO_LIMIT, COSMETIC, COLORS, galleryPaths } from '../assets/device-fields.js';

export function createDeviceEditor({db,imageUrl,validateProduct,lock,message,loadProducts}) {
 const $=id=>document.getElementById(id), form=$('productForm'), field=name=>form.elements.namedItem(name);
 let editing=null, brands=[], modelPages=[], next=null, specs=null, path='', serial=0, pending=false, saving=false;
 let photos=[], defects=[];
 const option=(value,label=value)=>new Option(label,value);
 function fill(name,values,label=x=>x) { field(name).replaceChildren(option('','Seçin'),...values.map(x=>option(x,label(x)))); }
 fill('ram',RAM,x=>x+' GB');fill('storage',STORAGE,x=>x==='1024'?'1 TB':x+' GB');
 for(const name of ['line1','line2']) fill(name,DAYS,x=>x+' gün');
 fill('cosmetic',COSMETIC,x=>x+' / 10');
 fill('color',COLORS);field('color').add(option('other','Diğer / Özel renk'));
 function conditions() {
   const unregistered=field('registration').value==='Kayıtsız';
   $('lineFields').hidden=!unregistered;$('methodField').hidden=field('registration').value!=='Kayıtlı';
   field('line1').required=field('line2').required=unregistered;field('method').required=field('registration').value==='Kayıtlı';
   const used=field('state').value==='İkinci el';$('cosmeticField').hidden=!used;field('cosmetic').required=used;
   const battery=field('battery_percent').value!=='';
   $('batteryCyclesField').hidden=!battery;field('battery_cycles').required=battery;
   if(!battery)field('battery_cycles').value='';
   const custom=field('color').value==='other';$('customColorField').hidden=!custom;field('custom_color').required=custom;
 }
 field('registration').onchange=conditions;field('state').onchange=conditions;
 field('battery_percent').oninput=conditions;field('color').onchange=conditions;
 async function source(action,path) {
   const {data,error}=await db.functions.invoke('phone-catalog',{body:{action,path}});
   if(error||data?.error) throw new Error(data?.error||'Model servisine ulaşılamadı. phone-catalog kurulumunu veya bağlantıyı kontrol edin.');
   return data;
 }
 function brandOptions(selected='') {
   field('brand').replaceChildren(option('','Marka seçin'),...brands.map(b=>option(b.name)));
   if(selected&&!brands.some(b=>b.name===selected)) field('brand').add(option(selected,selected+' (mevcut ürün)'));
   field('brand').value=selected;
 }
 async function loadBrands() {
   try { const r=await fetch('../assets/phone-brands.json');if(!r.ok)throw Error();const data=await r.json();brands=data.brands;brandOptions(field('brand').value); }
   catch { $('sourceStatus').textContent='Marka listesi yüklenemedi. Sayfayı yenileyin.'; }
   try { const data=await source('brands');if(Array.isArray(data.brands)){brands=data.brands;brandOptions(field('brand').value);} }
   catch { /* Verified bundled list is still available. Model requests show connection errors. */ }
 }
 function renderModels(selected=path) {
   field('model').replaceChildren(option('','Model seçin'),...modelPages.map(m=>option(m.path,m.name)));
   if(selected&&!modelPages.some(m=>m.path===selected)&&editing?.device_details?.model) field('model').add(option(selected,editing.device_details.model));
   field('model').value=selected;field('model').disabled=false;$('moreModels').hidden=!next;
 }
 async function getModels(more=false) {
   const token=++serial;
   const brand=brands.find(b=>b.name===field('brand').value);
   if(!more){modelPages=[];next=null;path='';specs=null;field('model').replaceChildren(option('','Modeller yükleniyor…'));showSpecs();}
   if(!brand){pending=false;field('model').replaceChildren(option('','Önce marka seçin'));field('model').disabled=true;$('moreModels').hidden=true;$('sourceStatus').textContent='';return;}
   if(more&&!next)return;
   pending=true;$('moreModels').disabled=true;field('model').disabled=true;$('sourceStatus').textContent='Modeller GSMArena’dan alınıyor…';
   try {
     const data=await source('models',more?next:brand.path);if(token!==serial)return;
     const map=new Map([...modelPages,...data.models].map(m=>[m.path,m]));modelPages=[...map.values()];next=data.next;
     renderModels();$('sourceStatus').textContent=`${modelPages.length} model yüklendi.${next?' Diğer modeller için “Daha fazla model”e basın.':''}${data.stale?' Kaynak yanıt vermedi; son alınan liste gösteriliyor.':''}`;
   } catch(error) { if(token===serial){$('sourceStatus').textContent=error.message;if(more)renderModels();else field('model').replaceChildren(option('','Modeller alınamadı'));} }
   finally {if(token===serial){pending=false;$('moreModels').disabled=false;}}
 }
 field('brand').onchange=()=>getModels();$('moreModels').onclick=()=>getModels(true);$('retryModels').onclick=()=>getModels();
 function showSpecs() {
   const box=$('specPreview');box.replaceChildren();
   if(!specs){box.textContent='Model seçildiğinde teknik özellikler otomatik getirilecek.';return;}
   const title=document.createElement('p');title.textContent=specs.title+' · GSMArena';box.append(title);
   for(const group of specs.groups||[]){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=group.name;details.append(summary);for(const row of group.rows){const p=document.createElement('p');p.textContent=row.label+': '+row.value;details.append(p);}box.append(details);}
 }
 field('model').onchange=async()=>{
   path=field('model').value;specs=null;showSpecs();const token=++serial;if(!path){pending=false;return;}
   pending=true;$('sourceStatus').textContent='Teknik özellikler getiriliyor…';
   try {const data=await source('specs',path);if(token!==serial)return;specs=data;showSpecs();$('sourceStatus').textContent=data.stale?'Son alınan teknik özellikler kullanılıyor.':'Teknik özellikler hazır. RAM ve hafızayı sattığınız cihaza göre seçin.';}
   catch(error){if(token===serial)$('sourceStatus').textContent=error.message;}
   finally{if(token===serial)pending=false;}
 };
 function revoke(){for(const item of [...photos,...defects])if(item.file)URL.revokeObjectURL(item.url);}
 function renderPhotos(kind) {
   const items=kind==='photos'?photos:defects, box=$(kind+'Preview');box.replaceChildren();
   items.forEach((item,i)=>{const figure=document.createElement('figure'),img=document.createElement('img'),button=document.createElement('button');img.src=item.url;img.alt=(kind==='photos'?'Genel fotoğraf ':'Kusur fotoğrafı ')+(i+1);button.type='button';button.textContent='Kaldır';button.onclick=()=>{if(saving)return;if(item.file)URL.revokeObjectURL(item.url);items.splice(i,1);renderPhotos(kind);};figure.append(img,button);box.append(figure);});
 }
 for(const kind of ['photos','defects']) $(kind+'Input').onchange=event=>{
   const items=kind==='photos'?photos:defects, files=[...event.target.files];
   if(files.length+items.length>PHOTO_LIMIT||files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5242880)){
     $('formError').textContent='Her grupta en fazla 12 adet, her biri en fazla 5 MB JPG/PNG/WebP fotoğraf seçin.';event.target.value='';return;
   }
   for(const file of files)items.push({file,url:URL.createObjectURL(file),path:null});event.target.value='';$('formError').textContent='';renderPhotos(kind);
 };
 function open(product=null) {
   if(saving)return;serial++;pending=false;revoke();editing=product?{...product}:null;modelPages=[];next=null;
   form.reset();$('formError').textContent='';$('sourceStatus').textContent='';$('moreModels').hidden=true;
   const d=product?.device_details;
   brandOptions(product?.brand||'');
   for(const name of ['title','category','price','stock'])if(product)field(name).value=product[name];
   field('published').checked=product?.published||false;
   for(const name of ['ram','storage','origin','registration','line1','line2','method','rom','state','cosmetic','battery_percent','battery_cycles'])field(name).value=d?.[name]??'';
   field('color').value=d?.color?(COLORS.includes(d.color)?d.color:'other'):'';
   field('custom_color').value=d?.color&&!COLORS.includes(d.color)?d.color:'';
   path=d?.model_path||'';specs=d?.specs||null;
   field('model').replaceChildren(option('','Önce marka seçin'));field('model').disabled=true;
   if(d?.model){field('model').add(option(path,d.model));field('model').value=path;field('model').disabled=false;}
   photos=galleryPaths(product||{},'photos').map(p=>({path:p,url:imageUrl(p)}));defects=galleryPaths(product||{},'defects').map(p=>({path:p,url:imageUrl(p)}));
   renderPhotos('photos');renderPhotos('defects');showSpecs();conditions();
   $('editorTitle').textContent=product?'Ürünü düzenle':'Yeni ürün';$('deleteProduct').hidden=!product;
   $('editor').showModal();
   if(product&&!d)$('sourceStatus').textContent='Mevcut fotoğraf ve açıklama korundu. Yeni cihaz alanlarını seçerek güncelleyin.';
 }
 async function upload(items) {
   for(const item of items)if(!item.path){const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[item.file.type],p=crypto.randomUUID()+'.'+ext;
     const {error}=await db.storage.from('product-images').upload(p,item.file,{contentType:item.file.type,upsert:false});if(error)throw error;item.path=p;}
   return items.map(i=>i.path);
 }
 form.onsubmit=async event=>{
   event.preventDefault();if(saving)return;if(pending){$('formError').textContent='Model ve özelliklerin yüklenmesini bekleyin.';return;}
   let value,d;
   try {
     if(!path||!specs||specs.url!=='https://www.gsmarena.com/'+path)throw new Error('Modelin teknik özellikleri alınamadı. Modeli tekrar seçin.');
     d={model:field('model').selectedOptions[0]?.textContent||'',model_path:path,specs,photos:[],defects:[]};
     for(const name of ['ram','storage','origin','registration','line1','line2','method','rom','state','cosmetic','battery_percent','battery_cycles'])d[name]=field(name).value;
     d.color=field('color').value==='other'?field('custom_color').value.trim():field('color').value;
     if(field('color').value==='other'&&!d.color)throw new Error('Özel rengi yazın.');
     d=validateDevice(d);
     value=validateProduct({title:field('title').value,brand:field('brand').value,category:field('category').value,price:Number(field('price').value),stock:Number(field('stock').value),description:editing?.description||'',condition:'',published:field('published').checked});
   }catch(error){$('formError').textContent=error.message;return;}
   saving=true;lock(true);$('saveProduct').textContent='Kaydediliyor…';$('formError').textContent='';
   try {
     d.photos=await upload(photos);d.defects=await upload(defects);value.device_details=validateDevice(d);value.image_path=d.photos[0]||null;
     const request=editing?db.from('products').update(value).eq('id',editing.id).eq('version',editing.version):db.from('products').insert(value);
     const {data,error}=await request.select('id');if(error)throw error;if(!data?.length)throw new Error('CONFLICT');
     $('editor').close();message('Ürün kaydedildi. Mağaza bir dakika içinde güncellenecek.');await loadProducts();
   }catch(error){$('formError').textContent=error.message==='CONFLICT'?'Ürün başka bir yönetici tarafından değiştirildi. Formu kapatıp listeyi yenileyin.':error.code==='PGRST204'?'Önce veritabanı güncellemesini çalıştırın.':'Kayıt tamamlanamadı. Bağlantıyı, oturumu ve veritabanı kurulumunu kontrol edin.';}
   finally{saving=false;lock(false);$('saveProduct').textContent='Kaydet';}
 };
 $('deleteProduct').onclick=async()=>{
   if(saving||!editing||!confirm('“'+editing.title+'” silinsin mi?'))return;
   saving=true;lock(true);
   try{const {data,error}=await db.from('products').delete().eq('id',editing.id).eq('version',editing.version).select('id');if(error||!data?.length)throw Error();$('editor').close();message('Ürün silindi.');await loadProducts();}
   catch{$('formError').textContent='Silinemedi. Ürün değişmiş veya bağlantı kesilmiş olabilir. Listeyi yenileyin.';}
   finally{saving=false;lock(false);}
 };
 $('editor').addEventListener('cancel',e=>{if(saving)e.preventDefault();});
 $('editor').addEventListener('close',()=>{serial++;pending=false;revoke();});
 $('cancelEdit').onclick=()=>{if(!saving)$('editor').close();};
 $('newProduct').onclick=()=>open();
 let loaded=false;
 return {open, loadBrands:()=>{if(!loaded){loaded=true;loadBrands();}}};
}
