const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function documentUrl(reference: string | undefined): string {
  if (!reference?.startsWith('/api/prototype-document?')) return ''
  try { const url=new URL(reference,'https://prototype.local'); return url.pathname==='/api/prototype-document' && idPattern.test(url.searchParams.get('id')||'') ? url.pathname+url.search : '' } catch { return '' }
}
export function documentName(reference: string | undefined): string {
  if (!reference) return ''
  if (!documentUrl(reference)) return reference
  return new URL(reference,'https://prototype.local').searchParams.get('name') || 'Documento adjunto'
}
export async function uploadStoredDocument(file: File): Promise<string> {
  if (!['application/pdf','image/png','image/jpeg'].includes(file.type) || file.size<=0 || file.size>2097152) throw Error('Selecciona un PDF, PNG o JPG de hasta 2 MB.')
  const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error('No se pudo leer el archivo.'));reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.readAsDataURL(file)})
  const response=await fetch('/api/prototype-document',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,mime:file.type,base64}),signal:AbortSignal.timeout(30000)})
  const body=await response.json()
  if(!response.ok || !idPattern.test(body.id||''))throw Error(body.error||'No se pudo guardar el documento. Reintenta la carga.')
  return '/api/prototype-document?id='+encodeURIComponent(body.id)+'&name='+encodeURIComponent(body.name||file.name)
}
export async function openStoredDocument(reference: string | undefined, download=false) {
  const url=documentUrl(reference)
  if(!url)throw Error('El registro anterior solo conserva el nombre. Adjunta el archivo para poder consultarlo.')
  if(!download){window.open(url,'_blank','noopener,noreferrer');return}
  const response=await fetch(url);if(!response.ok)throw Error('No se pudo descargar el documento.')
  const objectUrl=URL.createObjectURL(await response.blob()),link=document.createElement('a')
  link.href=objectUrl;link.download=documentName(reference);link.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000)
}
