import {element as el} from './product-card.js';
import {openProductDetail} from './product-detail.js';
import {isOffer} from './catalog-tools.js';
const root=document.getElementById('showcaseStage'), reduced=matchMedia('(prefers-reduced-motion: reduce)');
let list=[],index=0,signature='',paused=reduced.matches,hover=false;
let services;
const brandSlugs={apple:'apple',iphone:'apple',samsung:'samsung',xiaomi:'xiaomi',redmi:'xiaomi',poco:'poco',huawei:'huawei',honor:'honor',oppo:'oppo',vivo:'vivo',realme:'realme',oneplus:'oneplus',google:'google',motorola:'motorola',nokia:'nokia',sony:'sony',asus:'asus',zte:'zte',nothing:'nothing',lenovo:'lenovo',lg:'lg'};
function img(src,alt,cls){const i=el('img',cls);i.src=src;i.alt=alt;return i;}
function sync(){
 const stop=paused||hover||document.hidden||root.contains(document.activeElement);
 root.classList.toggle('is-paused',stop);document.getElementById('showcasePause').textContent=paused?'Oynat':'Duraklat';
}
function draw(){
 root.replaceChildren();if(!list.length){root.append(el('p','catalog-message','Bu seçimde stokta olan ürün bulunmuyor.'));document.getElementById('showcaseCount').textContent='0 / 0';document.getElementById('showcasePrev').disabled=document.getElementById('showcaseNext').disabled=true;sync();return;}
 const p=list[index],slide=el('article','showcase-slide'),text=el('div','showcase-copy');
 text.append(el('p','showcase-kicker',isOffer(p)?'★ HAFTANIN FIRSATI':'CEP PLAZA SEÇKİSİ'),el('p','showcase-brand',p.brand||'Aksesuar'),el('h2','showcase-title',p.title));
 const d=p.device_details;const summary=d?.model?[d.ram&&d.ram+' GB RAM',d.storage&&(d.storage==='1024'?'1 TB':d.storage+' GB'),d.color,d.state].filter(Boolean).join(' · '):p.description;
 text.append(el('p','showcase-summary',summary||'Ürünün detaylarını keşfedin.'),el('p','showcase-price',services.money(p.price)));
 const details=el('button','showcase-cta','Cihazı incele ↗');details.type='button';details.onclick=()=>openProductDetail(p,services);text.append(details);
 const visual=el('button','showcase-visual');visual.type='button';visual.setAttribute('aria-label',p.title+' fotoğrafı ve detayları');visual.onclick=details.onclick;
 const rotor=el('div','showcase-rotor');rotor.setAttribute('aria-hidden','true');
 rotor.addEventListener('animationiteration',e=>{if(e.target===rotor){index=(index+1)%list.length;draw();}});
 const photo=el('div','showcase-face showcase-product');if(p.image_path){const i=img(services.imageUrl(p.image_path),'','');i.onerror=()=>{i.remove();photo.append(el('span','showcase-no-photo','Fotoğraf eklenmemiş'));};photo.append(i);}else photo.append(el('span','showcase-no-photo','Fotoğraf eklenmemiş'));
 const cp=el('div','showcase-face showcase-plaza');cp.append(img('assets/cep-plaza-mark.svg','',''),el('strong','','CEP PLAZA'),el('span','','TEKNOLOJİNİN BULUŞMA NOKTASI'));
 const brand=el('div','showcase-face showcase-maker');const key=(p.brand||'').trim().toLowerCase(),slug=brandSlugs[key]||(key.includes('xiaomi')||key.includes('redmi')?'xiaomi':null);
 if(slug){const logo=img('https://cdn.jsdelivr.net/npm/simple-icons@v16/icons/'+slug+'.svg','','maker-logo');logo.onerror=()=>logo.remove();brand.append(logo);}brand.append(el('strong','',p.brand||'Aksesuar'));
 rotor.append(photo,cp,brand);visual.append(rotor);slide.append(text,visual);root.append(slide);
 document.getElementById('showcaseCount').textContent=(index+1)+' / '+list.length;
 document.getElementById('showcasePrev').disabled=document.getElementById('showcaseNext').disabled=list.length<2;sync();
}
export function renderShowcase(products,options){
 if(!root)return;services=options;const next=products.filter(p=>p.stock>0);const sig=JSON.stringify(next);
 if(sig===signature)return;signature=sig;list=next;index=0;draw();
}
if(root){
 document.getElementById('showcasePrev').onclick=()=>{if(list.length){index=(index-1+list.length)%list.length;draw();}};
 document.getElementById('showcaseNext').onclick=()=>{if(list.length){index=(index+1)%list.length;draw();}};
 document.getElementById('showcasePause').onclick=()=>{paused=!paused;sync();};
 root.addEventListener('mouseenter',()=>{hover=true;sync();});root.addEventListener('mouseleave',()=>{hover=false;sync();});
 root.addEventListener('focusin',sync);root.addEventListener('focusout',()=>setTimeout(sync,0));document.addEventListener('visibilitychange',sync);
 reduced.addEventListener('change',()=>{paused=reduced.matches;sync();});
}
