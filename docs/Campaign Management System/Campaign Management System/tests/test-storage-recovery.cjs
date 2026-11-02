const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=require('path').resolve(__dirname,'..')+'/';const ts=require(root+'node_modules/typescript');const cache={};let stored=null,etag=0,writes=0,fullReads=0,conditionalReads=0,suspended=false;
class Precondition extends Error{}
const blob={BlobPreconditionFailedError:Precondition,get:async(_p,opts)=>{assert.equal(opts.useCache,false);if(suspended)throw Error('Vercel Blob: Failed to fetch blob: 403 Forbidden');if(!stored)return null;if(opts.ifNoneMatch===String(etag)){conditionalReads++;return {statusCode:304,stream:null,blob:{etag:String(etag)}}}fullReads++;const text=stored;return {statusCode:200,stream:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(text));c.close()}}),blob:{etag:String(etag)}}},put:async(_p,value,opts)=>{writes++;if(stored&&opts.allowOverwrite===false)throw Error('exists');if(opts.ifMatch&&opts.ifMatch!==String(etag))throw new Precondition();stored=value;etag++;return {etag:String(etag)}}};
function load(relative){const full=require('path').resolve(root,relative);if(full.endsWith('.json'))return JSON.parse(fs.readFileSync(full,'utf8'));if(cache[full])return cache[full].exports;const module={exports:{}};cache[full]=module;const code=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText;vm.runInThisContext('(function(require,module,exports){'+code+'\n})')(name=>name==='@vercel/blob'?blob:name.startsWith('.')?load(require('path').relative(root,require('path').resolve(require('path').dirname(full),name.replace(/\.js$/,'.ts')))+(name.endsWith('.json')?'':name.endsWith('.js')?'':'.ts')):require(name),module,module.exports);return module.exports}
process.env.SHARED_ACCESS_SECRET='isolated-test-secret-'+crypto.randomUUID();
const {signAccess}=load('server/access.ts'),{changesBetween}=load('src/shared-protocol.ts'),handler=load('api/shared-state.ts').default;
async function request(method,{token,cookie,body,ifNoneMatch}={}){const headers={};let output;const res={setHeader:(k,v)=>headers[k]=v,statusCode:200,end:v=>{output=v}};await handler({method,url:'/api/shared-state'+(token?'?access='+token:''),headers:{host:'example.test',...(ifNoneMatch?{'if-none-match':ifNoneMatch}:{}),...(cookie?{cookie}:{})},body},res);return {status:res.statusCode,body:output?JSON.parse(output):undefined,headers,cookie:headers['Set-Cookie']?.split(';')[0]}}
const change=(a,b)=>({id:crypto.randomUUID(),changes:changesBetween(a,b)});

const fixture=require('./test-finance.cjs');
stored=JSON.stringify({schema:1,revision:7,updatedAt:new Date().toISOString(),data:fixture.fixture(),applied:[]});etag=7;
(async()=>{
const original=stored;
let r=await request('GET');assert.equal(r.status,200);assert.equal(fullReads,1);
r=await request('GET',{ifNoneMatch:'7'});assert.equal(r.status,304);assert.equal(fullReads,1);assert.equal(conditionalReads,1);assert.equal(writes,0);
suspended=true;r=await request('GET');assert.equal(r.status,503);assert.equal(r.body.code,'STORAGE_UNAVAILABLE');assert.equal(stored,original);assert.equal(writes,0);
suspended=false;stored=null;r=await request('GET');assert.equal(r.status,503);assert.equal(writes,0);assert.equal(stored,null);
stored=original;r=await request('GET');assert.equal(r.status,200);assert.equal(r.body.revision,7);assert.equal(writes,0);
stored='{"schema":99}';r=await request('GET');assert.equal(r.status,503);assert.equal(stored,'{"schema":99}');assert.equal(writes,0);
console.log('PASS STORAGE: conditional reads avoid full download, suspended/missing/invalid storage never reseeds, original revision resumes intact.');
})().catch(e=>{console.error(e);process.exitCode=1});
