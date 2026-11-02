const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=require('node:path').resolve(__dirname,'..')+'/';const ts=require(root+'node_modules/typescript');const cache={};let stored=null,etag=0;
class Precondition extends Error{}
const blob={BlobPreconditionFailedError:Precondition,get:async(_p,opts)=>{assert.equal(opts.useCache,false);if(!stored)return null;const text=stored;return {statusCode:200,stream:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(text));c.close()}}),blob:{etag:String(etag)}}},put:async(_p,value,opts)=>{if(stored&&opts.allowOverwrite===false)throw Error('exists');if(opts.ifMatch&&opts.ifMatch!==String(etag))throw new Precondition();stored=value;etag++;return {etag:String(etag)}}};
function load(relative){const full=require('path').resolve(root,relative);if(full.endsWith('.json'))return JSON.parse(fs.readFileSync(full,'utf8'));if(cache[full])return cache[full].exports;const module={exports:{}};cache[full]=module;const code=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText;vm.runInThisContext('(function(require,module,exports){'+code+'\n})')(name=>name==='@vercel/blob'?blob:name.startsWith('.')?load(require('path').relative(root,require('path').resolve(require('path').dirname(full),name.replace(/\.js$/,'.ts')))+(name.endsWith('.json')?'':name.endsWith('.js')?'':'.ts')):require(name),module,module.exports);return module.exports}
process.env.SHARED_ACCESS_SECRET='isolated-test-secret-'+crypto.randomUUID();
const {signAccess}=load('server/access.ts'),{changesBetween}=load('src/shared-protocol.ts'),handler=load('api/shared-state.ts').default;
async function request(method,{token,cookie,body}={}){const headers={};let output;const res={setHeader:(k,v)=>headers[k]=v,statusCode:200,end:v=>{output=v}};await handler({method,url:'/api/shared-state'+(token?'?access='+token:''),headers:{host:'example.test',...(cookie?{cookie}:{})},body},res);return {status:res.statusCode,body:output?JSON.parse(output):undefined,headers,cookie:headers['Set-Cookie']?.split(';')[0]}}
const change=(a,b)=>({id:crypto.randomUUID(),changes:changesBetween(a,b)});

const fixture=require(root+'tests/test-finance.cjs');stored=JSON.stringify({schema:1,revision:1,updatedAt:new Date().toISOString(),data:fixture.fixture(),applied:[]});etag=1;



const {campaignCloseChecks,campaignLifecycleIssue,incompleteCampaignReceipts}=load('src/campaign-lifecycle.ts');
let count=0;
function clean(){
 const s=fixture.fixture();s.campaigns[0]={...s.campaigns[0],nombre:'QA campaña',estado:'En Proceso'};
 const contract=s.requirements[0].contratos[0];contract.kilos=500;contract.entregas[0].kilos=500;contract.entregas[0].fecha='2026-10-20';
 s.qualityOperations[0].route='Industria';s.qualityOperations[0].status='Despachada';
 const d=s.logisticsDeliveries[0];d.physicalClosed=true;d.administrativeClosed=true;d.unloading={start:'2026-10-20T09:00',end:'2026-10-20T10:00'};d.documents.signedExitGuide='salida.pdf';
 s.invoices=[{...fixture.sale,number:'F001-QA',document:'factura.pdf'}];
 s.settlements=[{...fixture.buy}, {...fixture.buy,id:'buy2',providerId:'p2',kilos:300,price:2.1}, {...fixture.buy,id:'transport',providerId:undefined,transportLinkId:'link',transportServiceId:'truck',kilos:1,price:100}];
 s.campaignTransporters[0].services[0].driverId='driver-qa';s.campaignTransporters[0].services[0].driverDispatch=[{stage:'Cierre',date:'2026-10-24T12:00:00Z',driverId:'driver-qa'}];s.campaignTransporters[0].services[0].freight=100;s.campaignTransporters[0].paymentAgreement={total:100,currency:'PEN',type:'Completo',advance:0,due:'2026-10-21',receipt:'acuerdo.pdf'};
 s.financialMovements=[{id:'collected',kind:'Cobro',documentId:s.invoices[0].id,amount:1392,date:'2026-10-21',reference:'QA-COBRO',evidence:'qa.pdf'},...s.settlements.map((x,i)=>({id:'paid'+i,kind:'Pago',documentId:x.id,amount:x.kilos*x.price,date:'2026-10-21',reference:'QA-PAGO'+i,evidence:'qa.pdf'}))];
 return JSON.parse(JSON.stringify(s));
}
const close=s=>{const next=structuredClone(s);next.campaigns[0].estado='Finalizado';next.campaigns[0].cierre={at:'2026-10-24T20:00:00Z',motivo:'Campaña concluida y conciliada.'};return next};
const reset=s=>{stored=JSON.stringify({schema:1,revision:1,updatedAt:new Date().toISOString(),data:s,applied:[]});etag=1};
async function trial(name,setup,mutate,status){const before=clean();if(setup)setup(before);reset(before);const next=mutate?mutate(structuredClone(before)):close(before);const result=await request('PATCH',{body:change(before,next)});assert.equal(result.status,status,name+': '+JSON.stringify(result.body.error));if(status!==200)assert.deepEqual((await request('GET')).body.data,before);count++;console.log('PASS '+name);return result;}
(async()=>{
const ready=clean();assert.deepEqual(campaignCloseChecks(ready,'camp').filter(x=>x.pending),[]);count++;
await trial('close fully reconciled campaign',null,null,200);
await trial('reject closure with driver still at arrival',s=>{s.campaignTransporters[0].services[0].driverDispatch=[{stage:'Llegada',date:'2026-10-24T12:00:00Z',driverId:'driver-qa'}]},null,409);
await trial('reject closure without driver dispatch history',s=>{delete s.campaignTransporters[0].services[0].driverDispatch},null,409);
await trial('reject closure with unpaid invoice',s=>s.financialMovements=s.financialMovements.filter(m=>m.kind!=='Cobro'),null,409);
await trial('reject closure with unbilled preparation',s=>{s.invoices[0].billingStatus='Pendiente'},null,409);
await trial('reject closure with missing reception report',s=>{s.logisticsDeliveries[0].evaluation.report=''},null,409);
await trial('reject closure with open administration',s=>{s.logisticsDeliveries[0].administrativeClosed=false},null,409);
await trial('reject closure with incomplete unload',s=>{s.logisticsDeliveries[0].unloading.end=''},null,409);
await trial('reject closure with unfulfilled contract',s=>{s.requirements[0].contratos[0].kilos=1000},null,409);
await trial('reject closure with another pending trip',s=>{s.requirements[0].contratos[0].entregas.push({id:'pending',fecha:'2026-10-25',kilos:10});s.requirements[0].contratos[0].kilos=510},null,409);
await trial('reject closure without provider liquidation',s=>s.settlements=s.settlements.filter(d=>d.id!=='buy2'),null,409);
await trial('reject closure with unpaid certification',s=>s.certifications=[{id:'cert',campaignId:'camp',costo:100,pagos:[]}],null,409);
await trial('reject closure without transport liquidation',s=>s.settlements=s.settlements.filter(d=>d.id!=='transport'),null,409);
await trial('reject closure with unliquidated transport agreement',s=>s.campaignTransporters[0].paymentAgreement.total=200,null,409);
await trial('reject closure with missing reason',null,s=>{const next=close(s);delete next.campaigns[0].cierre;return next},409);
await trial('reject closure of planned campaign',s=>s.campaigns[0].estado='Planificado',null,409);
await trial('reject finishing and removing obligations together',s=>{s.requirements[0].contratos[0].entregas.push({id:'pending',kilos:10})},s=>{s.requirements[0].contratos[0].entregas.pop();return close(s)},409);
await trial('reject modifying closed reception',s=>Object.assign(s,close(s)),s=>{s.logisticsDeliveries[0].arrivalObservations='Changed after closure';return s},409);
await trial('reject adding trip to closed campaign',s=>Object.assign(s,close(s)),s=>{s.requirements[0].contratos[0].entregas.push({id:'extra',kilos:1,fecha:'2026-10-25'});return s},409);
await trial('reject reopening campaign',s=>Object.assign(s,close(s)),s=>{s.campaigns[0].estado='En Proceso';return s},409);
await trial('reject adding another payment to closed campaign',s=>Object.assign(s,close(s)),s=>{s.financialMovements.push({id:'new',kind:'Cobro',documentId:s.invoices[0].id,amount:1});return s},409);
const historic=close(clean());delete historic.campaigns[0].cierre;reset(historic);const raw=stored;assert.equal((await request('GET')).status,200);assert.equal(stored,raw);assert.equal(campaignLifecycleIssue(historic,historic),'');count++;
const missing=clean();missing.logisticsDeliveries[0].evaluation.plantWeight=0;const copy=JSON.stringify(missing);assert.equal(incompleteCampaignReceipts(missing,'camp').length,1);assert.equal(JSON.stringify(missing),copy);count++;
// An unrelated active campaign may still be changed while a historical closed one stays intact.
await trial('allow unrelated campaign while closed history is unchanged',s=>{Object.assign(s,close(s));s.campaigns.push({id:'other',estado:'En Proceso',nombre:'Otra',fecha:'2026-10-01',fechaFin:'2026-12-01',fruta:'Mango',reqComercial:100})},s=>{s.campaigns[1].nombre='Otra campaña';return s},200);
console.log(JSON.stringify({result:'PASS',cases:count,scope:'Cierres y estados históricos con API aislada; sin modificar producción'}));
})().catch(e=>{console.error(e);process.exitCode=1});

