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
function transportFixture(){const d=fixture.fixture(),l=d.campaignTransporters[0];l.paymentAgreement={total:1000,currency:'PEN',due:'2026-12-01',advance:0};l.services[0].freight=400;l.services.push({...structuredClone(l.services[0]),id:'second',freight:600,sourceDelivery:undefined});return d}
const cmd=(id,service='truck',extra={})=>({action:'settle-transport-and-pay',id,transportLinkId:'link',transportServiceId:service,date:'2026-10-23',expenses:[{id:'peaje',concept:'Peajes',amount:50,currency:'PEN',rate:1,included:false}],method:'Efectivo',...extra});
(async()=>{
reset(transportFixture());const a=cmd('transport-one'),b=cmd('transport-two','second');
const results=await Promise.all([request('POST',{body:a}),request('POST',{body:b})]);assert.ok(results.every(r=>r.status===200),JSON.stringify(results.map(r=>r.body.error)));
let state=(await request('GET')).body;assert.deepEqual(state.data.settlements.map(d=>d.number).sort(),['LT-000001','LT-000002']);assert.equal(state.data.financialMovements.length,2);
for(const d of state.data.settlements){assert.equal(d.paidOnSettlement,true);assert.equal(d.due,d.date);const p=state.data.financialMovements.find(p=>p.documentId===d.id);assert.equal(p.amount,d.price+50);assert.equal(p.date,d.date)}
assert.equal((await request('POST',{body:a})).body.revision,state.revision);
assert.equal((await request('POST',{body:cmd('duplicate')})).status,409);
const changed=structuredClone(state.data);changed.settlements[0].price++;assert.equal((await request('PATCH',{body:change(state.data,changed)})).status,409);
reset(transportFixture());let r=await request('POST',{body:cmd('transfer',undefined,{method:'Transferencia'})});assert.equal(r.status,409);state=(await request('GET')).body;assert.equal(state.data.settlements.length,0);assert.equal(state.data.financialMovements.length,0);
r=await request('POST',{body:cmd('transfer',undefined,{method:'Transferencia',reference:'OP-TRANSPORTE',evidence:'voucher.pdf'})});assert.equal(r.status,200,JSON.stringify(r.body.error));assert.equal(r.body.data.financialMovements[0].amount,450);
reset(transportFixture());r=await request('POST',{body:cmd('bad-expense',undefined,{expenses:[{id:'e',concept:'Peaje',amount:-1,currency:'PEN',rate:1,included:false}]})});assert.equal(r.status,409);assert.equal((await request('GET')).body.data.financialMovements.length,0);
const noFreight=transportFixture();delete noFreight.campaignTransporters[0].services[0].freight;reset(noFreight);assert.equal((await request('POST',{body:cmd('unassigned')})).status,409);
const old=transportFixture();delete old.campaignTransporters[0].services[0].freight;old.settlements=[{id:'unpaid',number:'OLD-123',operationId:'op',transportLinkId:'link',transportServiceId:'truck',date:'2026-10-22',due:'2026-12-01',kilos:1,price:400,additions:0,deductions:0,currency:'PEN',transportExpenses:[]}];reset(old);r=await request('POST',{body:cmd('complete-old',undefined,{settlementId:'unpaid'})});assert.equal(r.status,200,JSON.stringify(r.body.error));assert.equal(r.body.data.settlements.length,1);assert.equal(r.body.data.financialMovements[0].amount,450);assert.equal(r.body.data.campaignTransporters[0].services[0].freight,400);
console.log('PASS IMMEDIATE TRANSPORT: atomic full payment, distinct LT numbering under concurrency, retry idempotence, duplicates rejected, source freight required, transfer evidence and immutable paid history.');
})().catch(e=>{console.error(e);process.exitCode=1});
