import { ReceiptPreview } from './receipt-preview'
import { useState } from 'react'
import { useStore } from './store'
import { Button, Modal } from './ui'

export function AgreementReceipt({linkId,editable=false}:{linkId:string;editable?:boolean}){
 const s=useStore(),link=s.campaignTransporters.find(l=>l.id===linkId),a=link?.paymentAgreement
 const [preview,setPreview]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const upload=async(file:File)=>{
  if(!editable||!a||a.type!=='Adelanto')return
  setError('')
  if(!['application/pdf','image/jpeg','image/png'].includes(file.type)||file.size>2097152){setError('Elige un PDF, JPG o PNG de hasta 2 MB.');return}
  setBusy(true)
  try{
   const base64=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('No se pudo leer el archivo.'));r.readAsDataURL(file)})
   const response=await fetch('/api/prototype-document',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,mime:file.type,base64})})
   const body=await response.json();if(!response.ok)throw Error(body.error||'No se pudo guardar la boleta.')
   if(!s.saveTransportPaymentAgreement(linkId,{...a,receipt:file.name,receiptAttachmentId:body.id}))throw Error('No se pudo vincular la boleta al acuerdo.')
   s.toast('Boleta guardada y disponible para consulta')
  }catch(e){setError(e instanceof Error?e.message:'No se pudo subir la boleta.')}finally{setBusy(false)}
 }
 if(a?.type!=='Adelanto')return null
 return <section className="rounded-xl border border-line bg-surface p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-sm font-semibold">Boleta del adelanto</h4><p className="mt-1 text-xs text-ink-soft">{a?.receipt||'Sin documento adjunto'}</p></div><div className="flex flex-wrap gap-2">{a?.receiptAttachmentId&&<Button variant="outline" onClick={()=>setPreview(true)}>Ver boleta</Button>}{editable&&a&&<label className="cursor-pointer rounded-lg border border-line px-3 py-2 text-sm font-medium">{busy?'Subiendo…':a.receiptAttachmentId?'Reemplazar boleta':'Subir boleta'}<input aria-label="Subir boleta del adelanto" className="sr-only" type="file" accept="application/pdf,image/png,image/jpeg" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.target.value=''}}/></label>}</div></div>
 {!a&&<p className="mt-2 text-xs text-ink-soft">Guarda primero el acuerdo para adjuntar la boleta.</p>}{editable&&a?.receipt&&!a.receiptAttachmentId&&<p className="mt-2 text-xs text-ink-soft">El registro anterior guardó solo el nombre. Sube el archivo para poder visualizarlo.</p>}{!editable&&!a.receiptAttachmentId&&<p className="mt-2 text-xs text-ink-soft">El archivo del adelanto no está disponible en este registro anterior.</p>}{error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
 {preview&&a?.receiptAttachmentId&&<Modal open wide title="Boleta del adelanto" onClose={()=>setPreview(false)} footer={<><a className="text-sm font-semibold text-forest" href={'/api/prototype-document?id='+encodeURIComponent(a.receiptAttachmentId)} target="_blank" rel="noreferrer">Abrir documento ↗</a><Button onClick={()=>setPreview(false)}>Cerrar</Button></>}><ReceiptPreview name={a.receipt} url={'/api/prototype-document?id='+encodeURIComponent(a.receiptAttachmentId)}/></Modal>}
 </section>
}
