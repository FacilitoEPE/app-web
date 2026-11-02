import type { IncomingMessage,ServerResponse } from 'node:http'
import { coordinates } from '../src/farm-map-model.js'
export default async function handler(req:IncomingMessage,res:ServerResponse){
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff')
 if(req.method!=='GET'){res.setHeader('Allow','GET');res.statusCode=405;return res.end(JSON.stringify({error:'Método no permitido.'}))}
 const params=new URL(req.url||'','https://prototype.local').searchParams
 const parse=(key:string)=>{const parts=(params.get(key)||'').split(',');return parts.length===2?coordinates(parts[0],parts[1]):null}
 const from=parse('from'),to=parse('to')
 if(!from||!to){res.statusCode=400;return res.end(JSON.stringify({error:'Selecciona un punto de salida y una finca con coordenadas válidas.'}))}
 try{
  const positions=[from,to].map(([lat,lng])=>`${lng},${lat}`).join(';')
  const response=await fetch(`https://router.project-osrm.org/route/v1/driving/${positions}?overview=full&geometries=geojson&steps=false`,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'CampaignManagementPrototype/1.0'}})
  if(!response.ok)throw Error('Servicio de rutas no disponible')
  const result=await response.json() as {code:string;routes?:{distance:number;duration:number;geometry:{coordinates:number[][]}}[];waypoints?:{distance:number}[]}
  const route=result.routes?.[0]
  if(result.code!=='Ok'||!route?.geometry?.coordinates?.length){res.statusCode=422;return res.end(JSON.stringify({error:'No se encontró una ruta por carretera hasta esta finca. El punto de la finca sigue visible en el mapa.'}))}
  if(!Number.isFinite(route.distance)||!Number.isFinite(route.duration)||route.geometry.coordinates.some(p=>!coordinates(p[1],p[0])))throw Error('Respuesta de ruta inválida')
  res.setHeader('Cache-Control','private, no-store')
  res.end(JSON.stringify({distance:route.distance,duration:route.duration,coordinates:route.geometry.coordinates.map(([lng,lat])=>[lat,lng]),destinationOffset:result.waypoints?.[1]?.distance||0}))
 }catch{res.statusCode=503;res.end(JSON.stringify({error:'No se pudo calcular la ruta. Reintenta; puedes seguir consultando la ubicación de la finca.'}))}
}
