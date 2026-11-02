import { useEffect,useRef,useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './driver-farm-map.css'
import type { Provider } from './store'
import { farmStops,type Position } from './farm-map-model'
import { Button,Field,Select,Modal } from './ui'
type Route={distance:number;duration:number;coordinates:Position[];destinationOffset:number}
export default function DriverFarmMap({providers,delivery,onClose}:{providers:Provider[];delivery:{providers?:{providerId:string;fincaIds:string[]}[];providerId?:string;fincaId?:string};onClose:()=>void}){
 const stops=farmStops(providers,delivery),valid=stops.filter(s=>s.position)
 const [selected,setSelected]=useState(valid[0]?.key||''),[origin,setOrigin]=useState<Position|null>(null),[picking,setPicking]=useState(false),[route,setRoute]=useState<Route|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[locating,setLocating]=useState(false),[tileError,setTileError]=useState(false)
 const current=valid.find(s=>s.key===selected)
 const node=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),layers=useRef<L.LayerGroup|null>(null),pickRef=useRef(false),request=useRef<AbortController|null>(null),geoRequest=useRef(0)
 useEffect(()=>{pickRef.current=picking},[picking])
 useEffect(()=>{
  if(!node.current||!valid.length)return
  const instance=L.map(node.current,{scrollWheelZoom:false}).setView(valid[0].position!,13);map.current=instance;layers.current=L.layerGroup().addTo(instance)
  L.tileLayer(import.meta.env.VITE_MAP_TILE_URL||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'}).on('tileerror',()=>setTileError(true)).addTo(instance)
  instance.on('click',(event:L.LeafletMouseEvent)=>{if(!pickRef.current)return;request.current?.abort();setBusy(false);setOrigin([event.latlng.lat,event.latlng.lng]);setRoute(null);setError('');setPicking(false)})
  const resize=new ResizeObserver(()=>instance.invalidateSize());resize.observe(node.current)
  return ()=>{geoRequest.current++;request.current?.abort();resize.disconnect();instance.remove();map.current=null;layers.current=null}
 },[])
 useEffect(()=>{
  const instance=map.current,group=layers.current;if(!instance||!group)return
  group.clearLayers()
  for(const stop of valid){const label=document.createElement('span');label.textContent=stop.name;L.circleMarker(stop.position!,{radius:stop.key===selected?10:6,color:'#fff',weight:2,fillColor:stop.key===selected?'#154734':'#7e9686',fillOpacity:1}).bindTooltip(label,{direction:'top'}).on('click',()=>{if(!pickRef.current){request.current?.abort();setBusy(false);setSelected(stop.key);setRoute(null);setError('')}}).addTo(group)}
  if(origin)L.circleMarker(origin,{radius:8,color:'#fff',weight:2,fillColor:'#287bd1',fillOpacity:1}).bindTooltip('Punto de salida').addTo(group)
  if(route?.coordinates.length){L.polyline(route.coordinates,{color:'#154734',weight:5,opacity:0.85}).addTo(group);instance.fitBounds(L.latLngBounds(route.coordinates),{padding:[24,24],maxZoom:15})}
  else if(origin&&current?.position)instance.fitBounds(L.latLngBounds([origin,current.position]),{padding:[30,30],maxZoom:15})
  else if(current?.position)instance.setView(current.position,14)
 },[selected,origin,route])
 const locate=()=>{
  if(!navigator.geolocation){setError('Tu navegador no permite obtener la ubicación. Marca tu punto de salida en el mapa.');return}
  const token=++geoRequest.current;setLocating(true);setError('')
  navigator.geolocation.getCurrentPosition(p=>{if(token!==geoRequest.current)return;request.current?.abort();setBusy(false);setOrigin([p.coords.latitude,p.coords.longitude]);setRoute(null);setLocating(false)},()=>{if(token!==geoRequest.current)return;setLocating(false);setError('No se pudo obtener tu ubicación. Puedes marcar el punto de salida en el mapa.')},{enableHighAccuracy:true,timeout:12000,maximumAge:60000})
 }
 const calculate=async()=>{
  if(!origin||!current?.position)return
  request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setError('');setRoute(null)
  try{const params=new URLSearchParams({from:origin.join(','),to:current.position.join(',')});const result=await fetch('/api/farm-route?'+params,{signal:controller.signal});const body=await result.json();if(!result.ok)throw Error(body.error||'No se pudo calcular la ruta.');if(!controller.signal.aborted)setRoute(body)}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'No se pudo calcular la ruta.')}finally{if(!controller.signal.aborted)setBusy(false)}
 }
 return <Modal open wide title="Ubicación y ruta de recojo" onClose={onClose} footer={<Button variant="outline" onClick={onClose}>Cerrar mapa</Button>}>
 {!valid.length?<p className="rounded-xl bg-canvas p-4 text-sm">Las fincas de esta carga no tienen coordenadas válidas. El administrador debe completar su latitud y longitud en Gestión de Proveedores → Fincas.</p>:<>
  <Field label="Finca de recojo"><Select value={selected} onChange={e=>{request.current?.abort();setBusy(false);setSelected(e.target.value);setRoute(null);setError('')}}>{valid.map(s=><option key={s.key} value={s.key}>{s.name} · {s.provider}</option>)}</Select></Field>
  <p className="mb-3 mt-2 text-xs text-ink-soft">Punto registrado: {current?.position?.map(n=>n.toFixed(6)).join(', ')}. Verde: finca · Azul: salida.</p>
  <div ref={node} role="region" aria-label="Mapa de ubicación de las fincas y ruta de recojo" className="relative z-0 h-[300px] w-full overflow-hidden rounded-xl border border-line sm:h-[340px]" style={{cursor:picking?'crosshair':undefined}}/>
  {tileError&&<p role="status" className="mt-2 text-xs text-ink-soft">Algunas partes del mapa no cargaron. Comprueba tu conexión.</p>}
  <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" disabled={locating} onClick={locate}>{locating?'Obteniendo ubicación…':'Usar mi ubicación'}</Button><Button variant="outline" onClick={()=>{geoRequest.current++;setLocating(false);setPicking(!picking)}}>{picking?'Cancelar selección':'Marcar salida en el mapa'}</Button><Button disabled={!origin||busy||picking} onClick={calculate}>{busy?'Calculando…':'Ver ruta'}</Button></div>
  <p className="mt-2 text-xs text-ink-soft">{picking?'Toca el mapa para marcar desde dónde saldrás.':origin?'Punto de salida seleccionado. Pulsa Ver ruta.':'Elige un punto de salida para calcular la ruta hasta esta finca.'}</p>
  {route&&<div className="mt-3 rounded-xl bg-leaf-50 p-3 text-sm"><b>{(route.distance/1000).toFixed(1)} km · aprox. {Math.max(1,Math.round(route.duration/60))} min</b><p className="mt-1 text-xs text-ink-soft">Ruta orientativa por carretera; no considera restricciones específicas de camiones.{route.destinationOffset>100?' El camino calculado termina cerca del punto: verifica el acceso final a la finca.':''}</p></div>}
  {error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
 </>}
 {stops.some(s=>!s.position)&&valid.length>0&&<p className="mt-3 text-xs text-ink-soft">Sin coordenadas válidas: {stops.filter(s=>!s.position).map(s=>s.name).join(', ')}.</p>}
 </Modal>
}
