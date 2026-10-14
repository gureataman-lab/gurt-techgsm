export function createAccessoryEditor({db,validateProduct,loadProducts,message}){
 const $=id=>document.getElementById(id),dialog=$('accessoryEditor'),form=$('accessoryForm');let editing=null,saving=false;
 const field=name=>form.elements.namedItem(name);
 const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.textContent='Aksesuarı sil';form.querySelector('.dialog-footer').prepend(remove);
 function open(product=null){if(saving)return;editing=product;form.reset();remove.hidden=!product;$('accessoryError').textContent='';$('accessoryTitle').textContent=product?'Aksesuarı düzenle':'Yeni aksesuar';for(const name of ['title','description','price','condition'])if(product)field(name).value=product[name]||'';dialog.showModal();}
 remove.onclick=async()=>{if(saving||!editing||!confirm('“'+editing.title+'” silinsin mi?'))return;saving=true;remove.disabled=true;$('accessoryFields').disabled=true;$('saveAccessory').disabled=true;$('closeAccessory').disabled=true;try{const {data,error}=await db.from('products').delete().eq('id',editing.id).eq('version',editing.version).select('id');if(error||!data?.length)throw Error();dialog.close();message('Aksesuar silindi.');await loadProducts();}catch{$('accessoryError').textContent='Silinemedi. Listeyi yenileyip tekrar deneyin.';}finally{saving=false;remove.disabled=false;$('accessoryFields').disabled=false;$('saveAccessory').disabled=false;$('closeAccessory').disabled=false;}};
 $('newAccessory').onclick=()=>open();$('closeAccessory').onclick=()=>{if(!saving)dialog.close();};dialog.addEventListener('cancel',e=>{if(saving)e.preventDefault();});
 form.onsubmit=async e=>{
  e.preventDefault();if(saving)return;let value;
  try{if(!['Sıfır','İkinci el'].includes(field('condition').value))throw Error('Ürün durumunu seçin.');value=validateProduct({title:field('title').value,description:field('description').value,price:Number(field('price').value),condition:field('condition').value,brand:'Aksesuar',category:'aksesuar',stock:editing?.stock??1,published:editing?.published??false,image_path:editing?.image_path});value.device_details=null;}
  catch(error){$('accessoryError').textContent=error.message;return;}
  saving=true;$('accessoryFields').disabled=true;$('saveAccessory').disabled=true;$('closeAccessory').disabled=true;
  try{const request=editing?db.from('products').update(value).eq('id',editing.id).eq('version',editing.version):db.from('products').insert(value);const {data,error}=await request.select('id');if(error)throw error;if(!data?.length)throw Error('CONFLICT');dialog.close();message(editing?'Aksesuar güncellendi.':'Aksesuar 1 adet stokla taslak olarak eklendi. Stok & Kategoriler bölümünden kategorisini ve yayın durumunu seçin.');await loadProducts();}
  catch(error){$('accessoryError').textContent=error.message==='CONFLICT'?'Ürün başka bir yönetici tarafından değiştirildi. Listeyi yenileyip tekrar açın.':'Aksesuar kaydedilemedi. Bağlantıyı ve oturumunuzu kontrol edin.';}
  finally{saving=false;$('accessoryFields').disabled=false;$('saveAccessory').disabled=false;$('closeAccessory').disabled=false;}
 };
 return {open};
}
