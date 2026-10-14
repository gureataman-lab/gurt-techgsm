import {RAM,STORAGE,DAYS,COSMETIC,COLORS} from './device-fields.js';
import {buildTradeMessage,tradeUrl} from './trade-message.js';
export function initTradeForm({db,open=url=>window.open(url,'_blank','noopener,noreferrer')}){
 const form=document.getElementById('tradeInForm');if(!form)return;
 const field=name=>form.elements.namedItem(name),$=id=>document.getElementById(id);
 let products=[],brands=[];
 const fill=(name,values,label=x=>x)=>field(name).replaceChildren(new Option('Seçin',''),...values.map(v=>new Option(label(v),v)));
 fill('ram',RAM,v=>v+' GB');fill('storage',STORAGE,v=>v==='1024'?'1 TB':v+' GB');fill('line1',DAYS,v=>v+' gün');fill('line2',DAYS,v=>v+' gün');fill('cosmetic',COSMETIC,v=>v+'/10');fill('color',COLORS);field('color').add(new Option('Diğer / Özel renk','other'));
 function conditions(){
  const unregistered=field('registration').value==='Kayıtsız',registered=field('registration').value==='Kayıtlı',used=field('state').value==='İkinci el',battery=field('battery_percent').value!=='';
  $('tradeLines').hidden=!unregistered;field('line1').required=field('line2').required=unregistered;
  $('tradeMethod').hidden=!registered;field('method').required=registered;
  $('tradeCosmetic').hidden=!used;field('cosmetic').required=used;
  $('tradeCycles').hidden=!battery;field('battery_cycles').required=battery;if(!battery)field('battery_cycles').value='';
  for(const name of ['brand','model','color']){const custom=field(name).value==='other';$('tradeCustom_'+name).hidden=!custom;field('custom_'+name).required=custom;}
 }
 function models(){
  const current=field('model').value;
  const names=[...new Set(products.filter(p=>p.brand.toLocaleLowerCase('tr')===field('brand').value.toLocaleLowerCase('tr')).map(p=>p.device_details?.model).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));
  fill('model',names);field('model').add(new Option('Modelimi yazacağım','other'));field('model').value=names.includes(current)?current:'other';conditions();
 }
 field('brand').onchange=()=>{field('model').value='';field('custom_model').value='';models();};
 for(const name of ['registration','state','model','color'])field(name).onchange=conditions;
 field('battery_percent').oninput=conditions;
 form.addEventListener('input',()=>{$('tradeFallback').hidden=true;$('tradeError').textContent='';});
 fill('brand',[]);field('brand').add(new Option('Markayı kendim yazacağım','other'));models();conditions();
 form.onsubmit=e=>{
  e.preventDefault();if(!form.reportValidity())return;
  try{const value=Object.fromEntries(new FormData(form));for(const name of ['brand','model','color'])if(value[name]==='other')value[name]=value['custom_'+name].trim();const msg=buildTradeMessage(value);$('tradeError').textContent='';const url=tradeUrl(msg);$('tradeFallback').href=url;$('tradeFallback').hidden=false;open(url);}
  catch(error){$('tradeError').textContent=error.message;}
 };
 $('tradeSend').disabled=false;
 async function load(){
  try{const r=await fetch(new URL('./phone-brands.json',import.meta.url));if(!r.ok)throw Error();brands=(await r.json()).brands.map(b=>b.name);const selected=field('brand').value;fill('brand',brands);field('brand').add(new Option('Diğer marka','other'));field('brand').value=selected;}
  catch{$('tradeModelHelp').textContent='Marka/model listesini alamadık. Marka ve model adını kendiniz yazarak devam edebilirsiniz.';}
  if(db)try{const {data,error}=await db.from('products').select('brand,device_details').eq('published',true).abortSignal(AbortSignal.timeout(10000));if(error)throw error;products=data||[];}catch{/* Manual model entry remains available. */}
  // Do not overwrite a model the customer has already entered while data was loading.
  const manual=field('custom_model').value;models();field('custom_model').value=manual;conditions();
 }
 load();
}
