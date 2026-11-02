import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { prototypeRpc } from '../server/supabase-state.js'

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function checkedDocument(body:any){
 if(!body||typeof body.name!=='string'||!body.name.trim()||body.name.length>180||typeof body.base64!=='string'||body.base64.length>2796204||(body.base64.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.base64)))throw Error('El archivo no es válido o supera los 2 MB.')
 const bytes=Buffer.from(body.base64,'base64')
 const valid=(body.mime==='application/pdf'&&bytes.subarray(0,5).toString()==='%PDF-')||(body.mime==='image/png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))||(body.mime==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)
 if(!valid||!bytes.length||bytes.length>2097152)throw Error('Solo se admiten PDF, PNG o JPG válidos de hasta 2 MB.')
 return {name:body.name.replace(/[\r\n\x00-\x1f]/g,'').trim(),mime:body.mime,base64:body.base64}
}
export default async function handler(req:IncomingMessage&{body?:any},res:ServerResponse){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff')
 const json=(status:number,body:any)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body))}
 if(!['GET','POST'].includes(req.method||'')){res.setHeader('Allow','GET, POST');return json(405,{error:'Método no permitido.'})}
 const origin=req.headers.origin,host=req.headers['x-forwarded-host']||req.headers.host
 if(origin&&new URL(origin).host!==host)return json(403,{error:'Origen no permitido.'})
 try{
  if(req.method==='GET'){
   const id=new URL(req.url||'','https://prototype.local').searchParams.get('id');if(!id||!uuid.test(id))return json(400,{error:'Documento no válido.'})
   const doc=await prototypeRpc('agro_read_prototype_document',{document_id:id});if(!doc)return json(404,{error:'No se encontró el documento.'})
   res.setHeader('Content-Type',doc.mime);res.setHeader('Content-Disposition',`inline; filename*=UTF-8''${encodeURIComponent(doc.name)}`)
   res.setHeader('Content-Security-Policy',"sandbox; default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'")
   res.setHeader('X-Frame-Options','SAMEORIGIN');return res.end(Buffer.from(doc.base64,'base64'))
  }
  let body=req.body
  if(body===undefined){let raw='';for await(const part of req){raw+=part.toString();if(raw.length>2900000)return json(413,{error:'El documento supera los 2 MB.'})}body=JSON.parse(raw)}
  if(typeof body==='string')body=JSON.parse(body)
  const file=checkedDocument(body),id=randomUUID()
  await prototypeRpc('agro_upload_prototype_document',{document_id:id,file_name:file.name,file_mime:file.mime,file_base64:file.base64})
  return json(201,{id,name:file.name})
 }catch(error){return json(400,{error:error instanceof Error?error.message:'No se pudo procesar el documento.'})}
}
