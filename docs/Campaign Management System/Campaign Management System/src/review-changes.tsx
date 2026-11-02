import { createContext, useContext, useState, type ReactNode } from 'react'

const ReviewContext = createContext({ visible: true, toggle: () => {} })
export function ReviewChangesProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true)
  return <ReviewContext.Provider value={{ visible, toggle: () => setVisible(v => !v) }}>{children}</ReviewContext.Provider>
}
export function ChangeMark({ priority, code, children }: { priority: 'alta' | 'media'; code: string; children: ReactNode }) {
  const { visible } = useContext(ReviewContext)
  if (!visible) return null
  return <span data-change-priority={priority} className={`inline-flex flex-wrap items-center gap-2 rounded-md border px-2 py-1 text-xs ${priority === 'alta' ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-blue-300 bg-blue-50 text-blue-950'}`}>
    <b>{priority === 'alta' ? 'Alta' : 'Media'} · {code}</b><span style={{ textDecoration: 'underline', textDecorationStyle: priority === 'alta' ? 'solid' : 'dashed', textUnderlineOffset: 3 }}>{children}</span>
  </span>
}
const changes: Record<string, { priority: 'alta' | 'media'; code: string; text: string }[]> = {
  comercial: [{ priority: 'alta', code: 'R02', text: 'Entregas y orígenes con documentos financieros protegidos frente a cambios o eliminación' }, { priority: 'alta', code: 'H02', text: 'Validación de clientes y documentos duplicados' }, { priority: 'alta', code: 'H04–H05', text: 'Kilos programados dentro del contrato; precio y moneda protegidos tras facturar' }],
  campanas: [{ priority: 'alta', code: 'R01 / R03', text: 'Cierre del chofer obligatorio; certificaciones con pagos conservadas' }, { priority: 'alta', code: 'H02 / H09', text: 'Validación de campañas, pagos y ampliaciones de certificación' }, { priority: 'media', code: 'H12', text: 'Cierre manual con revisión de pendientes y conservación del historial' }],
  proveedores: [{ priority: 'alta', code: 'H02 / H11', text: 'Validación del proveedor y almacenamiento de nuevos adjuntos' }],
  transporte: [{ priority: 'alta', code: 'R02', text: 'Servicio, transportista, camión y chofer conservados si la carga tiene documentos financieros' }, { priority: 'alta', code: 'H02–H03', text: 'Validación de transportistas, vehículos y choferes; solicitudes y cotizaciones persistentes' }, { priority: 'media', code: 'H15', text: 'Accesos a vehículos y choferes dentro de la ficha' }],
  logistica: [{ priority: 'alta', code: 'R02', text: 'Origen y cierres de recepciones con documentos financieros protegidos' }, { priority: 'alta', code: 'H06 / H08', text: 'Peso facturado protegido; cierres con requisitos documentales' }, { priority: 'media', code: 'H13', text: 'Datos anteriores incompletos identificados sin sustituirlos por datos de facturas' }],
  facturacion: [{ priority: 'alta', code: 'R02', text: 'Factura, entrega y servicio mantienen sus vínculos originales' }, { priority: 'alta', code: 'H05–H07', text: 'Protección del contrato, recepción, facturas y cobros registrados' }, { priority: 'media', code: 'H13–H14', text: 'Advertencia de respaldos incompletos y facturas emitidas externamente' }],
  liquidacion: [{ priority: 'alta', code: 'R02', text: 'Liquidaciones conservan sus vínculos con carga y proveedor' }, { priority: 'alta', code: 'H07 / H10', text: 'Conservación de liquidaciones y pagos; pago inmediato de transporte corregido' }],
  calidad: [{ priority: 'alta', code: 'H11', text: 'Nuevos adjuntos almacenados con consulta del original' }],
}
export function ReviewToolbar() {
  const { visible, toggle } = useContext(ReviewContext)
  return <div className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-5 py-2 text-xs text-ink-soft">
    <button type="button" aria-pressed={visible} onClick={toggle} className="rounded border border-line px-3 py-2 font-semibold text-forest">{visible ? 'Ocultar marcadores de cambios' : 'Mostrar marcadores de cambios'}</button>
    {visible && <span><span className="font-semibold text-amber-900">Alta: subrayado continuo</span> · <span className="font-semibold text-blue-900">Media: subrayado discontinuo</span>. Los marcadores no cambian los registros.</span>}
  </div>
}
export function ModuleChangeNotes({ module }: { module: string }) {
  const { visible } = useContext(ReviewContext)
  if (!visible) return null
  return <aside aria-label="Cambios realizados en este módulo" className="mb-5 flex flex-wrap gap-2">{(changes[module] || []).map(item => <ChangeMark key={item.code} priority={item.priority} code={item.code}>{item.text}</ChangeMark>)}</aside>
}

export function ModalChangeNote({ title }: { title: string }) {
  const code = /contrato|entrega comercial|programar entrega/i.test(title) ? 'H04–H05' : /pago.*certifica|ampli.*certifica/i.test(title) ? 'H09' : /cliente|proveedor|transportista|vehículo|chofer|campaña/i.test(title) && /registrar|crear|nuevo|nueva|editar/i.test(title) && !/factura|liquidación|cierre/i.test(title) ? 'H02' : ''
  return code ? <div className="mb-4"><ChangeMark priority="alta" code={code}>{code === 'H02' ? 'Campos obligatorios, formatos y duplicados comprobados al guardar' : code === 'H09' ? 'Importes positivos, saldo disponible e historial protegidos' : 'Programación y condiciones del contrato comprobadas al guardar'}</ChangeMark></div> : null
}
