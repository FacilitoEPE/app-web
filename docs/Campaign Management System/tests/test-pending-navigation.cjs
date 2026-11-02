const assert=require('node:assert/strict');const {fixture,load}=require('./test-finance.cjs');const {purchaseSources,saleSources}=load('finance-flow'),{pendingNavigation,pendingModule}=load('finance-navigation');
let s=fixture();delete s.campaignProviders[0].precio;s.logisticsDeliveries[0].evaluation={originWeight:500,plantWeight:0,report:'',result:''};
let x=purchaseSources(s)[0],target=pendingNavigation(x,'Pago');assert.equal(target.task,'purchase-price');assert.equal(pendingModule(target),'campanas');assert.equal(target.source.providerId,'p1');assert.equal(target.source.transportServiceId,'truck');
s.campaignProviders[0].precio=1.8;x=purchaseSources(s)[0];assert.deepEqual(x.reasons,[]);assert.equal(x.loaded,200);assert.equal(x.loaded*x.price,360);
// Purchases are independent of reception, report, recognized distribution and discard.
s.logisticsDeliveries[0].purchases=[];s.logisticsDeliveries[0].discard={quantity:100,unit:'kg'};assert.ok(purchaseSources(s).every(x=>!x.reasons.length));
s.logisticsDeliveries=[];assert.ok(purchaseSources(s).every(x=>!x.reasons.length));assert.equal(s.settlements.length,0);assert.equal(s.financialMovements.length,0);
s=fixture();const sale=saleSources(s)[0];assert.equal(pendingModule(pendingNavigation({...sale,reasons:['Pendiente de precio de venta']},'Cobro')),'comercial');assert.equal(pendingModule(pendingNavigation({...sale,reasons:['Pendiente de guía']},'Cobro')),'calidad');assert.equal(pendingNavigation({...sale,reasons:['Revisar liquidación anterior sin desglose']},'Cobro').task,'legacy');
s.logisticsDeliveries[0].sourceDelivery=undefined;s.campaignTransporters[0].services[0].sourceDelivery=undefined;assert.equal(pendingNavigation(saleSources(s)[0],'Cobro').task,'link');
console.log('PASS: pendientes abren campaña/proveedor, contrato, recepción, desglose, guía o vínculo exactos; compra se habilita con precio y kilos de carga, sin exigir recepción ni desglose en planta.');
