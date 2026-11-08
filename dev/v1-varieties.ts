import { ApiV1Error, type Database, type Row } from './v1-contract.ts'

const fail = (code: string, message: string): never => { throw new ApiV1Error(409,code,message,{variedades:message}) }
const milli = (value: unknown) => Math.round(Number(value)*1000)
const lines = (row: Row) => (row.variedades ?? []) as Array<{frutaDerivadaId:number;kilos:number}>
const complete = (row: Row) => row.desgloseConfirmado === true && lines(row).length > 0 && lines(row).reduce((s,v)=>s+milli(v.kilos),0) === milli(row.kilosProgramados)

export function mockVarietyBalances(db: Database, contractId: unknown, excludeId?: number) {
  const contract = db.contrato_venta.find(c=>c.contratoVentaId===contractId)!
  if (excludeId && !db.entrega_programada.some(e=>e.entregaProgramadaId===excludeId&&e.contratoVentaId===contractId)) throw new ApiV1Error(404,'NOT_FOUND','La entrega excluida no pertenece al contrato.')
  return lines(contract).map(line=>{
    const used=db.entrega_programada.filter(e=>e.contratoVentaId===contractId&&e.entregaProgramadaId!==excludeId&&complete(e)).flatMap(lines).filter(v=>v.frutaDerivadaId===line.frutaDerivadaId).reduce((s,v)=>s+milli(v.kilos),0)
    return {frutaDerivadaId:line.frutaDerivadaId,kilosAcordados:line.kilos,kilosProgramados:used/1000,kilosDisponibles:(milli(line.kilos)-used)/1000}
  })
}

export function prepareMockVarieties(db: Database, table: string, row: Row, current?: Row) {
  if (!['contrato_venta','entrega_programada'].includes(table)) return
  const values=lines(row), seen=new Set<number>()
  if (!values.length) fail('VARIETIES_REQUIRED','Agrega al menos una variedad.')
  for(const line of values){
    if(seen.has(line.frutaDerivadaId)) fail('INVALID_VARIETY','No repitas variedades.')
    seen.add(line.frutaDerivadaId)
  }
  const total=values.reduce((s,v)=>s+milli(v.kilos),0)
  if(total>99999999999999) fail('QUANTITY_OVERFLOW','El total excede la capacidad del contrato.')
  if(table==='contrato_venta'){
    const requirement=db.cliente_negocio_campana.find(r=>r.clienteNegocioCampanaId===row.clienteNegocioCampanaId)!
    const campaign=db.campana.find(c=>c.campaniaId===requirement.campaniaId)!
    for(const line of values){
      if(!db.fruta_derivada.some(v=>v.frutaDerivadaId===line.frutaDerivadaId&&v.frutaId===campaign.frutaId)||!db.cliente_negocio_campana_x_fruta_derivada.some(v=>v.clienteNegocioCampanaId===row.clienteNegocioCampanaId&&v.frutaDerivadaId===line.frutaDerivadaId)) fail('VARIETY_CONTEXT_MISMATCH','La variedad no pertenece al requerimiento y fruta de campaña.')
    }
    if(current) for(const balance of mockVarietyBalances(db,row.contratoVentaId)) {
      const amount=values.find(v=>v.frutaDerivadaId===balance.frutaDerivadaId)?.kilos??0
      if(milli(amount)<milli(balance.kilosProgramados)) fail('CONTRACT_VARIETY_IN_USE','La variedad ya tiene kilos programados.')
    }
    row.kilosAcordados=total/1000
  }else{
    const contract=db.contrato_venta.find(c=>c.contratoVentaId===row.contratoVentaId)!
    if(contract.desglosePendiente) fail('CONTRACT_BREAKDOWN_REQUIRED','Completa primero el contrato.')
    const balances=mockVarietyBalances(db,row.contratoVentaId,current?.entregaProgramadaId as number|undefined)
    for(const line of values){
      const balance=balances.find(b=>b.frutaDerivadaId===line.frutaDerivadaId)
      if(!balance) fail('VARIETY_NOT_AGREED','La variedad no está acordada.')
      if(milli(line.kilos)>milli(balance!.kilosDisponibles)) fail('VARIETY_BALANCE_EXCEEDED','La cantidad supera el saldo de esta variedad.')
    }
    row.kilosProgramados=total/1000
  }
  row.desglosePendiente=false
  row.desgloseConfirmado=true
}

export function persistMockVarieties(db: Database, table: string, row: Row) {
  if(!['contrato_venta','entrega_programada'].includes(table)) return
  const contract=table==='contrato_venta', target=contract?'contrato_x_fruta_derivada':'entrega_x_fruta_derivada', parent=contract?'contratoVentaId':'entregaProgramadaId', pk=contract?'contratoXFrutaDerivadaId':'entregaXFrutaDerivadaId', kilos=contract?'kilosAcordados':'kilosProgramados'
  let next=Math.max(0,...db[target].map(v=>Number(v[pk])))+1
  db[target]=db[target].filter(v=>v[parent]!==row[parent])
  for(const line of lines(row)) db[target].push({[pk]:next++,[parent]:row[parent],frutaDerivadaId:line.frutaDerivadaId,[kilos]:line.kilos,createdAt:row.createdAt,updatedAt:row.updatedAt})
}
