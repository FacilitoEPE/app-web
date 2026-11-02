import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {mkdir,writeFile} from 'node:fs/promises'

const server=await createServer({configFile:false,plugins:[react()],server:{middlewareMode:true},appType:'custom'})
try{
  const {syntheticData:s,seedPayments}=await server.ssrLoadModule('/src/store.tsx')
  const data={transportRequests:[],campaigns:s.campaigns,providers:s.providers,exams:s.exams,campaignProviders:s.participations,interviews:s.interviews,certifications:s.certifications,requirements:s.requirements,qualityOperations:s.operations,exportMtdRecords:s.exportMtdRecords,logisticsDeliveries:s.logistics,clients:s.clients,transporters:s.transporters,campaignTransporters:s.campaignTransporters,invoices:s.invoices,settlements:s.settlements,financialMovements:s.movements,payments:seedPayments}
  await mkdir('server',{recursive:true})
  await writeFile('server/shared-seed.json',JSON.stringify(data,null,2))
  console.log('Shared seed generated from existing demo records.')
}finally{await server.close()}
