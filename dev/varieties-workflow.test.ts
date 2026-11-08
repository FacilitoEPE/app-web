import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { createV1MockMiddleware } from './v1-mock'
import { apiClient } from '@/shared/api/client'
import { contratoVentaV1, entregaProgramadaV1 } from '@/modules/commercial-planning/api/v1.api'
import { clienteNegocioCampanaXFrutaDerivadaV1 } from '@/modules/campaigns/api/v1.api'

let server: Server, original: string|undefined, contractId: number
const rows=(a:number,b?:number)=>[{frutaDerivadaId:1,kilos:a},...(b===undefined?[]:[{frutaDerivadaId:2,kilos:b}])]
beforeEach(async()=>{
  const middleware=createV1MockMiddleware(path.resolve(import.meta.dirname,'..'))
  server=createServer((req,res)=>middleware(req,res,()=>{res.statusCode=404;res.end()}))
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
  original=apiClient.defaults.baseURL
  apiClient.defaults.baseURL=`http://127.0.0.1:${(server.address() as AddressInfo).port}/mock-api/`
  await clienteNegocioCampanaXFrutaDerivadaV1(1).create({frutaDerivadaId:2})
  const contract=await contratoVentaV1(1).create({fecha:'2026-11-05',canal:'EXPORTACION',moneda:'USD',variedades:rows(10000,5000)})
  contractId=contract.contratoVentaId
})
afterEach(async()=>{apiClient.defaults.baseURL=original;await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()))})
const balances=async()=> (await contratoVentaV1(1).get(contractId,true)).saldosVariedades
describe('desglose persistido con el cliente HTTP y mock V1',()=>{
  it('recupera, edita sin doble descuento, elimina filas y libera la entrega',async()=>{
    const resource=entregaProgramadaV1(contractId)
    const delivery=await resource.create({fecha:'2026-11-05',destino:'Paita',variedades:rows(1000,200)})
    expect(await balances()).toMatchObject([{kilosDisponibles:9000},{kilosDisponibles:4800}])
    await resource.update(delivery.entregaProgramadaId,{variedades:rows(2000,200)})
    await resource.update(delivery.entregaProgramadaId,{variedades:rows(2000,200)})
    expect(await balances()).toMatchObject([{kilosDisponibles:8000},{kilosDisponibles:4800}])
    expect((await resource.get(delivery.entregaProgramadaId,true)).variedades).toEqual(rows(2000,200))
    const excluded=await apiClient.get(`/api/requerimientos/1/contratos/${contractId}`,{params:{excluirEntregaId:delivery.entregaProgramadaId}})
    expect(excluded.data.saldosVariedades).toMatchObject([{kilosDisponibles:10000},{kilosDisponibles:5000}])
    await resource.update(delivery.entregaProgramadaId,{variedades:rows(500)})
    expect(await balances()).toMatchObject([{kilosDisponibles:9500},{kilosDisponibles:5000}])
    await resource.remove(delivery.entregaProgramadaId)
    expect(await balances()).toMatchObject([{kilosDisponibles:10000},{kilosDisponibles:5000}])
  })
  it('rechaza duplicados, referencias, decimales, exceso de B y conserva lo guardado',async()=>{
    const resource=entregaProgramadaV1(contractId)
    const delivery=await resource.create({fecha:'2026-11-05',destino:'Paita',variedades:rows(1000,200)})
    await expect(resource.update(delivery.entregaProgramadaId,{variedades:rows(1,5001)})).rejects.toMatchObject({code:'VARIETY_BALANCE_EXCEEDED'})
    for(const variedades of [[...rows(1),...rows(2)],rows(0.0001),[{frutaDerivadaId:99999,kilos:1}]]) await expect(resource.update(delivery.entregaProgramadaId,{variedades})).rejects.toThrow()
    await expect(contratoVentaV1(1).update(contractId,{variedades:rows(999,5000)})).rejects.toMatchObject({code:'CONTRACT_VARIETY_IN_USE'})
    await expect(contratoVentaV1(1).update(contractId,{variedades:rows(10000)})).rejects.toMatchObject({code:'CONTRACT_VARIETY_IN_USE'})
    expect((await resource.get(delivery.entregaProgramadaId,true)).variedades).toEqual(rows(1000,200))
  })
  it('serializa dos solicitudes que compiten por el cupo',async()=>{
    const resource=entregaProgramadaV1(contractId)
    const body={fecha:'2026-11-05',destino:'Paita',variedades:rows(6000)}
    const results=await Promise.allSettled([resource.create(body),resource.create(body)])
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1)
    expect(await balances()).toMatchObject([{kilosDisponibles:4000},{kilosDisponibles:5000}])
  })
})
