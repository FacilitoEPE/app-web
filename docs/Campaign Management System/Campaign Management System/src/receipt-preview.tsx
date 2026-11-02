import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from 'pdfjs-dist'
import { Button } from './ui'

export function ReceiptPreview({url,name}:{url:string;name:string}){
 const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null),[image,setImage]=useState(''),[page,setPage]=useState(1),[busy,setBusy]=useState(true),[error,setError]=useState('')
 const canvas=useRef<HTMLCanvasElement>(null)
 useEffect(()=>{
  let cancelled=false,task:PDFDocumentLoadingTask|undefined,objectUrl=''
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000)
  setBusy(true);setError('');setPdf(null);setImage('');setPage(1)
  void(async()=>{
   try{
    const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('No se pudo cargar la boleta.')
    const blob=await response.blob();if(cancelled)return
    if(blob.type.startsWith('image/')){objectUrl=URL.createObjectURL(blob);setImage(objectUrl);setBusy(false);return}
    const [viewer,worker]=await Promise.all([import('pdfjs-dist'),import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
    if(cancelled)return
    viewer.GlobalWorkerOptions.workerSrc=worker.default
    task=viewer.getDocument({data:new Uint8Array(await blob.arrayBuffer())})
    const document=await task.promise;if(cancelled)return
    setPdf(document)
   }catch(e){if(!cancelled){setError(e instanceof Error?e.message:'No se pudo mostrar la boleta.');setBusy(false)}}finally{clearTimeout(timeout)}
  })()
  return()=>{cancelled=true;controller.abort();clearTimeout(timeout);if(objectUrl)URL.revokeObjectURL(objectUrl);void task?.destroy()}
 },[url])
 useEffect(()=>{
  if(!pdf||!canvas.current)return
  let cancelled=false,render:ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']>|undefined
  setBusy(true)
  void(async()=>{
   try{
    const sheet=await pdf.getPage(page);if(cancelled||!canvas.current)return
    const viewport=sheet.getViewport({scale:1.5}),element=canvas.current
    element.width=viewport.width;element.height=viewport.height
    render=sheet.render({canvas:element,viewport});await render.promise
    if(!cancelled)setBusy(false)
   }catch(e){if(!cancelled){setError('No se pudo dibujar esta página. Puedes abrir el documento en otra pestaña.');setBusy(false)}}
  })()
  return()=>{cancelled=true;render?.cancel()}
 },[pdf,page])
 return <div className="rounded-xl border border-line bg-canvas p-3"><div aria-live="polite">{busy&&<p className="mb-3 text-sm text-ink-soft">Cargando boleta…</p>}{error&&<p role="alert" className="mb-3 text-sm text-danger">{error}</p>}</div>
  {pdf&&<div className="mb-3 flex items-center justify-between gap-2"><Button variant="outline" disabled={page===1||busy} onClick={()=>setPage(p=>p-1)}>← Anterior</Button><span className="text-sm">Página {page} de {pdf.numPages}</span><Button variant="outline" disabled={page===pdf.numPages||busy} onClick={()=>setPage(p=>p+1)}>Siguiente →</Button></div>}
  {image?<img className="mx-auto max-h-[65vh] max-w-full rounded-lg object-contain" src={image} alt={'Boleta '+name} onError={()=>setError('No se pudo mostrar la imagen.')}/>:<canvas ref={canvas} role="img" aria-label={'Boleta '+name+' · Página '+page} className={'mx-auto h-auto w-full rounded-lg bg-white shadow-sm '+(!pdf?'hidden':'')}/>}
 </div>
}
