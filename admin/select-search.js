// Keep the native select for keyboard, touch and Android accessibility.
export function searchText(value) {
 return String(value).toLocaleLowerCase('tr-TR').replace(/ı/g,'i').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
}
export function matchingOptions(options, query) {
 const words=searchText(query).split(/\s+/).filter(Boolean);
 return options.filter(o=>o.value && words.every(word=>searchText(o.text).includes(word)));
}
export function addSelectSearch(select, {label,placeholder,hint=''}) {
 const wrapper=document.createElement('div'), caption=document.createElement('label'), input=document.createElement('input'), status=document.createElement('small');
 input.type='search';input.id=select.name+'Search';input.placeholder=placeholder;input.autocomplete='off';
 caption.htmlFor=input.id;caption.textContent=label;caption.append(input);
 status.id=input.id+'Status';status.className='small muted';status.setAttribute('role','status');
 input.setAttribute('aria-describedby',status.id);caption.style.marginBottom='4px';wrapper.style.marginBottom='12px';
 wrapper.append(caption,status);select.closest('label').before(wrapper);
 let options=[];
 function render() {
   const selected=select.value, matches=matchingOptions(options,input.value);
   const pinned=options.find(o=>o.value===selected && selected && !matches.includes(o));
   const empty=options.find(o=>!o.value)||{value:'',text:'Seçin'};
   select.replaceChildren(...[empty,...(pinned?[pinned]:[]),...matches].map(o=>new Option(o.text,o.value)));
   select.value=selected;
   status.textContent=input.value.trim()?`${matches.length} sonuç.${pinned?' Seçili değer korundu.':''}${matches.length?' Listeden seçin.':''}${hint?' '+hint:''}`:hint;
 }
 function refresh() {options=[...select.options].map(o=>({value:o.value,text:o.text}));input.disabled=select.disabled;render();}
 function reset() {input.value='';select.replaceChildren(...options.map(o=>new Option(o.text,o.value)));status.textContent=hint;}
 input.addEventListener('input',render);
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();select.focus();}});
 select.addEventListener('change',render);
 refresh();return {refresh,reset};
}
