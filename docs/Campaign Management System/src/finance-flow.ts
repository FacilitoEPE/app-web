import { invoiceBillingIssue } from './sales-billing.js'
import { loadFreight, freightUsage, freightIssue } from './transport-freight.js'
import { uitIssue } from './purchase-uit.js'
import type { SharedData } from './shared-protocol.js'
import type { Invoice, PurchaseSettlement } from './finance-model.js'
import { trackedServices, sameSource } from './delivery-tracking.js'

export type LiquidationSource = {
  key:string; campaignId:string; partyId:string; party:string; reference:string;
  operationId:string; deliveryId:string; transportServiceId:string; providerId?:string;
  requirementId:string; contractId:string; fincaIds:string[]; variety:string;
  loaded:number; guided:number; received:number; price:number; currency:string;
  document:string; reasons:string[]; documentIds:string[];
}
const positive=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>0
const receipt=(d:any)=>positive(d.evaluation?.plantWeight)&&!!(d.evaluation.report||d.documents?.receptionReport)&&!!d.evaluation.result
const name=(p:any)=>p?`${p.nombres} ${p.apellidos}`:'Proveedor sin identificar'

/** Every row is one exact logistics delivery. An operation may contain many trucks. */
export function saleSources(s:SharedData):LiquidationSource[]{
  return s.logisticsDeliveries.map(d=>{
    const matches=trackedServices(s as any,d), service=matches.length===1?matches[0].service:undefined
    const source=d.sourceDelivery||service?.sourceDelivery
    const req=s.requirements.find(r=>r.id===source?.requirementId)
    const contract=req?.contratos?.find((c:any)=>c.id===source?.contractId)
    const delivery=contract?.entregas?.find((x:any)=>x.id===source?.deliveryId)
    const valid=!!(req&&contract&&delivery&&req.campaignId===d.campaignId&&req.clientId===d.clientId&&(!service||sameSource(service.sourceDelivery,source)))
    const docs=s.invoices.filter(i=>i.deliveryId===d.id)
    const used=docs.reduce((n,i)=>n+i.kilos,0)
    const received=receipt(d)?d.evaluation.plantWeight:0
    const remaining=received-used
    const guides=service?.guides?.filter(g=>g.generatedAt&&g.requirementId===source?.requirementId&&g.contractId===source?.contractId&&g.deliveryId===source?.deliveryId)||[]
    const reasons:string[]=[]
    if(!valid)reasons.push('Pendiente de vínculo con contrato y entrega')
    if(!receipt(d))reasons.push('Pendiente de recepción documentada')
    if(!positive(contract?.precio)||!contract?.moneda)reasons.push('Pendiente de precio de venta')
    if(!service?.annotation)reasons.push('Pendiente de carga identificada')
    if(!guides.length&&!d.documents?.fruitGuide)reasons.push('Pendiente de guía')
    if(received>0&&service?.annotation&&received>service.annotation.kilos+.01)reasons.push('Revisar peso recibido: supera la carga')
    if(contract&&s.invoices.filter(i=>i.requirementId===req.id&&i.contractId===contract.id).reduce((n,i)=>n+i.kilos,0)>=contract.kilos-.01)reasons.push('Contrato liquidado')
    if(received>0&&docs.length&&remaining<=.01)reasons.push('Venta liquidada')
    return {key:d.id,campaignId:d.campaignId,partyId:d.clientId||'',party:s.clients.find(c=>c.id===d.clientId)?.empresa||'Cliente sin identificar',reference:d.reference,operationId:d.sourceOperationId,deliveryId:d.id,transportServiceId:service?.id||'',requirementId:req?.id||'',contractId:contract?.id||'',fincaIds:[],variety:req?.variedad||'',loaded:service?.annotation?.kilos||d.evaluation.originWeight||0,guided:guides.reduce((n,g)=>n+g.kilos,0),received:Math.max(0,remaining),price:contract?.precio||0,currency:contract?.moneda||'',document:d.evaluation.report||d.documents?.receptionReport||'',reasons,documentIds:docs.map(i=>i.id)}
  })
}

/** Purchase quantities never inherit the total truck weight when several providers share it. */
export function purchaseSources(s:SharedData):LiquidationSource[]{
  const rows:LiquidationSource[]=[]
  for(const link of s.campaignTransporters)for(const service of link.services){
    if(!service.annotation)continue
    const annotation=service.annotation
    const providers=annotation.providers?.length?annotation.providers:service.providerId?[{providerId:service.providerId,kilos:annotation.kilos,variety:annotation.variety}]:[]
    const ds=s.logisticsDeliveries.filter(d=>d.campaignId===link.campaignId&&trackedServices(s as any,d).some(m=>m.service.id===service.id))
    const d=ds.length===1?ds[0]:undefined
    const source=service.sourceDelivery, req=s.requirements.find(r=>r.id===source?.requirementId)
    const trip=req?.contratos?.find((c:any)=>c.id===source?.contractId)?.entregas?.find((x:any)=>x.id===source?.deliveryId)
    const uniqueIds=new Set(providers.map((p:any)=>p.providerId))
    for(const p of providers){
      const fincaIds=trip?.providers?.find((x:any)=>x.providerId===p.providerId)?.fincaIds||(service.providerId===p.providerId&&service.fincaId?[service.fincaId]:[])
      const agreements=s.campaignProviders.filter(a=>a.campaignId===link.campaignId&&a.providerId===p.providerId)
      const specific=agreements.filter(a=>!fincaIds.length||(!a.fincaId&&!a.fincaIds?.length)||fincaIds.includes(a.fincaId)||(a.fincaIds||[]).some((id:string)=>fincaIds.includes(id)))
      const prices=specific
      const covered=fincaIds.every((id:string)=>prices.some(a=>(!a.fincaId&&!a.fincaIds?.length)||a.fincaId===id||a.fincaIds?.includes(id)))
      const agreement=covered&&prices.length&&prices.every(a=>a.precio===prices[0].precio&&a.moneda===prices[0].moneda)?prices[0]:undefined
      const reasons:string[]=[]
      const loaded=Number(p.kilos)||0
      if(!positive(loaded))reasons.push('Pendiente de kilos del proveedor')
      if(uniqueIds.size!==providers.length)reasons.push('Revisar proveedor repetido en la carga')
      if(!agreement||!positive(agreement.precio)||!agreement.moneda)reasons.push(prices.length>1?'Revisar precio de compra por finca':'Pendiente de precio de compra')
      if(agreement&&agreement.moneda!=='PEN')reasons.push('El precio de compra debe estar acordado en soles (PEN).')
      let received=0
      if(!d||!(receipt(d)||(positive(d.evaluation.plantWeight)&&d.driverChecklist?.receipt?.at)))received=0
      else if(providers.length===1)received=d.evaluation.plantWeight
      else {
        const purchases=(d.purchases||[]).filter((y:any)=>providers.some((p:any)=>p.providerId===y.providerId))
        const explicit=purchases.length===providers.length&&providers.every((p:any)=>purchases.filter((y:any)=>y.providerId===p.providerId).length===1)&&purchases.every((y:any)=>positive(y.recognizedQuantity))&&Math.abs(purchases.reduce((n:number,y:any)=>n+y.recognizedQuantity,0)-d.evaluation.plantWeight)<.01
        const supported=purchases.length===providers.length&&providers.every((x:any)=>purchases.filter((y:any)=>y.providerId===x.providerId).length===1)&&purchases.every((x:any)=>x.document&&['Verificación registrada','Revisada'].includes(x.reviewStatus)&&positive(x.quantity))&&Math.abs(purchases.reduce((n:number,x:any)=>n+x.quantity,0)-d.evaluation.plantWeight)<.01
        if(explicit)received=purchases.find((x:any)=>x.providerId===p.providerId)!.recognizedQuantity!
        else if(supported&&purchases.every((y:any)=>y.recognizedQuantity===undefined))received=purchases.find((x:any)=>x.providerId===p.providerId)!.quantity
        // Plant reception is informational; purchase is settled from the supplier's loaded kilos.
      }

      const docs=s.settlements.filter(x=>!x.transportLinkId&&x.transportServiceId===service.id&&x.providerId===p.providerId)
      // A legacy document without provider/service identity cannot safely be split or duplicated.
      const legacy=s.settlements.filter(x=>!x.transportLinkId&&x.operationId===service.operationId&&(!x.providerId||!x.transportServiceId))
      if(legacy.length)reasons.push('Revisar liquidación anterior sin desglose')
      if(docs.length)reasons.push('Compra liquidada')
      rows.push({key:link.id+'|'+service.id+'|'+p.providerId,campaignId:link.campaignId,partyId:p.providerId,party:name(s.providers.find(x=>x.id===p.providerId)),reference:d?.reference||service.id,operationId:service.operationId||'',deliveryId:d?.id||'',transportServiceId:service.id,providerId:p.providerId,requirementId:source?.requirementId||'',contractId:source?.contractId||'',fincaIds,variety:p.variety||annotation.variety||'',loaded,guided:service.guides?.filter((g:any)=>g.generatedAt).reduce((n:number,g:any)=>n+(g.providers?.find((x:any)=>x.providerId===p.providerId)?.kilos||0),0)||0,received,price:agreement?.precio||0,currency:agreement?.moneda||'',document:d?.evaluation.report||d?.documents?.receptionReport||'',reasons,documentIds:[...docs,...legacy].map(x=>x.id)})
    }
  }
  return rows
}

/** Used both by the form/store and the server so another device cannot bypass the source checks. */
export function validateLiquidation(s:SharedData,item:Invoice|PurchaseSettlement,kind:'Cobro'|'Pago',previous?:SharedData):string{
  const doc:any=item
  if(kind==='Cobro'){const billingIssue=invoiceBillingIssue(item as Invoice,s.invoices);if(billingIssue)return billingIssue}
  const all=kind==='Cobro'?s.invoices:s.settlements
  const prior=(previous?(kind==='Cobro'?previous.invoices:previous.settlements):all).find(x=>x.id===doc.id)
  const values=kind==='Cobro'?[doc.discount,doc.charges]:[doc.deductions,doc.additions]
  if(!doc.number?.trim()||!doc.date||((kind==='Cobro'||doc.transportLinkId)&&!doc.due)||(!doc.transportLinkId&&doc.due&&doc.due<doc.date)||!positive(doc.kilos)||!positive(doc.price)||values.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0))return 'Completa las fechas, número y montos válidos.'
  const net=doc.kilos*doc.price-values[0]+values[1]
  if(!Number.isFinite(net)||net<=0)return 'El neto de la liquidación debe ser mayor que cero.'
  if(all.some(x=>x.id!==doc.id&&x.number.trim().toLowerCase()===doc.number.trim().toLowerCase()))return 'El número de documento ya está registrado.'
  const movements=(previous||s).financialMovements.filter(m=>m.kind===kind&&m.documentId===doc.id)
  if(prior&&movements.length&&JSON.stringify(prior)!==JSON.stringify(doc))return 'El documento ya tiene movimientos; conserva su historial.'
  if(kind==='Pago'&&doc.transportLinkId){
    const link=s.campaignTransporters.find(l=>l.id===doc.transportLinkId),a=link?.paymentAgreement
    if(!a||doc.currency!==a.currency||doc.kilos!==1||doc.deductions||(doc.paidOnSettlement?doc.due!==doc.date:doc.due!==a.due))return 'La liquidación debe respetar la moneda y fecha del acuerdo de transporte.'
    const others=s.settlements.filter(x=>x.id!==doc.id&&x.transportLinkId===doc.transportLinkId)
    if(doc.transportServiceId){
      const service=link!.services.find((x:any)=>x.id===doc.transportServiceId&&x.annotation)
      if(!service||doc.operationId!==(service.operationId||''))return 'Selecciona la carga exacta del transportista.'
      const budget=Math.round(((service.annotation?.viaticos?.mobility||0)+(service.annotation?.viaticos?.supplies||0)+Number.EPSILON)*100)/100
      if(doc.transportBudgetPen!==undefined&&doc.transportBudgetPen!==budget)return 'El presupuesto referencial debe provenir de los viáticos de la carga.'
      if(others.some(x=>x.transportServiceId===doc.transportServiceId))return 'Esta carga o su acuerdo ya tiene liquidación de transporte.'
      const freightError=freightIssue(s);if(freightError)return freightError
      const assigned=loadFreight({...s,settlements:s.settlements.filter(x=>x.id!==doc.id)},link!.id,service.id)
      if(assigned===undefined||Math.abs(assigned-doc.price)>.001)return 'Asigna primero el flete de esta carga al coordinar el transporte en la campaña.'
      if(!Array.isArray(doc.transportExpenses))return 'Registra el detalle de gastos de transporte, aunque esté vacío.'
      if(new Set(doc.transportExpenses.map((e:any)=>e.id)).size!==doc.transportExpenses.length)return 'No repitas gastos.'
      let reimbursement=0
      for(const e of doc.transportExpenses){
        if(!e.id||!e.concept?.trim()||!positive(e.amount)||!positive(e.rate)||!['PEN','USD','EUR'].includes(e.currency)||typeof e.included!=='boolean'||(e.currency===doc.currency&&e.rate!==1))return 'Revisa el concepto, monto, moneda y conversión de cada gasto.'
        if(!e.included)reimbursement+=Math.round((e.amount*e.rate+Number.EPSILON)*100)/100
      }
      if(Math.abs(doc.additions-Math.round((reimbursement+Number.EPSILON)*100)/100)>.001)return 'El reembolso debe coincidir con los gastos detallados.'
    }else{
      if(others.length||doc.price!==a.total||doc.additions)return 'El acuerdo ya fue liquidado o no coincide con su total.'
    }
    return ''
  }
  const view={...s,invoices:s.invoices.filter(x=>x.id!==doc.id),settlements:s.settlements.filter(x=>x.id!==doc.id)}
  const source=kind==='Cobro'?saleSources(view).find(x=>x.deliveryId===doc.deliveryId):purchaseSources(view).find(x=>x.transportServiceId===doc.transportServiceId&&x.providerId===doc.providerId)
  if(!source)return 'Selecciona una carga y su vínculo exacto.'
  if(kind==='Cobro'){
    if(prior&&('requirementId' in prior)&&(prior.requirementId!==doc.requirementId||prior.contractId!==doc.contractId||prior.deliveryId!==doc.deliveryId||prior.transportServiceId!==doc.transportServiceId))return 'Conserva el viaje y contrato de la liquidación registrada.'
    const duplicate=view.invoices.some(i=>i.deliveryId===source.deliveryId||(source.transportServiceId&&i.transportServiceId===source.transportServiceId&&s.requirements.find(r=>r.id===i.requirementId)?.campaignId===source.campaignId))
    if(!prior&&duplicate)return 'Este viaje ya tiene una liquidación de venta. Registra su factura y los cobros en el documento existente.'
    // Historical documents retain their quantities; new sales use the entire received weight.
    if((!prior||prior.kilos!==doc.kilos)&&Math.abs(doc.kilos-source.received)>.01)return 'Liquida todo el peso recibido del viaje en un solo documento.'
  }
  if(source.reasons.length)return source.reasons.join(' · ')
  if(doc.price!==source.price||doc.currency!==source.currency)return 'El precio y la moneda deben provenir del acuerdo registrado.'
  if(kind==='Cobro'&&doc.kilos>source.received+.01)return 'Los kilos superan el peso recibido disponible.'
  if(doc.transportServiceId!==source.transportServiceId)return 'La carga seleccionada no coincide.'
  if(kind==='Cobro'){
    if(doc.requirementId!==source.requirementId||doc.contractId!==source.contractId)return 'La entrega pertenece a otro contrato.'
    const contract=s.requirements.find(r=>r.id===source.requirementId)?.contratos.find((c:any)=>c.id===source.contractId)
    if(view.invoices.filter(i=>i.requirementId===source.requirementId&&i.contractId===source.contractId).reduce((n,i)=>n+i.kilos,0)+doc.kilos>contract.kilos+.01)return 'Los kilos superan el contrato.'
  }else{
    if(doc.currency!=='PEN'||doc.deductions||doc.additions)return 'La compra a proveedores se liquida en soles, sin deducciones ni adicionales.'
    if(doc.operationId!==source.operationId||doc.deliveryId!==source.deliveryId)return 'La operación no coincide con la carga.'
    if(Math.abs(doc.kilos-source.loaded)>.01)return 'Liquida los kilos cosechados y cargados de este proveedor, tal como están registrados en la carga.'
    if((doc.deductions||doc.additions)&&!doc.adjustmentReason?.trim())return 'Indica el motivo de los ajustes.'
    const uitError=uitIssue(s,doc);if(uitError)return uitError
  }
  return ''
}
