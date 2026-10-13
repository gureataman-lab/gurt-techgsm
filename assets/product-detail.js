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
function gallery(product,kind,imageUrl){
 const box=el('section','','pd-gallery'),paths=galleryPaths(product,kind);
 if(!paths.length){box.append(el('p',kind==='photos'?'Genel fotoğraf eklenmemiş.':'Kusur fotoğrafı eklenmemiş.','pd-muted'));return box;}
 const img=el('img');img.className='pd-large';const thumbnails=el('div','','pd-thumbnails');
 function choose(i){img.src=imageUrl(paths[i]);img.alt=product.title+' · '+(kind==='photos'?'Genel fotoğraf ':'Kusur fotoğrafı ')+(i+1);[...thumbnails.children].forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));}
 paths.forEach((path,i)=>{const button=el('button'),small=el('img');button.type='button';button.setAttribute('aria-label',(i+1)+'. fotoğrafı göster');small.src=imageUrl(path);small.alt='';small.loading='lazy';button.append(small);button.onclick=()=>choose(i);thumbnails.append(button);});
 choose(0);box.append(img,thumbnails);return box;
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
