const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=require('path').resolve(__dirname,'..')+'/';const ts=require(root+'node_modules/typescript');const cache={};let stored=null,etag=0;
class Precondition extends Error{}
const blob={BlobPreconditionFailedError:Precondition,get:async(_p,opts)=>{assert.equal(opts.useCache,false);if(!stored)return null;const text=stored;return {statusCode:200,stream:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(text));c.close()}}),blob:{etag:String(etag)}}},put:async(_p,value,opts)=>{if(stored&&opts.allowOverwrite===false)throw Error('exists');if(opts.ifMatch&&opts.ifMatch!==String(etag))throw new Precondition();stored=value;etag++;return {etag:String(etag)}}};
function load(relative){const full=require('path').resolve(root,relative);if(full.endsWith('.json'))return JSON.parse(fs.readFileSync(full,'utf8'));if(cache[full])return cache[full].exports;const module={exports:{}};cache[full]=module;const code=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText;vm.runInThisContext('(function(require,module,exports){'+code+'\n})')(name=>name==='@vercel/blob'?blob:name.startsWith('.')?load(require('path').relative(root,require('path').resolve(require('path').dirname(full),name.replace(/\.js$/,'.ts')))+(name.endsWith('.json')?'':name.endsWith('.js')?'':'.ts')):require(name),module,module.exports);return module.exports}
process.env.SHARED_ACCESS_SECRET='isolated-test-secret-'+crypto.randomUUID();
const {signAccess}=load('server/access.ts'),{changesBetween}=load('src/shared-protocol.ts'),handler=load('api/shared-state.ts').default;
async function request(method,{token,cookie,body}={}){const headers={};let output;const res={setHeader:(k,v)=>headers[k]=v,statusCode:200,end:v=>{output=v}};await handler({method,url:'/api/shared-state'+(token?'?access='+token:''),headers:{host:'example.test',...(cookie?{cookie}:{})},body},res);return {status:res.statusCode,body:output?JSON.parse(output):undefined,headers,cookie:headers['Set-Cookie']?.split(';')[0]}}
const change=(a,b)=>({id:crypto.randomUUID(),changes:changesBetween(a,b)});

const fixture=require('./test-finance.cjs');stored=JSON.stringify({schema:1,revision:1,updatedAt:new Date().toISOString(),data:fixture.fixture(),applied:[]});etag=1;
(async()=>{
const first=await request('GET');assert.equal(first.status,200);assert.equal(first.body.actor.role,'admin');
const initial=first.body.data;
const withSale=structuredClone(initial);withSale.invoices.push(fixture.sale);
let result=await request('PATCH',{body:change(initial,withSale)});assert.equal(result.status,200,JSON.stringify(result.body));
const before=result.body.data,left=structuredClone(before),right=structuredClone(before);left.settlements.push(fixture.buy);right.settlements.push({...fixture.buy,id:'buy2',number:'LC2',providerId:'p2',kilos:300,price:2.1});
const both=await Promise.all([request('PATCH',{body:change(before,left)}),request('PATCH',{body:change(before,right)})]);assert.ok(both.every(r=>r.status===200),JSON.stringify(both.map(x=>x.body.error)));
let current=(await request('GET')).body.data;assert.equal(current.settlements.length,2);
const dup=structuredClone(current);dup.settlements.push({...fixture.buy,id:'dup',number:'LC3'});assert.equal((await request('PATCH',{body:change(current,dup)})).status,409);
const paid=structuredClone(current);paid.financialMovements.push({id:'pay',kind:'Pago',documentId:'buy1',date:'2026-10-21',amount:100,method:'Transferencia',reference:'DEMO-PAY',evidence:'demo.pdf'});
result=await request('PATCH',{body:change(current,paid)});assert.equal(result.status,200,JSON.stringify(result.body.error));current=result.body.data;
const over=structuredClone(current);over.financialMovements.push({id:'over',kind:'Pago',documentId:'buy1',date:'2026-10-21',amount:300,reference:'OVER',evidence:'demo.pdf'});assert.equal((await request('PATCH',{body:change(current,over)})).status,409);
const edit=structuredClone(current);edit.settlements.find(d=>d.id==='buy1').notes='modified';assert.equal((await request('PATCH',{body:change(current,edit)})).status,409);
const read=(await request('GET')).body.data;assert.equal(read.financialMovements.length,1);assert.equal(read.invoices[0].kilos,480);
console.log('PASS API: venta, dos compras concurrentes por proveedor, persistencia entre clientes, rechazo de duplicados, pago parcial, sobrepago y preservación de documentos pagados.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
