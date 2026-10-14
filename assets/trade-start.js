Promise.all([import('./trade-form.js'),import('./catalog-client.js').catch(()=>({db:null}))]).then(([form,client])=>form.initTradeForm({db:client.db})).catch(()=>{
 document.getElementById('tradeError').textContent='Form yüklenemedi. Sayfayı yenileyin veya WhatsApp Destek bağlantısını kullanın.';
});
