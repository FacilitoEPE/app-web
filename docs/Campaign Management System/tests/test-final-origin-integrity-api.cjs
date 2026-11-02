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



const {businessIntegrityIssue}=load('src/business-integrity.ts');let count=0;
const billed=s=>{s.invoices=[{...fixture.sale,number:'F001-QA',document:'qa.pdf'}];s.financialMovements=[{id:'fm',kind:'Cobro',documentId:fixture.sale.id,date:'2026-10-24',amount:100,reference:'QA',evidence:'qa.pdf'}]};
const purchased=s=>{s.settlements=[fixture.buy];s.financialMovements=[{id:'fm',kind:'Pago',documentId:fixture.buy.id,date:'2026-10-24',amount:50,reference:'QA',evidence:'qa.pdf'}]};
const certified=s=>{s.certifications=[{id:'cert',campaignId:'camp',moneda:'PEN',costo:100,pagos:[{id:'p',monto:50,fecha:'2026-10-24',referencia:'QA'}],ampliaciones:[]}]};
async function trial(name,setup,mutate,expected=409){const before=fixture.fixture();if(setup)setup(before);stored=JSON.stringify({schema:1,revision:1,updatedAt:'2026-10-25T05:00:00Z',data:before,applied:[]});etag=1;const next=structuredClone(before);mutate(next);const result=await request('PATCH',{body:change(before,next)});assert.equal(result.status,expected,name+': '+JSON.stringify(result.body.error));if(expected!==200)assert.deepEqual((await request('GET')).body.data,JSON.parse(JSON.stringify(before)),name+' retains data');count++;console.log('PASS '+name)}
(async()=>{
await trial('R02 reject removal of billed scheduled trip',billed,s=>s.requirements[0].contratos[0].entregas=[]);
await trial('R02 reject removal of billed loaded service',billed,s=>s.campaignTransporters[0].services=[]);
await trial('R02 reject removal of billed transport link',billed,s=>s.campaignTransporters=[]);
await trial('R02 reject moving billed service to another link',billed,s=>{const service=s.campaignTransporters[0].services.pop();s.campaignTransporters.push({id:'other',campaignId:'camp',services:[service]})});
await trial('R02 reject replacing transporter of billed service',billed,s=>s.campaignTransporters[0].transporterId='other-carrier');
await trial('R02 reject moving billed link to another campaign',billed,s=>s.campaignTransporters[0].campaignId='other-campaign');
await trial('R02 reject replacing invoiced service ID',billed,s=>s.invoices[0].transportServiceId='other');
await trial('R02 reject changing receipt service identity',billed,s=>s.logisticsDeliveries[0].transportServiceId='other');
await trial('R02 reject changing origin weight after invoice',billed,s=>s.logisticsDeliveries[0].evaluation.originWeight=9999);
await trial('R02 reject reopening financially used receipt',s=>{billed(s);s.logisticsDeliveries[0].physicalClosed=true;s.logisticsDeliveries[0].administrativeClosed=true},s=>{s.logisticsDeliveries[0].physicalClosed=false;s.logisticsDeliveries[0].administrativeClosed=false});
await trial('R02 reject changing delivered trip kilos',billed,s=>s.requirements[0].contratos[0].entregas[0].kilos=10);
await trial('R02 reject removal of purchase-settled trip',purchased,s=>s.requirements[0].contratos[0].entregas=[]);
await trial('R02 reject removal of purchase-settled service',purchased,s=>s.campaignTransporters[0].services=[]);
await trial('R02 reject changing purchase source operation',purchased,s=>s.settlements[0].operationId='other');
await trial('R02 reject origin weight change after purchase settlement',purchased,s=>s.logisticsDeliveries[0].evaluation.originWeight=9999);
await trial('R02 reject deleting carrier with billed service',s=>{billed(s);s.campaignTransporters[0].transporterId='carrier';s.transporters=[{id:'carrier',vehiculos:[],choferes:[]}]},s=>s.transporters=[]);
await trial('R02 reject deleting referenced vehicle',s=>{billed(s);s.campaignTransporters[0].transporterId='carrier';s.campaignTransporters[0].services[0].vehicleId='v';s.transporters=[{id:'carrier',vehiculos:[{id:'v',placa:'QA-001'}],choferes:[]}]},s=>s.transporters[0].vehiculos=[]);
await trial('R02 reject deleting referenced driver',s=>{billed(s);s.campaignTransporters[0].transporterId='carrier';s.campaignTransporters[0].services[0].driverId='driver';s.transporters=[{id:'carrier',vehiculos:[],choferes:[{id:'driver',nombre:'QA'}]}]},s=>s.transporters[0].choferes=[]);
await trial('R03 reject deleting entire certification with payments',certified,s=>s.certifications=[]);
await trial('R03 reject deleting payment and certification together',certified,s=>{s.certifications[0].pagos=[];s.certifications=[]});
await trial('R03 reject changing certification currency',certified,s=>s.certifications[0].moneda='USD');
await trial('R03 reject moving paid certification to another campaign',certified,s=>s.certifications[0].campaignId='other');
await trial('R03 reject deleting parent campaign of paid certification',certified,s=>s.campaigns=[]);
await trial('R03 allow legitimate next partial payment',certified,s=>s.certifications[0].pagos.push({id:'p2',monto:25,fecha:'2026-10-25',referencia:'QA2'}),200);
await trial('R02 allow notes without changing financial source',billed,s=>s.logisticsDeliveries[0].arrivalObservations='Nota de consulta',200);
await trial('R02 preserve filename-only support when attaching original',billed,s=>s.logisticsDeliveries[0].evaluation.report='/api/prototype-document?id=00000000-0000-4000-8000-000000000001&name=receipt.pdf',200);
await trial('R02 allow missing origin weight to match registered load',s=>{billed(s);s.logisticsDeliveries[0].evaluation.originWeight=0},s=>s.logisticsDeliveries[0].evaluation.originWeight=500,200);
await trial('R02 reject filling missing origin with unrelated weight',s=>{billed(s);s.logisticsDeliveries[0].evaluation.originWeight=0},s=>s.logisticsDeliveries[0].evaluation.originWeight=999);
await trial('R02 allow uncommitted trip removal',null,s=>{s.requirements[0].contratos[0].entregas=[]},200);
const historical=fixture.fixture();billed(historical);historical.campaignTransporters=[];historical.requirements[0].contratos[0].entregas=[];const original=JSON.stringify(historical);assert.equal(businessIntegrityIssue(historical,historical),'');assert.equal(JSON.stringify(historical),original);count++;
console.log(JSON.stringify({result:'PASS',cases:count,scope:'Regresiones R02/R03 con almacenamiento aislado; sin tocar producción'}));
})().catch(e=>{console.error(e);process.exitCode=1});
