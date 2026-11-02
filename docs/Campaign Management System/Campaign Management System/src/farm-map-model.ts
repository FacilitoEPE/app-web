import type { Provider } from './store'
export type Position=[number,number]
export function coordinates(latitude:unknown,longitude:unknown):Position|null {
 const parse=(value:unknown)=>{const text=String(value??'').trim().replace(',','.');return /^[-+]?\d+(\.\d+)?$/.test(text)?Number(text):NaN}
 const lat=parse(latitude),lng=parse(longitude)
 return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?[lat,lng]:null
}
export function farmStops(providers:Provider[],delivery:{providers?:{providerId:string;fincaIds:string[]}[];providerId?:string;fincaId?:string}) {
 const refs=delivery.providers?.length?delivery.providers:delivery.providerId&&delivery.fincaId?[{providerId:delivery.providerId,fincaIds:[delivery.fincaId]}]:[]
 const seen=new Set<string>()
 return refs.flatMap(ref=>ref.fincaIds.flatMap(id=>{const key=ref.providerId+'|'+id;if(seen.has(key))return [];seen.add(key);const provider=providers.find(p=>p.id===ref.providerId);const farm=provider?.fincas?.find(f=>f.id===id);return [{key,name:farm?.nombre||'Finca sin registrar',provider:provider?`${provider.nombres} ${provider.apellidos}`:'Proveedor sin registrar',position:coordinates(farm?.latitud,farm?.longitud)}]}))
}
