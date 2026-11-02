import type { CampaignTransportService, GuideProvider, useStore } from './store'

export type RemissionGuide = NonNullable<CampaignTransportService['guides']>[number]
export type GuideContext = Pick<ReturnType<typeof useStore>,'providers'|'requirements'|'qualityOperations'|'campaignTransporters'|'campaigns'|'transporters'> & Partial<Pick<ReturnType<typeof useStore>,'campaignProviders'>>
export const GUIDE_STANDARDS = [
  {code:'NOP',label:'NOP',issuer:'ORGANICO: CAAE AMERICA\nCODIGO CAAE: 36774',phrase:'CERTIFIED ORGANIC BY SC CAAE'},
  {code:'RTPO',label:'RTPO',issuer:'ORGANICO: CAAE AMERICA\nCODIGO CAAE: 36774',phrase:'REGLAMENTO TECNICO PERUANO PARA PRODUCTOS ORGANICOS.'},
  {code:'EU',label:'EU',issuer:'ORGANICO: CAAE AMERICA\nCODIGO CAAE: 36774',phrase:'CERTIFICADO ORGANICO POR\nCAAE PE-BIO-178'},
  {code:'ROC',label:'ROC',issuer:'ROC: CONTROL UNION',phrase:'Regenerative Organic Certified® Bronce'},
  {code:'GLOBALGAP_GRASP',label:'GLOBALG.A.P. / GRASP',issuer:'GLOBALG.A.P Y GRASP: CERTIGROW',phrase:'GGN:4063061578877'},
] as const

export function standardPhrases(codes: string[]) {
  const issuers=new Set<string>();const lines:string[]=[]
  for(const code of Array.from(new Set(codes))){const standard=GUIDE_STANDARDS.find(n=>n.code===code);if(!standard)continue;if(!issuers.has(standard.issuer)){lines.push(standard.issuer);issuers.add(standard.issuer)}lines.push(standard.phrase)}
  return lines.join('\n')
}
export function guideRoute(s:GuideContext,item:CampaignTransportService,g:RemissionGuide){return s.qualityOperations.find(o=>o.id===item.operationId)?.route||s.requirements.find(r=>r.id===g.requirementId)?.canal||'Industria'}
export function guideFruitType(s:GuideContext,item:CampaignTransportService,g:RemissionGuide,p:GuideProvider): 'Orgánica'|'Convencional'|undefined {
  if(guideRoute(s,item,g)==='Exportación')return 'Orgánica'
  if(g.generatedAt&&p.fruitType)return p.fruitType
  const campaignId=s.requirements.find(r=>r.id===g.requirementId)?.campaignId||s.qualityOperations.find(o=>o.id===item.operationId)?.campaignId||s.campaignTransporters.find(l=>l.services.some(service=>service.id===item.id))?.campaignId
  const entries=s.campaignProviders?.filter(c=>c.campaignId===campaignId&&c.providerId===p.providerId)||[]
  // Same rule as the campaign participation view; do not infer from sanitary classification.
  const roles=new Set(entries.map(c=>c.rol))
  const role=roles.size===1?entries[0].rol:entries.length?undefined:s.providers.find(provider=>provider.id===p.providerId)?.tipo
  if(role==='Productor')return 'Orgánica'
  if(role==='Acopiador')return 'Convencional'

  return undefined
}
export function guideHasOrganic(s:GuideContext,item:CampaignTransportService,g:RemissionGuide){return guideRoute(s,item,g)==='Exportación'||guideProviders(s,item,g).some(p=>guideFruitType(s,item,g,p)==='Orgánica')}
export function guideDelivery(s:GuideContext,g:RemissionGuide){return s.requirements.find(r=>r.id===g.requirementId)?.contratos?.find(c=>c.id===g.contractId)?.entregas.find(d=>d.id===g.deliveryId)}
export function loadWeight(s:GuideContext,item:CampaignTransportService){return item.annotation?.kilos||s.qualityOperations.find(o=>o.id===item.operationId)?.harvestedQuantity||Number(item.documents?.loadedKg)||item.guides?.reduce((n,g)=>n+g.kilos,0)||0}

export function loadProviders(s:GuideContext,item:CampaignTransportService,g:RemissionGuide): (GuideProvider & {label:string;availableWeight?:number})[] {
  const delivery=guideDelivery(s,g)
  const entries=item.annotation?.providers?.length?item.annotation.providers.map(p=>({providerId:p.providerId,fincaIds:delivery?.providers?.find(entry=>entry.providerId===p.providerId)?.fincaIds||(item.providerId===p.providerId&&item.fincaId?[item.fincaId]:[])})):delivery?.providers?.length?delivery.providers:(item.providerId?[{providerId:item.providerId,fincaIds:item.fincaId?[item.fincaId]:[]}]:[])
  const operation=s.qualityOperations.find(o=>o.id===item.operationId)
  return entries.map(entry=>{
    const provider=s.providers.find(p=>p.id===entry.providerId)
    const annotation=item.annotation?.providers?.find(p=>p.providerId===entry.providerId)
    const advances=operation?.advances.filter(a=>a.providerId===entry.providerId&&entry.fincaIds.includes(a.fincaId||''))||[]
    const weight=annotation?.kilos??(advances.length?advances.reduce((n,a)=>n+a.kilos,0):operation?.advances.length?0:entries.length===1?loadWeight(s,item):undefined)
    return {...entry,label:`${provider?.nombres||''} ${provider?.apellidos||''}`,kilos:weight||0,availableWeight:weight}
  })
}
export function guideProviders(s:GuideContext,item:CampaignTransportService,g:RemissionGuide):GuideProvider[]{
  if(g.providers)return g.providers
  const providers=loadProviders(s,item,g)
  const total=providers.reduce((n,p)=>n+p.kilos,0)
  // Historic guides keep the actual provider weights only when their sum matches the guide.
  return providers.map(p=>({providerId:p.providerId,fincaIds:p.fincaIds,kilos:Math.abs(total-g.kilos)<0.011?p.kilos:providers.length===1?g.kilos:0}))
}
export function guideValidation(s:GuideContext,item:CampaignTransportService,g:RemissionGuide,all:RemissionGuide[]):string {
  const providers=g.providers;const details=g.details
  if(!details||!providers?.length)return 'Configura los datos y selecciona al menos un proveedor para cada guía.'
  if(!details.shipmentDate||!details.originAddress.trim()||!details.destinationAddress.trim())return 'Completa la fecha de inicio y las direcciones de partida y llegada.'
  if([details.originUbigeo,details.destinationUbigeo].some(v=>v!==''&&!/^\d{6}$/.test(v)))return 'El ubigeo debe tener 6 dígitos cuando se registre.'
  if(!Number.isFinite(details.grossWeight)||details.grossWeight<g.kilos||!Number.isInteger(details.packageCount)||details.packageCount<0)return 'Revisa el peso bruto (no menor a los kilos de fruta) y el número entero de bultos.'
  if(new Set(providers.map(p=>p.providerId)).size!==providers.length)return 'No repitas un proveedor en la misma guía.'
  const origins=loadProviders(s,item,g);const peers=all.filter(peer=>peer.id!==g.id&&(peer.details||peer.generatedAt))
  for(const p of providers){
    const origin=origins.find(o=>o.providerId===p.providerId)
    if(!origin||!p.fincaIds.length||p.fincaIds.some(id=>!origin.fincaIds.includes(id))||!Number.isFinite(p.kilos)||p.kilos<=0)return 'Selecciona proveedores y fincas de esta entrega y registra sus kilos positivos.'
    const used=peers.flatMap(peer=>guideProviders(s,item,peer)).filter(peer=>peer.providerId===p.providerId).reduce((n,peer)=>n+peer.kilos,0)
    if(origin.availableWeight!==undefined&&used+p.kilos>origin.availableWeight+0.01)return `Los kilos de ${origin.label} superan lo registrado en la carga.`
  }
  if(Math.abs(providers.reduce((n,p)=>n+p.kilos,0)-g.kilos)>0.01)return 'Los kilos de la guía deben coincidir con la suma de sus proveedores.'
  if(peers.reduce((n,peer)=>n+peer.kilos,0)+g.kilos>loadWeight(s,item)+0.01)return 'Los kilos de las guías superan el peso real de la carga.'
  if(guideHasOrganic(s,item,g)&&details.standardText!==standardPhrases(details.standardCodes))return 'Las frases deben corresponder a las normas seleccionadas.'
  if(!guideHasOrganic(s,item,g)&&details.standardCodes.length)return 'Las normas corresponden únicamente a fruta orgánica.'
  if(details.standardCodes.some(code=>!GUIDE_STANDARDS.some(n=>n.code===code)))return 'Selecciona normas del catálogo de Exportación.'
  return ''
}

export function guideDocumentHtml(reference:string,fields:{label:string;value:string}[]){
  const escape=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
  const legacy:Record<string,string>={'Proveedores de la guía':'Proveedores de la entrega','Documentos de los proveedores':'Documento del proveedor principal','Fincas de la guía':'Fincas de la entrega','Fecha de inicio del traslado':'Inicio del viaje','Punto de llegada':'Punto de llegada de la carga','Descripción de los bienes':'Fruta / variedad'}
  const value=(label:string)=>fields.find(f=>f.label===label)?.value||fields.find(f=>f.label===legacy[label])?.value||'—'
  const card=(title:string,labels:string[])=>`<section><h2>${title}</h2><dl>${labels.map(label=>`<div class="${label==='Frases de normas'?'wide':''}"><dt>${label}</dt><dd>${escape(value(label))}</dd></div>`).join('')}</dl></section>`
  return `<!doctype html><html lang="es"><meta charset="utf-8"><title>Guía ${escape(reference)}</title><style>body{font:13px Arial;color:#183b2d;margin:32px}header{display:flex;justify-content:space-between;gap:20px}h1{font-size:19px}h2{font-size:13px;text-transform:uppercase;background:#edf3ef;padding:9px}section{break-inside:avoid;margin-top:16px}dl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}dl div{min-width:0}.wide{grid-column:1/-1}dt{font-size:10px;color:#65756b}dd{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse}td,th{padding:9px;text-align:left;border-bottom:1px solid #dbe5df}footer{font-size:10px;margin-top:24px}@media print{body{margin:8mm;font-size:10px}h1{font-size:15px}h2{padding:6px;margin:6px 0}section{margin-top:8px}dl{gap:7px}footer{font-size:8px}}</style><header><div><h1>GUÍA DE REMISIÓN</h1><b>${escape(reference)}</b></div></header>${card('Datos del traslado',['Fecha de inicio del traslado','Fecha de entrega al transportista','Peso bruto total','Unidad de medida','Número de bultos'])}${card('Datos del transportista',['Tipo de documento del transportista','Documento del transportista','Transportista','Registro MTC','Camión / placa'])}${card('Datos del conductor',['Tipo de documento del chofer','Documento del chofer','Nombre del conductor','Apellidos del conductor','Licencia de conducir'])}${card('Punto de partida',['Ubigeo de partida','Punto de partida','Código establecimiento de partida'])}${card('Punto de llegada',['Ubigeo de llegada','Punto de llegada','Código establecimiento de llegada'])}${card('Proveedores y fincas de esta guía',['Proveedores de la guía','Documentos de los proveedores','Fincas de la guía','Kilos por proveedor'])}${card('Observaciones',fields.some(f=>f.label==='Frases de normas'&&f.value)?['Normas','Frases de normas','Observaciones']:['Normas','Observaciones'])}<footer>Documento de demostración del prototipo · No representa una emisión electrónica ante SUNAT.</footer></html>`
}
