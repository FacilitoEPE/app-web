const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=require('path').resolve(__dirname,'..')+'/';const ts=require(root+'node_modules/typescript');const cache={};let stored=null,etag=0;
class Precondition extends Error{}
const blob={BlobPreconditionFailedError:Precondition,get:async(_p,opts)=>{assert.equal(opts.useCache,false);if(!stored)return null;const text=stored;return {statusCode:200,stream:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(text));c.close()}}),blob:{etag:String(etag)}}},put:async(_p,value,opts)=>{if(stored&&opts.allowOverwrite===false)throw Error('exists');if(opts.ifMatch&&opts.ifMatch!==String(etag))throw new Precondition();stored=value;etag++;return {etag:String(etag)}}};
function load(relative){const full=require('path').resolve(root,relative);if(full.endsWith('.json'))return JSON.parse(fs.readFileSync(full,'utf8'));if(cache[full])return cache[full].exports;const module={exports:{}};cache[full]=module;const code=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText;vm.runInThisContext('(function(require,module,exports){'+code+'\n})')(name=>name==='@vercel/blob'?blob:name.startsWith('.')?load(require('path').relative(root,require('path').resolve(require('path').dirname(full),name.replace(/\.js$/,'.ts')))+(name.endsWith('.json')?'':name.endsWith('.js')?'':'.ts')):require(name),module,module.exports);return module.exports}
process.env.SHARED_ACCESS_SECRET='isolated-test-secret-'+crypto.randomUUID();
const {signAccess}=load('server/access.ts'),{changesBetween}=load('src/shared-protocol.ts'),handler=load('api/shared-state.ts').default;
async function request(method,{token,cookie,body}={}){const headers={};let output;const res={setHeader:(k,v)=>headers[k]=v,statusCode:200,end:v=>{output=v}};await handler({method,url:'/api/shared-state'+(token?'?access='+token:''),headers:{host:'example.test',...(cookie?{cookie}:{})},body},res);return {status:res.statusCode,body:output?JSON.parse(output):undefined,headers,cookie:headers['Set-Cookie']?.split(';')[0]}}
const change=(a,b)=>({id:crypto.randomUUID(),changes:changesBetween(a,b)});


const {fixture,buy}=require('./test-finance.cjs');
const seed=fixture();seed.settlements=[{...buy,id:'annual-base',number:'ANNUAL',transportServiceId:'history',deliveryId:'history',currency:'PEN',kilos:1,price:412158,date:'2026-01-01'}];
stored=JSON.stringify({schema:1,revision:1,updatedAt:new Date().toISOString(),data:seed,applied:[]});etag=1;
(async()=>{
let initial=(await request('GET')).body.data;let next=structuredClone(initial);next.settlements.push(structuredClone(buy));let result=await request('PATCH',{body:change(initial,next)});assert.equal(result.status,409);assert.match(result.body.error,/75 UIT/);
next.settlements.at(-1).uitLimitAcknowledged=true;const batch=change(initial,next);result=await request('PATCH',{body:batch});assert.equal(result.status,200,JSON.stringify(result.body.error));const revision=result.body.revision;assert.equal((await request('PATCH',{body:batch})).body.revision,revision);
const concurrent=fixture();concurrent.settlements=[{...seed.settlements[0],price:411900}];
const service=concurrent.campaignTransporters[0].services[0];service.annotation.providers=[{providerId:'p1',kilos:200,variety:'Kent'}];const original=concurrent.logisticsDeliveries[0];original.evaluation.plantWeight=190;
const second=structuredClone(service);second.id='truck2';concurrent.campaignTransporters[0].services.push(second);concurrent.logisticsDeliveries.push({...structuredClone(original),id:'delivery2',transportServiceId:'truck2'});
stored=JSON.stringify({schema:1,revision:1,updatedAt:new Date().toISOString(),data:concurrent,applied:[]});etag++;
const a=structuredClone(concurrent),b=structuredClone(concurrent);a.settlements.push(buy);b.settlements.push({...buy,id:'second',number:'LC2',deliveryId:'delivery2',transportServiceId:'truck2'});
const results=await Promise.all([request('PATCH',{body:change(concurrent,a)}),request('PATCH',{body:change(concurrent,b)})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409],JSON.stringify(results.map(r=>r.body.error)));assert.match(results.find(r=>r.status===409).body.error,/75 UIT/);

// A linked person belongs to the commercial provider; identity and payments stay separate.
const linked=fixture();linked.providers[0].dni='12345678';linked.providers[0].tipoDocumento='DNI';
stored=JSON.stringify({schema:1,revision:1,updatedAt:new Date().toISOString(),data:linked,applied:[]});etag++;
const withPerson=structuredClone(linked);const relative={id:'relative-1',nombres:'Maria',apellidos:'Prueba',tipoDocumento:'DNI',dni:'87654321',vinculo:'Familiar'};withPerson.providers[0].settlementPeople=[relative];
let response=await request('PATCH',{body:change(linked,withPerson)});assert.equal(response.status,200,JSON.stringify(response.body.error));
response=await request('POST',{body:{action:'settle-provider',id:'linked-person-test',transportServiceId:'truck',providerId:'p1',settlementPersonId:'relative-1',date:'2026-10-21',method:'Efectivo'}});assert.equal(response.status,200,JSON.stringify(response.body.error));
const saved=(await request('GET')).body.data,document=saved.settlements.find(d=>d.id==='purchase-linked-person-test');assert.equal(document.providerId,'p1');assert.equal(document.settlementPersonId,'relative-1');assert.equal(document.settlementPerson.dni,'87654321');assert.equal(saved.financialMovements.length,0);
const {providerUit}=load('src/purchase-uit.ts');assert.equal(providerUit(saved,'p1',2026).total,0);assert.equal(providerUit(saved,'p1',2026,undefined,'relative-1').total,360);
const forged=structuredClone(saved);forged.settlements[0].settlementPersonId=undefined;response=await request('PATCH',{body:change(saved,forged)});assert.equal(response.status,409);assert.match(response.body.error,/persona/);
const deleted=structuredClone(saved);deleted.providers[0].settlementPeople=[];response=await request('PATCH',{body:change(saved,deleted)});assert.equal(response.status,409);
console.log('PASS API personas: alta vinculada, liquidación bajo proveedor principal, recarga desde otro cliente, acumulados separados, sin pago automático y protección de historial.');
console.log('PASS API UIT: confirmación al alcanzar el límite, reintento idempotente y revalidación del acumulado entre guardados concurrentes de dos dispositivos.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
