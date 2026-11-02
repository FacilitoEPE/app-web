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
function transportFixture(){const d=fixture.fixture(),l=d.campaignTransporters[0];l.paymentAgreement={total:1000,currency:'PEN',due:'2026-12-01',advance:0};l.services[0].freight=400;return d}
const provider=id=>({action:'settle-provider',id,transportServiceId:'truck',providerId:'p1',date:'2026-10-23',method:'Efectivo'});
const transport=id=>({action:'settle-transport',id,transportLinkId:'link',transportServiceId:'truck',date:'2026-10-23',freight:400,expenses:[{id:'peaje',concept:'Peajes',amount:50,currency:'PEN',rate:1,included:false}],method:'Efectivo'});
const pay=(id,documentId,amount,extra={})=>({action:'record-settlement-payment',id,documentId,amount,date:'2026-10-24',method:'Efectivo',...extra});
(async()=>{
reset(transportFixture());let r=await request('POST',{body:provider('provider-doc')});assert.equal(r.status,200,JSON.stringify(r.body.error));let state=r.body;assert.equal(state.data.financialMovements.length,0);assert.equal(state.data.settlements[0].number,'LC-000001');assert.equal(state.data.settlements[0].paidOnSettlement,false);assert.equal(state.data.settlements[0].due,'');
const providerDoc=state.data.settlements[0];r=await request('POST',{body:transport('transport-doc')});assert.equal(r.status,200,JSON.stringify(r.body.error));state=r.body;const transportDoc=state.data.settlements.find(d=>d.transportLinkId);assert.equal(transportDoc.number,'LT-000001');assert.equal(transportDoc.due,'2026-12-01');assert.equal(state.data.financialMovements.length,0);assert.equal(transportDoc.price+transportDoc.additions,450);
const docs=JSON.stringify(state.data.settlements),revision=state.revision;assert.equal((await request('POST',{body:provider('provider-doc')})).body.revision,revision);
assert.equal((await request('POST',{body:pay('no-doc','missing',1)})).status,409);
assert.equal((await request('POST',{body:pay('bad-date',providerDoc.id,10,{date:'2026-10-22'})})).status,409);
assert.equal((await request('POST',{body:pay('missing-evidence',providerDoc.id,10,{method:'Transferencia',reference:'OP'})})).status,409);
const first=pay('partial-provider',providerDoc.id,100);r=await request('POST',{body:first});assert.equal(r.status,200,JSON.stringify(r.body.error));state=r.body;assert.equal(state.data.financialMovements.length,1);assert.equal(JSON.stringify(state.data.settlements),docs);assert.equal((await request('POST',{body:first})).body.revision,state.revision);
const race=await Promise.all([request('POST',{body:pay('race-one',transportDoc.id,300)}),request('POST',{body:pay('race-two',transportDoc.id,300)})]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
r=await request('POST',{body:pay('transport-balance',transportDoc.id,150,{method:'Transferencia',reference:'FINAL-OP',evidence:'voucher.pdf'})});assert.equal(r.status,200,JSON.stringify(r.body.error));state=r.body;assert.equal(state.data.financialMovements.filter(m=>m.documentId===transportDoc.id).reduce((n,m)=>n+m.amount,0),450);assert.equal(JSON.stringify(state.data.settlements),docs);
assert.equal((await request('POST',{body:pay('overpaid',transportDoc.id,1)})).status,409);
const edit=structuredClone(state.data);edit.settlements.find(d=>d.id===transportDoc.id).additions++;assert.equal((await request('PATCH',{body:change(state.data,edit)})).status,409);
assert.equal((await request('POST',{body:provider('duplicate-provider')})).status,409);
console.log('PASS SEPARATED PAYMENTS: provider+transport liquidation creates no payment; distinct numbering; independent partial/full payments; idempotence; concurrent overpayment rejected; dates/evidence validated; settled documents and previous payments preserved.');
})().catch(e=>{console.error(e);process.exitCode=1});
