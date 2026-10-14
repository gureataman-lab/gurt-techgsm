import {db,configured,imageUrl,money} from './catalog-client.js';
import {element,productCard} from './product-card.js';
import {kindOf,phoneFields,fieldValue,optionLabel,matchesPhone,isOffer,fold} from './catalog-tools.js';
const $=id=>document.getElementById(id),grid=$('productGrid'),form=$('phoneFilters');
let products=[],groups=[],loading=false,loaded=false,homeGroup='';
const card=p=>productCard(p,{imageUrl,money});
const message=(target,text)=>target.replaceChildren(element('p','catalog-message',text));
function renderCards(target,list,empty){target.replaceChildren(...list.map(card));if(!list.length)message(target,empty);}
function renderPhones(){
 const values=Object.fromEntries(new FormData(form));values.available=form.elements.available.checked;
 const list=products.filter(p=>matchesPhone(p,values));
 renderCards($('phoneGrid'),list,'Seçtiğiniz ölçütlere uygun telefon bulunamadı.');$('phoneCount').textContent=list.length+' telefon';
}
function updateOptions(){
 const phones=products.filter(p=>kindOf(p)==='phone');
 for(const [key]of phoneFields){
  const select=form.elements.namedItem(key),current=select.value;
  const source=key==='model'&&form.elements.brand.value?phones.filter(p=>p.brand===form.elements.brand.value):phones;
  const values=[...new Set(source.map(p=>String(fieldValue(p,key))).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr',{numeric:true}));
  select.replaceChildren(new Option('Tümü',''),...values.map(value=>new Option(optionLabel(key,value),value)));
  select.value=values.includes(current)?current:'';
 }
 const select=form.elements.collection,current=select.value;
 const available=groups.filter(g=>g.kind==='phone'&&phones.some(p=>p.collection_id===g.id));
 select.replaceChildren(new Option('Tüm kategoriler',''),...available.map(g=>new Option(g.name,g.id)));select.value=available.some(g=>g.id===current)?current:'';
}
function renderHome(){
 const query=$('searchInput')?.value||'';
 const list=products.filter(p=>(!homeGroup||p.collection_id===homeGroup)&&(!query||fold([p.title,p.brand,p.description,p.device_details?.model].join(' ')).includes(fold(query))));
 renderCards(grid,list,'Bu seçimde yayınlanan ürün bulunamadı.');
}
function renderAll(){
 const visibleGroups=groups.filter(g=>products.some(p=>p.collection_id===g.id));if(!visibleGroups.some(g=>g.id===homeGroup))homeGroup='';
 const groupBar=$('filterButtons');groupBar.replaceChildren();
 for(const g of [{id:'',name:'Tümü'},...visibleGroups]){const b=element('button','catalog-chip',g.name);b.type='button';b.setAttribute('aria-pressed',String(g.id===homeGroup));b.onclick=()=>{homeGroup=g.id;renderAll();};groupBar.append(b);}
 renderHome();updateOptions();renderPhones();
 const accessories=products.filter(p=>kindOf(p)==='accessory'),target=$('accessoryGroups');target.replaceChildren();
 for(const g of [...groups.filter(g=>g.kind==='accessory'),{id:null,name:'Diğer Aksesuarlar'}]){
  const list=accessories.filter(p=>(p.collection_id||null)===g.id);if(!list.length)continue;
  const section=element('section','accessory-group'),title=element('h3','catalog-group-title',g.name),cards=element('div','catalog-grid');renderCards(cards,list,'');section.append(title,cards);target.append(section);
 }
 if(!accessories.length)message(target,'Henüz yayında aksesuar bulunmuyor.');
 renderCards($('weeklyOffers'),products.filter(isOffer),'Şu anda haftanın fırsatı olarak seçilmiş ürün bulunmuyor.');
}
async function refresh(){
 if(loading)return;loading=true;
 try{
  const results=await Promise.all([db.from('products').select('*').eq('published',true).order('created_at',{ascending:false}).abortSignal(AbortSignal.timeout(15000)),db.from('product_groups').select('*').order('name').abortSignal(AbortSignal.timeout(15000))]);
  if(results.some(r=>r.error))throw Error();products=results[0].data;groups=results[1].data;loaded=true;$('catalogStatus').textContent='';renderAll();
 }catch{
  $('catalogStatus').textContent=loaded?'Ürünler yenilenemedi; son yüklenen liste gösteriliyor.':'Ürünler yüklenemedi. Lütfen biraz sonra tekrar deneyin.';
  if(!loaded)for(const id of ['productGrid','phoneGrid','accessoryGroups','weeklyOffers'])message($(id),'Ürünler şu anda yüklenemiyor.');
 }finally{loading=false;}
}
if(configured&&grid&&form){
 const fields=$('phoneSelectFields');
 for(const [key,title]of phoneFields){const label=element('label','',title),select=element('select');select.name=key;select.append(new Option('Tümü',''));label.append(select);fields.append(label);}
 form.addEventListener('submit',e=>e.preventDefault());
 form.addEventListener('input',e=>{if(e.target.name==='brand')updateOptions();renderPhones();});
 $('clearPhoneFilters').onclick=()=>{form.reset();updateOptions();renderPhones();};
 const search=$('searchInput');if(search){search.removeAttribute('onkeyup');search.removeAttribute('oninput');search.addEventListener('input',renderHome);search.addEventListener('keydown',e=>{if(e.key==='Enter'){$('vitrin').scrollIntoView({behavior:'smooth'});location.hash='vitrin';}});}
 refresh();setInterval(()=>{if(!document.hidden)refresh();},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}
