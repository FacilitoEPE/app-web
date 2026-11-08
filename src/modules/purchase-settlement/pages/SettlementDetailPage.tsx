import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileSpreadsheet, Truck } from 'lucide-react';
import PageHeader from '@/shared/layout/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { InfoField, SummaryBar } from '@/shared/components/InfoField';
import StatusBadge from '@/shared/components/StatusBadge';
import FileDropzone from '@/shared/components/FileDropzone';
import FilePreviewModal from '@/shared/components/FilePreviewModal';
import type { FileSource } from '@/shared/utils/fileSource';
import TableCard from '@/shared/components/TableCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { TABLE_HEAD_BG } from '@/shared/components/DataTableRow';
import { formatDisplayDate, formatKg } from '@/shared/utils/format';
import { usePurchaseSettlementState } from '@/modules/purchase-settlement/purchaseSettlement.store';
import { carrierBalance, carrierPaid, carrierTotal, providerBalance, providerPaid } from '@/modules/purchase-settlement/settlementOverview.utils';

const money = (amount: number, currency?: string) => `${currency === 'USD' ? 'US$' : 'S/'} ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

export default function SettlementDetailPage() {
    const { campaignId, loadId, section, entryId } = useParams();
    const navigate = useNavigate();
    const [preview, setPreview] = useState<{ open: boolean; file: FileSource | null }>({ open: false, file: null });
    const { loads } = usePurchaseSettlementState();
    const load = loads.find(row => row.id === loadId && row.campaniaId === Number(campaignId));
    const isCarrier = section === 'transportista';
    const provider = isCarrier ? undefined : load?.proveedores.find(row => row.id === entryId);
    const carrier = isCarrier ? load?.transporte : undefined;
    const managementPath = `/liquidacion-compra/${campaignId}/cargas/${loadId}/${isCarrier ? 'transportista' : 'proveedores'}`;

    if (!load || (!provider && !carrier)) return <div className="px-4 py-8 sm:px-8 lg:px-14"><p className="text-ink-muted">No se encontró la liquidación solicitada.</p><Button className="mt-4" variant="outline" onClick={() => navigate(managementPath)}>Volver a la gestión</Button></div>;

    const name = provider?.proveedorNombre ?? carrier?.transportista ?? '';
    const status = provider?.estado ?? carrier?.estado ?? 'Por liquidar';
    const currency = provider?.moneda ?? carrier?.moneda;
    const total = provider?.total ?? (carrier ? carrierTotal(carrier) : 0);
    const paid = provider ? providerPaid(provider) : carrier ? carrierPaid(carrier) : 0;
    const balance = provider ? providerBalance(provider) : carrier ? carrierBalance(carrier) : 0;
    const payments = provider?.pagos ?? carrier?.pagos ?? [];
    const file = provider?.archivoLiquidacion ?? carrier?.archivoLiquidacion;
    const number = provider?.numeroLiquidacion ?? carrier?.numeroLiquidacion ?? '';
    const date = provider?.fechaLiquidacion ?? carrier?.fechaLiquidacion ?? '';

    return <div className="px-4 py-5 sm:px-8 lg:px-14">
        <PageHeader
            icon={isCarrier ? <Truck size={24} /> : <FileSpreadsheet size={24} />}
            title={isCarrier ? 'Detalle de liquidación de transporte' : 'Detalle de liquidación de compra'}
            description={`${load.campaniaNombre} · ${load.codigo} · ${name}`}
            action={<Button variant="outline" size="xl" onClick={() => navigate(managementPath)}><ArrowLeft size={18} /> Volver a la gestión</Button>}
        />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,1fr)]">
            <Card className="rounded-2xl border-border shadow-card"><CardContent className="space-y-5 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-brand">{isCarrier ? 'Transportista' : 'Proveedor y finca'}</p><h2 className="text-xl font-extrabold text-ink">{name}</h2><p className="text-sm text-ink-muted">{provider?.fincaNombre ?? `${carrier?.placa} · ${carrier?.chofer}`}</p></div><StatusBadge status={status} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <InfoField label="Número de liquidación" value={number || 'Pendiente de emitir'} />
                    <InfoField label="Fecha" value={date ? formatDisplayDate(date) : 'Pendiente'} />
                    {provider ? <><InfoField label="Kilos cargados" value={`${formatKg(provider.kilosCargados)} kg`} /><InfoField label="Kilos reconocidos" value={provider.kilosReconocidos == null ? 'Pendiente de recepción' : `${formatKg(provider.kilosReconocidos)} kg`} /><InfoField label="Precio acordado por kg" value={money(provider.precioKg, currency)} /><InfoField label="Persona liquidada" value={provider.personaLiquidadaNombre ? `${provider.personaLiquidadaNombre} · ${provider.personaLiquidadaDocumento}` : 'Pendiente de seleccionar'} /><InfoField label="Vínculo" value={provider.personaLiquidadaVinculo || '—'} /><InfoField label="Control 75 UIT" value={provider.confirmacionExcesoUit ? 'Verificación confirmada' : 'Sin confirmación requerida'} /></> : <><InfoField label="Flete de la carga" value={money(carrier?.fleteCarga ?? 0, currency)} /><InfoField label="Viáticos referenciales" value={money((carrier?.viaticosMovilidad ?? 0) + (carrier?.viaticosInsumos ?? 0), currency)} /><InfoField label="Placa y chofer" value={`${carrier?.placa} · ${carrier?.chofer}`} /><InfoField label="Licencia" value={carrier?.licencia || '—'} /><InfoField label="Acuerdo de campaña" value={money(carrier?.totalContratadoCampania ?? 0, currency)} /></>}
                    <InfoField label="Observaciones" value={provider?.observaciones || carrier?.observaciones || '—'} />
                </div>
                {file && <FileDropzone label="Documento de liquidación" file={file} onChange={() => {}} readOnly variant="horizontal" />}
            </CardContent></Card>
            <div className="space-y-4"><Card className="rounded-2xl border-border shadow-card"><CardContent className="p-5 sm:p-6"><SummaryBar items={[{ label: status === 'Por liquidar' ? 'Total previsto' : 'Total liquidado', value: money(total, currency) }, { label: 'Pagado', value: money(paid, currency), tone: 'brand' }, { label: 'Saldo', value: status === 'Por liquidar' ? 'Pendiente de liquidar' : money(balance, currency), tone: balance > 0 ? 'highlight' : 'brand' }]} /></CardContent></Card>
                {carrier && <Card className="rounded-2xl border-border shadow-card"><CardContent className="space-y-3 p-5 sm:p-6"><h2 className="font-bold text-ink">Gastos de ruta</h2>{carrier.gastosReales.length ? carrier.gastosReales.map(expense => <div key={expense.id} className="flex justify-between gap-3 border-t border-border pt-3 text-sm"><span>{expense.concepto}</span><strong>{money(expense.monto, currency)}</strong></div>) : <p className="text-sm text-ink-muted">Se aplican los viáticos referenciales mientras no se registren gastos reales.</p>}</CardContent></Card>}
            </div>
        </div>
        <TableCard className="mt-5" icon={<FileSpreadsheet size={22} />} title="Historial de pagos" description="Desembolsos y adelantos aplicados a esta liquidación." isEmpty={payments.length === 0} emptyTitle="Sin pagos registrados" emptyDescription="El historial aparecerá cuando se registre un pago." page={1} pageCount={1} onPageChange={() => {}}>
            <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                    <TableHeader className={TABLE_HEAD_BG}>
                        <TableRow>
                            <TableHead>Fecha</TableHead><TableHead>Modo</TableHead><TableHead>Medio</TableHead>
                            <TableHead>Referencia</TableHead><TableHead className="text-right">Importe</TableHead>
                            <TableHead>Comprobante</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments.map(payment => <TableRow key={payment.id}>
                            <TableCell>{formatDisplayDate(payment.fecha)}</TableCell>
                            <TableCell>{payment.modo}</TableCell><TableCell>{payment.medio}</TableCell>
                            <TableCell>{payment.referencia || '—'}</TableCell>
                            <TableCell className="text-right font-semibold">{money(payment.importe, currency)}</TableCell>
                            <TableCell>{payment.evidencia ? (
                                <Button variant="link" className="h-auto max-w-full whitespace-normal px-0 text-left wrap-anywhere text-brand"
                                    onClick={() => setPreview({ open: true, file: payment.evidencia ?? null })}>
                                    {payment.evidencia.name}
                                </Button>
                            ) : 'Sin comprobante'}</TableCell>
                        </TableRow>)}
                    </TableBody>
                </Table>
            </div>
        </TableCard>
        <FilePreviewModal open={preview.open} file={preview.file} onOpenChange={(open) => setPreview(current => ({ ...current, open }))} />
    </div>;
}
