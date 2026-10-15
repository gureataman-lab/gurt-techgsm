// Public model names only; no account, stock or authentication data is stored here.
export function createModelCache(storage) {
 const prefix='cepplaza:models:v1:', memory=new Map();
 function valid(value) {
   return value && Array.isArray(value.models) && value.models.length<=10000 &&
     value.models.every(m=>m && typeof m.name==='string' && m.name.length<=300 && typeof m.path==='string' && /^[a-z0-9_-]+\.php$/i.test(m.path)) &&
     (value.next===null || (typeof value.next==='string' && value.next.length<=300 && !/[:\\/]/.test(value.next)));
 }
 return {
   read(brand) {
     try {const value=JSON.parse(storage?.getItem(prefix+brand)||'null');if(valid(value)){memory.set(brand,value);return value;}}catch{}
     return memory.get(brand)||null;
   },
   write(brand,models,next) {
     const value={models:[...new Map(models.map(m=>[m.path,{name:m.name,path:m.path}])).values()],next:next||null};
     if(!valid(value))return false;
     memory.set(brand,value);
     try {storage.setItem(prefix+brand,JSON.stringify(value));return true;}catch{return false;}
   }
 };
}
