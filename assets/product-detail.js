import { deviceRows, galleryPaths } from './device-fields.js';

const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./product-detail.css',import.meta.url);document.head.append(style);
const el=(tag,text,cls='')=>{const n=document.createElement(tag);n.textContent=text||'';n.className=cls;return n;};
let active=null,sequence=0;
function tabs(labels,panels,name) {
 const bar=el('div','','pd-tabs');bar.setAttribute('role','tablist');bar.setAttribute('aria-label',name);
 const prefix='pd-'+(++sequence);
 const buttons=labels.map((label,i)=>{
  const b=el('button',label);b.type='button';b.id=prefix+'-tab'+i;b.setAttribute('role','tab');b.setAttribute('aria-controls',prefix+'-panel'+i);
  panels[i].id=prefix+'-panel'+i;panels[i].setAttribute('role','tabpanel');panels[i].setAttribute('aria-labelledby',b.id);panels[i].tabIndex=0;
  b.onclick=()=>select(i);bar.append(b);return b;
 });
 function select(index){buttons.forEach((b,i)=>{b.setAttribute('aria-selected',String(index===i));b.tabIndex=index===i?0:-1;panels[i].hidden=index!==i;});}
 bar.onkeydown=e=>{const i=buttons.indexOf(document.activeElement);if(i<0)return;let n;if(e.key==='ArrowRight')n=(i+1)%buttons.length;else if(e.key==='ArrowLeft')n=(i+buttons.length-1)%buttons.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=buttons.length-1;else return;e.preventDefault();select(n);buttons[n].focus();};
 select(0);return bar;
}
function table(rows){const dl=el('dl','','pd-fields');for(const [label,value] of rows)dl.append(el('dt',label),el('dd',String(value??'Belirtilmedi')));return dl;}
function enlargePhoto(product,kind,paths,index,imageUrl,trigger,choose){
 const viewer=el('dialog','','pd-lightbox');viewer.setAttribute('aria-label',product.title+' · Büyük fotoğraf');
 const toolbar=el('div','','pd-lightbox-toolbar'),caption=el('p'),zoom=el('button','Yakınlaştır +'),close=el('button','Kapat ✕');
 const stage=el('div','','pd-lightbox-stage'),photo=el('img'),error=el('p','Fotoğraf yüklenemedi. Diğer fotoğrafa geçebilir veya pencereyi kapatabilirsiniz.','pd-photo-error');error.hidden=true;
 const navigation=el('div','','pd-lightbox-nav'),prev=el('button','← Önceki'),count=el('span'),next=el('button','Sonraki →');
 let magnified=false;
 for(const b of [zoom,close,prev,next])b.type='button';
 close.setAttribute('aria-label','Büyük fotoğrafı kapat');count.setAttribute('aria-live','polite');
 function resetZoom(){magnified=false;stage.classList.remove('is-zoomed');stage.scrollTop=stage.scrollLeft=0;zoom.textContent='Yakınlaştır +';zoom.setAttribute('aria-pressed','false');}
 function show(i){index=(i+paths.length)%paths.length;resetZoom();error.hidden=true;photo.hidden=false;zoom.disabled=false;photo.alt=product.title+' · '+(kind==='photos'?'Genel fotoğraf ':'Kusur fotoğrafı ')+(index+1);caption.textContent=photo.alt;count.textContent=(index+1)+' / '+paths.length;photo.src=imageUrl(paths[index]);choose(index);}
 photo.onerror=()=>{photo.hidden=true;error.hidden=false;zoom.disabled=true;};
 zoom.onclick=()=>{magnified=!magnified;stage.classList.toggle('is-zoomed',magnified);zoom.textContent=magnified?'Uzaklaştır −':'Yakınlaştır +';zoom.setAttribute('aria-pressed',String(magnified));};
 prev.onclick=()=>show(index-1);next.onclick=()=>show(index+1);prev.hidden=next.hidden=paths.length<2;
 close.onclick=()=>viewer.close();
 viewer.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();show(index+(e.key==='ArrowRight'?1:-1));}});
 viewer.addEventListener('close',()=>{viewer.remove();if(trigger.isConnected)trigger.focus();},{once:true});
 toolbar.append(caption,zoom,close);stage.append(photo,error);navigation.append(prev,count,next);viewer.append(toolbar,stage,navigation);
 trigger.closest('dialog').append(viewer);show(index);viewer.showModal();close.focus();
}
function gallery(product,kind,imageUrl){
 const box=el('section','','pd-gallery'),paths=galleryPaths(product,kind);
 if(!paths.length){box.append(el('p',kind==='photos'?'Genel fotoğraf eklenmemiş.':'Kusur fotoğrafı eklenmemiş.','pd-muted'));return box;}
 const img=el('img');img.className='pd-large';const thumbnails=el('div','','pd-thumbnails');
 const expand=el('button','','pd-expand');expand.type='button';expand.setAttribute('aria-label',kind==='photos'?'Genel fotoğrafı büyüt':'Kusur fotoğrafını büyüt');expand.setAttribute('aria-haspopup','dialog');let selected=0;
 expand.append(img,el('span','Büyüt ⤢','pd-expand-hint'));expand.onclick=()=>enlargePhoto(product,kind,paths,selected,imageUrl,expand,choose);
 function choose(i){selected=i;img.src=imageUrl(paths[i]);img.alt=product.title+' · '+(kind==='photos'?'Genel fotoğraf ':'Kusur fotoğrafı ')+(i+1);[...thumbnails.children].forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));}
 paths.forEach((path,i)=>{const button=el('button'),small=el('img');button.type='button';button.setAttribute('aria-label',(i+1)+'. fotoğrafı göster');small.src=imageUrl(path);small.alt='';small.loading='lazy';button.append(small);button.onclick=()=>choose(i);thumbnails.append(button);});
 choose(0);box.append(expand,thumbnails);return box;
}
export function openProductDetail(product,{imageUrl,money}){
 if(active){active.close();active.remove();}
 const returnFocus=document.activeElement;
 const dialog=el('dialog','','product-detail');active=dialog;dialog.setAttribute('aria-labelledby','pd-title');
 const heading=el('div','','pd-heading'),title=el('h2',product.title);title.id='pd-title';const close=el('button','✕');close.type='button';close.setAttribute('aria-label','Ürün detayını kapat');close.onclick=()=>dialog.close();heading.append(title,close);
 const info=el('section'),technical=el('section'),general=gallery(product,'photos',imageUrl),defects=gallery(product,'defects',imageUrl);
 info.append(tabs(['Genel Fotoğraflar','Kusur Fotoğrafları'],[general,defects],'Fotoğraf türü'),general,defects,table([...deviceRows(product),['Fiyat',money(product.price)]]));
 if(product.description)info.append(el('p',product.description,'pd-description'));
 const specs=product.device_details?.specs;
 if(specs?.groups?.length){
  technical.append(el('p','Modelin genel teknik özellikleridir; donanım seçenekleri ülkeye göre değişebilir. Bu cihazın RAM ve hafızası Cihaz Bilgileri sekmesindedir.','pd-muted'));
  for(const group of specs.groups){const section=el('section');section.append(el('h3',group.name),table(group.rows.map(r=>[r.label,r.value])));technical.append(section);}
  try{const url=new URL(specs.url);if(url.protocol==='https:'&&url.hostname==='www.gsmarena.com'){const link=el('a','Kaynak: GSMArena ↗');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';technical.append(link);}}catch{}
 }else technical.append(el('p','Bu ürün için teknik özellikler henüz eklenmemiş.','pd-muted'));
 dialog.append(heading,tabs(['Cihaz Bilgileri','Teknik Özellikler'],[info,technical],'Ürün detayları'),info,technical);
 dialog.addEventListener('close',()=>{dialog.remove();if(active===dialog)active=null;if(returnFocus?.isConnected)returnFocus.focus();},{once:true});
 document.body.append(dialog);dialog.showModal();
}
