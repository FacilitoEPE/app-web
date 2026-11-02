const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=require('path').resolve(__dirname,'..')+'/';const ts=require(root+'node_modules/typescript');const cache={};let stored=null,etag=0;
class Precondition extends Error{}
const blob={BlobPreconditionFailedError:Precondition,get:async(_p,opts)=>{assert.equal(opts.useCache,false);if(!stored)return null;const text=stored;return {statusCode:200,stream:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(text));c.close()}}),blob:{etag:String(etag)}}},put:async(_p,value,opts)=>{if(stored&&opts.allowOverwrite===false)throw Error('exists');if(opts.ifMatch&&opts.ifMatch!==String(etag))throw new Precondition();stored=value;etag++;return {etag:String(etag)}}};
function load(relative){const full=require('path').resolve(root,relative);if(full.endsWith('.json'))return JSON.parse(fs.readFileSync(full,'utf8'));if(cache[full])return cache[full].exports;const module={exports:{}};cache[full]=module;const code=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText;vm.runInThisContext('(function(require,module,exports){'+code+'\n})')(name=>name==='@vercel/blob'?blob:name.startsWith('.')?load(require('path').relative(root,require('path').resolve(require('path').dirname(full),name.replace(/\.js$/,'.ts')))+(name.endsWith('.json')?'':name.endsWith('.js')?'':'.ts')):require(name),module,module.exports);return module.exports}
process.env.SHARED_STORAGE='supabase';process.env.SUPABASE_URL='https://isolated-test.supabase.co';process.env.SUPABASE_ANON_KEY='sb_publishable_test';process.env.SUPABASE_PROTOTYPE_TOKEN='isolated-prototype-token';
global.fetch=async(url,opts)=>{
 assert.ok(url.startsWith('https://isolated-test.supabase.co/rest/v1/rpc/'));assert.equal(opts.headers.apikey,'sb_publishable_test');
 const args=JSON.parse(opts.body);assert.equal(args.access_token,'isolated-prototype-token');const snapshot=JSON.parse(stored);
 if(url.endsWith('agro_read_prototype_state'))return new Response(JSON.stringify(args.metadata_only?{revision:snapshot.revision}:{revision:snapshot.revision,snapshot}),{status:200});
 assert.ok(url.endsWith('agro_save_prototype_state'));
 if(args.expected_revision!==snapshot.revision)return new Response('null',{status:200});
 assert.equal(args.next_snapshot.revision,snapshot.revision+1);stored=JSON.stringify(args.next_snapshot);return new Response(JSON.stringify(args.next_snapshot.revision),{status:200});
};
process.env.SHARED_ACCESS_SECRET='isolated-test-secret-'+crypto.randomUUID();
const {signAccess}=load('server/access.ts'),{changesBetween}=load('src/shared-protocol.ts'),handler=load('api/shared-state.ts').default;
async function request(method,{token,cookie,body}={}){const headers={};let output;const res={setHeader:(k,v)=>headers[k]=v,statusCode:200,end:v=>{output=v}};await handler({method,url:'/api/shared-state'+(token?'?access='+token:''),headers:{host:'example.test',...(cookie?{cookie}:{})},body},res);return {status:res.statusCode,body:output?JSON.parse(output):undefined,headers,cookie:headers['Set-Cookie']?.split(';')[0]}}
const change=(a,b)=>({id:crypto.randomUUID(),changes:changesBetween(a,b)});

const fixture=require('./test-finance.cjs');
function reset(data=fixture.fixture()){stored=JSON.stringify({schema:1,revision:1,updatedAt:new Date().toISOString(),data,applied:[]});etag++}
const command=(id,providerId='p1',extra={})=>({action:'settle-provider-and-pay',id,transportServiceId:'truck',providerId,date:'2026-10-22',method:'Efectivo',...extra});
(async()=>{
reset();const a=command('atomic-one'),b=command('atomic-two','p2');
const results=await Promise.all([request('POST',{body:a}),request('POST',{body:b})]);assert.ok(results.every(r=>r.status===200),JSON.stringify(results.map(r=>r.body.error)));
let current=(await request('GET')).body;assert.equal(current.data.settlements.length,2);assert.equal(current.data.financialMovements.length,2);assert.deepEqual(current.data.settlements.map(d=>d.number).sort(),['LC-000001','LC-000002']);
for(const d of current.data.settlements){assert.equal(d.date,d.due);assert.equal(d.paidOnSettlement,true);const pay=current.data.financialMovements.filter(p=>p.documentId===d.id);assert.equal(pay.length,1);assert.equal(pay[0].date,d.date);assert.equal(pay[0].amount,d.kilos*d.price)}
const revision=current.revision;assert.equal((await request('POST',{body:a})).body.revision,revision);assert.equal((await request('POST',{body:command('duplicate-source')})).status,409);
const forged=structuredClone(current.data);forged.settlements[0].notes='edit paid';assert.equal((await request('PATCH',{body:change(current.data,forged)})).status,409);
reset();let r=await request('POST',{body:command('missing-transfer','p1',{method:'Transferencia'})});assert.equal(r.status,409);current=(await request('GET')).body;assert.equal(current.data.settlements.length,0);assert.equal(current.data.financialMovements.length,0);
r=await request('POST',{body:command('valid-transfer','p1',{method:'Transferencia',reference:'DEMO-OP',evidence:'comprobante-demo.pdf'})});assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.data.financialMovements[0].reference,'DEMO-OP');
const annual=fixture.fixture();annual.settlements=[{...fixture.buy,id:'annual',number:'LC-000009',transportServiceId:'history',deliveryId:'history',price:412400,kilos:1}];reset(annual);
r=await request('POST',{body:command('uit-payment')});assert.equal(r.status,409);assert.match(r.body.error,/75 UIT/);current=(await request('GET')).body;assert.equal(current.data.settlements.length,1);assert.equal(current.data.financialMovements.length,0);
r=await request('POST',{body:command('uit-payment','p1',{uitLimitAcknowledged:true})});assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.data.settlements.at(-1).number,'LC-000010');assert.equal(r.body.data.financialMovements.length,1);
console.log('PASS IMMEDIATE PURCHASE: atomic settlement and full payment, concurrent consecutive numbers, idempotence, duplicate prevention, transfer evidence, paid-history lock and UIT acknowledgment.');
})().catch(e=>{console.error(e);process.exitCode=1});
