import {kindOf,fold} from '../assets/catalog-tools.js';
export function createInventory({db,money,message,loadProducts}){
 const $=id=>document.getElementById(id),node=(tag,text='')=>{const e=document.createElement(tag);e.textContent=text;return e;};
 let products=[],groups=[],busy=false;
 const label=(title,input)=>{const l=node('label',title);l.append(input);return l;};
 function render(){
  const kind=$('inventoryKind').value,group=$('inventoryGroup').value,query=fold($('inventorySearch').value),only=$('inventoryOnlyStock').checked;
  const list=products.filter(p=>(!kind||kindOf(p)===kind)&&(!group||(p.collection_id||'none')===group)&&(!only||p.stock>0)&&fold(p.title+' '+p.brand).includes(query));
  const box=$('inventoryList');box.replaceChildren();$('inventoryCount').textContent=list.length+' ürün';
  for(const p of list){
   const row=node('form');row.className='inventory-row';row.append(node('h3',p.title),node('p',money(p.price)+' · '+(kindOf(p)==='phone'?'Telefon':'Aksesuar')));
   const fields=node('fieldset');fields.disabled=busy;
   const stock=node('input');stock.type='number';stock.min=0;stock.max=100000;stock.step=1;stock.required=true;stock.value=p.stock;
   const category=node('select');category.append(new Option('Kategorisiz',''),...groups.filter(g=>g.kind===kindOf(p)).map(g=>new Option(g.name,g.id)));category.value=p.collection_id||'';
   const published=node('input');published.type='checkbox';published.checked=p.published;
   const featured=node('input');featured.type='checkbox';featured.checked=Boolean(p.featured);
   function availability(){featured.disabled=!published.checked||Number(stock.value)<=0;if(featured.disabled)featured.checked=false;}
   stock.oninput=published.onchange=availability;availability();
   fields.append(label('Stok adedi',stock),label('Müşteri kategorisi',category));const pub=label('Yayında',published),offer=label('Haftanın fırsatı',featured);pub.className=offer.className='checkbox';fields.append(pub,offer);
   const save=node('button','Değişiklikleri kaydet');save.type='submit';fields.append(save);row.append(fields);
   row.onsubmit=async e=>{
    e.preventDefault();if(busy)return;const quantity=Number(stock.value);if(!Number.isInteger(quantity)||quantity<0||quantity>100000)return;
    busy=true;for(const f of box.querySelectorAll('fieldset'))f.disabled=true;
    try{const {data,error}=await db.from('products').update({stock:quantity,collection_id:category.value||null,published:published.checked,featured:featured.checked&&published.checked&&quantity>0}).eq('id',p.id).eq('version',p.version).select('id');if(error)throw error;if(!data?.length)throw Error('CONFLICT');message('Stok, kategori ve fırsat seçimi kaydedildi. Müşteri sayfası bir dakika içinde güncellenir.');await loadProducts();}
    catch(error){message(error.message==='CONFLICT'?'Ürün başka bir yönetici tarafından değiştirildi. Yenile düğmesine basıp tekrar deneyin.':'Stok bilgisi kaydedilemedi. Kurulumu ve bağlantıyı kontrol edin.',true);}
    finally{busy=false;for(const f of box.querySelectorAll('fieldset'))f.disabled=false;}
   };box.append(row);
  }
  if(!list.length)box.append(node('p','Bu seçimde ürün bulunmuyor.'));
 }
 function groupOptions(){const selected=$('inventoryGroup').value;$('inventoryGroup').replaceChildren(new Option('Tüm kategoriler',''),new Option('Kategorisiz','none'),...groups.map(g=>new Option(g.name+' · '+(g.kind==='phone'?'Telefon':'Aksesuar'),g.id)));$('inventoryGroup').value=selected;}
 for(const id of ['inventoryKind','inventoryGroup','inventoryOnlyStock'])$(id).onchange=render;$('inventorySearch').oninput=render;
 $('groupForm').onsubmit=async e=>{
  e.preventDefault();const form=e.currentTarget,button=form.querySelector('button'),name=form.elements.groupName.value.trim(),kind=form.elements.groupKind.value;if(!name)return;button.disabled=true;
  try{const {error}=await db.from('product_groups').insert({name,kind});if(error)throw error;form.reset();message('Kategori oluşturuldu. Aşağıdaki ürünlerden bu kategoriye atama yapabilirsiniz.');await loadProducts();}
  catch(error){message(error.code==='23505'?'Bu türde aynı isimli kategori zaten var.':'Kategori oluşturulamadı. Veritabanı güncellemesini ve oturumunuzu kontrol edin.',true);}finally{button.disabled=false;}
 };
 return {setData:(p,g)=>{products=p;groups=g;groupOptions();render();},clear:()=>{products=[];groups=[];groupOptions();render();}};
}
