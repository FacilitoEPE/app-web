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


let count=0;
const reset=data=>{stored=JSON.stringify({schema:1,revision:1,updatedAt:new Date().toISOString(),data,applied:[]});etag=1};
async function trial(name,setup,mutate,expected){const before=fixture.fixture();if(setup)setup(before);reset(before);const next=structuredClone(before);mutate(next);const result=await request('PATCH',{body:change(before,next)});assert.equal(result.status,expected,name+': '+JSON.stringify(result.body.error));if(expected!==200)assert.deepEqual((await request('GET')).body.data,before,name+' must not mutate stored data');count++;console.log('PASS '+name);return result;}
const billed=s=>{s.invoices=[{...fixture.sale,number:'F001-000001',document:'demo.pdf'}];s.financialMovements=[{id:'paid',kind:'Cobro',documentId:fixture.sale.id,date:'2026-10-22',amount:100,reference:'QA',evidence:'demo.pdf'}]};
(async()=>{
await trial('reject empty client',null,s=>s.clients.push({id:'bad',tipo:'Industria'}),409);
await trial('reject invalid campaign',null,s=>s.campaigns.push({id:'bad',nombre:'',fruta:'Mango',fecha:'2026-12-01',fechaFin:'2026-01-01',reqComercial:-1}),409);
await trial('reject duplicate client document',s=>{s.clients[0].ruc='12345678901'},s=>s.clients.push({...s.clients[0],id:'duplicate',telefono:'987654321'}),409);
await trial('accept valid new client without rewriting legacy',null,s=>s.clients.push({id:'new',empresa:'Cliente QA',ruc:'12345678901',telefono:'987654321',correo:'qa@example.test'}),200);
await trial('reject empty provider',null,s=>s.providers.push({id:'bad'}),409);
await trial('reject empty vehicle',s=>{s.transporters=[{id:'carrier',empresa:'QA',vehiculos:[],choferes:[]}]},s=>s.transporters[0].vehiculos.push({id:'bad',placa:''}),409);
await trial('reject driver without license',s=>{s.transporters=[{id:'carrier',empresa:'QA',vehiculos:[],choferes:[]}]},s=>s.transporters[0].choferes.push({id:'bad',nombre:'QA',numeroDocumento:'12345678',tipoDocumento:'DNI',telefono:'987654321'}),409);
await trial('reject planned kilos above contract',null,s=>s.requirements[0].contratos[0].entregas.push({id:'extra',fecha:'2026-10-24',kilos:5000}),409);
await trial('reject shrink contract below invoiced',billed,s=>{s.requirements[0].contratos[0].kilos=10},409);
await trial('reject change invoiced contract price',billed,s=>{s.requirements[0].contratos[0].precio=9},409);
await trial('reject change invoiced contract currency',billed,s=>{s.requirements[0].contratos[0].moneda='PEN'},409);
await trial('allow quantity extension with original invoice unchanged',billed,s=>{s.requirements[0].contratos[0].kilos=1500},200);
await trial('reject delete paid invoice',billed,s=>{s.invoices=[]},409);
await trial('reject delete contract with invoice',billed,s=>{s.requirements[0].contratos=[]},409);
await trial('reject delete invoice receipt',billed,s=>{s.logisticsDeliveries=[]},409);
await trial('reject change received weight after collection',billed,s=>{s.logisticsDeliveries[0].evaluation.plantWeight=470},409);
await trial('reject change loaded kilos after invoice',billed,s=>{s.campaignTransporters[0].services[0].annotation.kilos=900},409);
await trial('reject reception weight above load',null,s=>{s.logisticsDeliveries[0].evaluation.plantWeight=99999},409);
await trial('reject closing incomplete receipt',null,s=>{s.logisticsDeliveries[0].evaluation={plantWeight:0};s.logisticsDeliveries[0].physicalClosed=true},409);
await trial('allow complete physical closure',null,s=>{s.logisticsDeliveries[0].unloading={start:'2026-10-24T09:00',end:'2026-10-24T10:00'};s.logisticsDeliveries[0].physicalClosed=true},200);
const cert=s=>{s.certifications=[{id:'cert',costo:100,pagos:[],ampliaciones:[]}]};
await trial('reject negative certification payment',cert,s=>s.certifications[0].pagos.push({id:'p',monto:-10,fecha:'2026-10-24',referencia:'QA'}),409);
await trial('reject overpayment of certification',cert,s=>s.certifications[0].pagos.push({id:'p',monto:101,fecha:'2026-10-24',referencia:'QA'}),409);
await trial('allow valid certification abono',cert,s=>s.certifications[0].pagos.push({id:'p',monto:50,fecha:'2026-10-24',referencia:'QA'}),200);
await trial('reject negative certification expansion',cert,s=>s.certifications[0].ampliaciones.push({id:'e',kilos:-10,fecha:'2026-10-24',referencia:'QA'}),409);
// A legacy snapshot without the optional collection remains valid and is not rewritten on GET.
const old=fixture.fixture();delete old.transportRequests;reset(old);const beforeRead=stored;assert.equal((await request('GET')).status,200);assert.equal(stored,beforeRead);count++;
const requestRecord={id:'request-qa',reference:'REQ-QA',campaignId:'camp',date:'2026-10-24',companyIds:['carrier'],quotes:[]};
old.transporters=[{id:'carrier',empresa:'Transportista existente',vehiculos:[],choferes:[]}];reset(old);const next=structuredClone(old);next.transportRequests=[requestRecord];let r=await request('PATCH',{body:{id:crypto.randomUUID(),changes:changesBetween([],next.transportRequests,['transportRequests'])}});assert.equal(r.status,200,JSON.stringify(r.body.error));let read=(await request('GET')).body.data;assert.deepEqual(read.transportRequests,[requestRecord]);count++;
const quote={id:'quote-qa',companyId:'carrier',amount:100,currency:'PEN'};const quoted=structuredClone(read);quoted.transportRequests[0].quotes.push(quote);r=await request('PATCH',{body:change(read,quoted)});assert.equal(r.status,200,JSON.stringify(r.body.error));assert.deepEqual((await request('GET')).body.data.transportRequests[0].quotes,[quote]);count++;
const {documentName,documentUrl}=load('src/stored-documents.ts');const ref='/api/prototype-document?id=00000000-0000-4000-8000-000000000001&name=factura%20QA.pdf';assert.equal(documentName(ref),'factura QA.pdf');assert.equal(documentUrl('javascript:alert(1)'),'');assert.equal(documentName('archivo-anterior.pdf'),'archivo-anterior.pdf');count++;
console.log(JSON.stringify({result:'PASS',cases:count,scope:'API aislada y documentos; sin operaciones en producción'}));
})().catch(e=>{console.error(e);process.exitCode=1});
