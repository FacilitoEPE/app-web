const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ts=require(path.join(root,'node_modules/typescript'));
const saved=new Map();
const code=ts.transpileModule(fs.readFileSync(path.join(root,'api/prototype-document.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
vm.runInThisContext('(function(require,module,exports){'+code+'\n})')(name=>name.includes('supabase-state')?{prototypeRpc:async(name,args)=>{if(name.includes('upload')){saved.set(args.document_id,{id:args.document_id,name:args.file_name,mime:args.file_mime,base64:args.file_base64});return args.document_id}return saved.get(args.document_id)||null}}:require(name),mod,mod.exports);
const handler=mod.exports.default,check=mod.exports.checkedDocument;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ9sAAAAASUVORK5CYII=','base64');
const file={name:'Boleta ñ.png',mime:'image/png',base64:png.toString('base64')};
assert.equal(check(file).mime,'image/png');
assert.throws(()=>check({...file,mime:'application/pdf'}));assert.throws(()=>check({...file,base64:Buffer.from('<script>bad</script>').toString('base64')}));assert.throws(()=>check({...file,base64:'x'.repeat(2796205)}));
const large=Buffer.alloc(2097152,0);png.copy(large);assert.equal(check({...file,base64:large.toString('base64')}).mime,'image/png');
async function request(method,url,body,origin){let output;const headers={};const res={statusCode:200,setHeader:(k,v)=>headers[k]=v,end:x=>output=x};await handler({method,url,headers:{host:'app.test',...(origin?{origin}:{})},body},res);return {status:res.statusCode,headers,body:headers['Content-Type']==='application/json'?JSON.parse(output):output}}
(async()=>{
const up=await request('POST','/api/prototype-document',file);assert.equal(up.status,201);
const read=await request('GET','/api/prototype-document?id='+up.body.id);assert.equal(read.status,200);assert.deepEqual(read.body,png);assert.equal(read.headers['Content-Type'],'image/png');assert.equal(read.headers['X-Frame-Options'],'SAMEORIGIN');
assert.equal((await request('POST','/api/prototype-document',file,'https://other.test')).status,403);
assert.equal((await request('GET','/api/prototype-document?id=../../etc')).status,400);
assert.equal((await request('GET','/api/prototype-document?id=00000000-0000-4000-8000-000000000001')).status,404);
assert.equal((await request('POST','/api/prototype-document',{...file,mime:'text/html'})).status,400);
assert.equal((await request('DELETE','/api/prototype-document')).status,405);
console.log('PASS attachments: binary round trip, 2 MB limit, file signatures, inline same-origin preview, missing file and cross-origin rejection.');
})().catch(e=>{console.error(e);process.exitCode=1});
