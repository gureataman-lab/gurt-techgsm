import {openProductDetail} from './product-detail.js';
import {kindOf} from './catalog-tools.js';
export const element=(tag,cls='',text)=>{const e=document.createElement(tag);e.className=cls;if(text!==undefined)e.textContent=text;return e;};
export function productCard(p,{imageUrl,money}){
 const accessory=kindOf(p)==='accessory',d=p.device_details,used=d?.state==='İkinci el'||p.condition==='İkinci el'||p.category==='ikinciel';
 const card=element('article','glass-card rounded-2xl p-4 flex flex-col justify-between');
 const top=element('button','pd-open');top.type='button';top.setAttribute('aria-haspopup','dialog');top.setAttribute('aria-label',p.title+' detaylarını aç');top.onclick=()=>openProductDetail(p,{imageUrl,money});
 const visual=element('div','relative bg-gray-900 rounded-xl p-6 text-center mb-4 border border-gray-800');
 if(p.image_path){const img=element('img','w-full h-32 object-contain mx-auto');img.src=imageUrl(p.image_path);img.alt=p.title;img.loading='lazy';visual.append(img);}
 else visual.append(element('i',accessory?'fa-solid fa-headphones text-6xl text-gray-400':'fa-solid fa-mobile-screen-button text-6xl text-gray-400'));
 const meta=element('div','flex items-center justify-between text-xs text-gray-400 mb-1');meta.append(element('span','',accessory?(p.condition||'Aksesuar'):p.brand),element('span',p.stock>0?'text-emerald-400':'text-gray-400',p.stock>0?'Stokta Var':'Tükendi'));
 const summary=!accessory&&d?`${d.ram} GB RAM · ${d.storage==='1024'?'1 TB':d.storage+' GB'} · ${d.state}${d.state==='İkinci el'?' · Kasa '+d.cosmetic+'/10':''}`:p.description;
 top.append(visual,meta,element('h3','font-bold text-white text-base mb-1',p.title),element('p','text-xs text-gray-400 line-clamp-2',summary));
 const bottom=element('div','mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between gap-2');bottom.append(element('span',`text-lg font-black ${used?'text-amber-400':'text-brand-400'}`,money(p.price)));
 const buy=element('button','bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-3.5 py-2 rounded-lg',p.stock>0?'Sepete Ekle':'Tükendi');buy.type='button';buy.disabled=p.stock<=0;buy.onclick=()=>window.addToCart(p.title,Number(p.price),buy);bottom.append(buy);card.append(top,bottom);return card;
}
