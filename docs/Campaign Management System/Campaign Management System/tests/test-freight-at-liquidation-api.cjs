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
const transport=id=>({action:'settle-transport',id,transportLinkId:'link',transportServiceId:'truck',date:'2026-10-23',expenses:[{id:'peaje',concept:'Peajes',amount:50,currency:'PEN',rate:1,included:false}],method:'Efectivo'});
const pay=(id,documentId,amount,extra={})=>({action:'record-settlement-payment',id,documentId,amount,date:'2026-10-24',method:'Efectivo',...extra});
const {transportCompanyBalance,transportAdvanceState}=load('src/transport-advances.ts');
function inputFixture(){const d=fixture.fixture(),l=d.campaignTransporters[0];l.transporterId='carrier';l.paymentAgreement={type:'Adelanto',total:4200,currency:'PEN',due:'2026-12-01',advance:1200};l.services[0].freight=1000;for(let i=2;i<=4;i++)l.services.push({...structuredClone(l.services[0]),id:'trip'+i,sourceDelivery:undefined,freight:i===4?1200:1000});d.settlements=[{id:'old-advance-doc',number:'OLD',transportLinkId:'link',date:'2026-10-20',due:'2026-12-01',kilos:1,price:4200,additions:0,deductions:0,currency:'PEN'}];d.financialMovements=[{id:'fund',kind:'Pago',documentId:'old-advance-doc',date:'2026-10-20',amount:1200,method:'Efectivo',reference:'ADV',evidence:'demo'}];return d}
const input=(id,service,freight,freightObservation='')=>({action:'settle-transport',id,transportLinkId:'link',transportServiceId:service,date:'2026-10-23',freight,freightObservation,expenses:[],method:'Efectivo'});
(async()=>{
reset(inputFixture());let initial=(await request('GET')).body;assert.equal(transportCompanyBalance(initial.data,'link').pendingLiquidation,4200);
for(const freight of [undefined,0,-1,NaN]){const r=await request('POST',{body:input('invalid-'+String(freight),'truck',freight)});assert.equal(r.status,409);}
assert.equal((await request('GET')).body.revision,initial.revision);
let r=await request('POST',{body:input('one','truck',900)});assert.equal(r.status,200,JSON.stringify(r.body.error));let data=r.body.data;let doc=data.settlements.find(d=>d.transportServiceId==='truck');assert.equal(doc.price,900);assert.equal(data.campaignTransporters[0].services[0].freight,900);assert.deepEqual(data.financialMovements,initial.data.financialMovements);assert.equal(transportAdvanceState(data,'link').available,1200);assert.equal(transportCompanyBalance(data,'link').pendingLiquidation,3300);
const rev=r.body.revision;assert.equal((await request('POST',{body:input('one','truck',900)})).body.revision,rev);
for(const [id,service,freight] of [['two','trip2',1100],['three','trip3',1000]]){r=await request('POST',{body:input(id,service,freight)});assert.equal(r.status,200,JSON.stringify(r.body.error));}
assert.equal(transportCompanyBalance(r.body.data,'link').pendingLiquidation,1200);
const beforeReject=r.body.revision;r=await request('POST',{body:input('four-no-note','trip4',1500)});assert.equal(r.status,409);assert.equal((await request('GET')).body.revision,beforeReject);
r=await request('POST',{body:input('four','trip4',1500,'Recorrido adicional solicitado por el cliente')});assert.equal(r.status,200,JSON.stringify(r.body.error));data=r.body.data;assert.equal(transportCompanyBalance(data,'link').pendingLiquidation,0);assert.equal(transportCompanyBalance(data,'link').freightOverage,300);assert.equal(transportCompanyBalance(data,'link').balance,3300);assert.deepEqual(data.financialMovements,initial.data.financialMovements);
// Even an editable liquidation must still respect the remaining agreement.
assert.equal((await request('POST',{body:{...input('edit','truck',950),settlementId:doc.id}})).status,409);
assert.equal((await request('POST',{body:{...input('bad-advance','truck',900),advanceToApply:1}})).status,409);
// Concurrent liquidations re-evaluate the remaining agreement on the server.
const raceData=inputFixture();raceData.campaignTransporters[0].paymentAgreement={type:'Completo',total:1000,currency:'PEN',due:'2026-12-01',advance:0};raceData.settlements=[];raceData.financialMovements=[];reset(raceData);
const race=await Promise.all([request('POST',{body:input('race-one','truck',600)}),request('POST',{body:input('race-two','trip2',600)})]);assert.deepEqual(race.map(x=>x.status).sort(),[200,409]);
// Without a real-expense breakdown, saved load viaticos are added and itemized automatically.
const v=inputFixture();v.campaignTransporters[0].services[0].annotation.viaticos={currency:'PEN',mobility:130,supplies:50};reset(v);
let vr=await request('POST',{body:input('auto-viaticos','truck',20)});assert.equal(vr.status,200,JSON.stringify(vr.body.error));let vd=vr.body.data.settlements.find(d=>d.transportServiceId==='truck');assert.equal(vd.additions,180);assert.equal(vd.price+vd.additions,200);assert.deepEqual(vd.transportExpenses.map(e=>e.amount),[130,50]);assert.deepEqual(vr.body.data.financialMovements,v.financialMovements);assert.equal(vd.transportBudgetPen,180);
const viaticosRevision=vr.body.revision;assert.equal((await request('POST',{body:input('auto-viaticos','truck',20)})).body.revision,viaticosRevision);
// Actual expenses replace the default amount instead of adding it again.
reset(v);vr=await request('POST',{body:{...input('actual-expenses','truck',20),expenses:[{id:'actual',concept:'Alimentación',amount:45,currency:'PEN',rate:1,included:false}]}});assert.equal(vr.status,200,JSON.stringify(vr.body.error));vd=vr.body.data.settlements.find(d=>d.transportServiceId==='truck');assert.equal(vd.additions,45);assert.equal(vd.price+vd.additions,65);assert.equal(vd.transportExpenses.length,1);
// An empty viaticos budget adds nothing; no synthetic default amount is invented.
reset(inputFixture());vr=await request('POST',{body:input('no-viaticos','truck',20)});assert.equal(vr.status,200);assert.equal(vr.body.data.settlements.find(d=>d.transportServiceId==='truck').additions,0);
// Edit an unpaid liquidation in place: same identity and number, updated freight and total.
reset(v);let created=await request('POST',{body:input('edit-create','truck',20)});assert.equal(created.status,200);const original=created.body.data.settlements.find(d=>d.transportServiceId==='truck');
const editCommand={...input('edit-freight','truck',50),settlementId:original.id,expenses:original.transportExpenses};
let edited=await request('POST',{body:editCommand});assert.equal(edited.status,200,JSON.stringify(edited.body.error));const changed=edited.body.data.settlements.find(d=>d.id===original.id);assert.equal(changed.number,original.number);assert.equal(changed.price,50);assert.equal(changed.additions,180);assert.equal(changed.price+changed.additions,230);assert.equal(edited.body.data.settlements.filter(d=>d.transportServiceId==='truck').length,1);assert.equal(edited.body.data.campaignTransporters[0].services[0].freight,50);assert.equal(edited.body.data.requirements[0].contratos[0].entregas[0].freight,50);assert.deepEqual(edited.body.data.financialMovements,v.financialMovements);assert.equal(transportCompanyBalance(edited.body.data,'link').netPendingLiquidation,2950);
const editRevision=edited.body.revision;assert.equal((await request('POST',{body:editCommand})).body.revision,editRevision);
// Payments and explicit advance allocations protect the historical amount.
let funded=await request('POST',{body:{action:'record-settlement-payment',id:'edit-pay',documentId:original.id,date:'2026-10-24',amount:10,method:'Efectivo'}});assert.equal(funded.status,200);assert.equal((await request('POST',{body:{...editCommand,id:'edit-paid',freight:60}})).status,409);
reset(v);created=await request('POST',{body:input('edit-advance-create','truck',20)});const advanceDoc=created.body.data.settlements.find(d=>d.transportServiceId==='truck');funded=await request('POST',{body:{action:'apply-transport-advance',id:'edit-apply',documentId:advanceDoc.id,amount:10,date:'2026-10-24'}});assert.equal(funded.status,200);assert.equal((await request('POST',{body:{...editCommand,id:'edit-applied',settlementId:advanceDoc.id}})).status,409);
console.log('PASS EDIT FREIGHT: unpaid document updated in place, same number, expense amounts retained, source load+delivery synchronized, totals recalculated, idempotence, paid/advance-applied amounts protected.');
console.log('PASS VIATICOS: flete 20 + saved mobility 130 + supplies 50 = 200; itemized server-side, no automatic payment, retry idempotent, actual expenses replace defaults, absent budget adds zero.');
console.log('PASS FREIGHT AT LIQUIDATION: price required, no old assignment fallback, per-load entered price saved atomically, idempotence, no payments or advance application, remaining agreement decreases, justified overage only, immutable previous liquidation, concurrent excess rejected.');
})().catch(e=>{console.error(e);process.exitCode=1});
