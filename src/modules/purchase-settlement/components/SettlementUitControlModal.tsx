import { usesV1 } from '@/shared/api/data-contract';
import { formatMoney } from '@/shared/utils/format';
import { useMemo, useState } from "react";
import { Scale, ShieldAlert, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import { SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import {
    UIT_LIMITE_SOLES,
    UIT_LIMITE_UNIDADES,
    UIT_VALOR_2026,
    type SettlementLoad,
} from "@/modules/purchase-settlement/purchaseSettlement.models";

interface SettlementUitControlModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    loads: SettlementLoad[];
    tipoCambioUit: number;
    onChangeExchangeRate: (rate: number) => void;
}

export default function SettlementUitControlModal({
    open,
    onOpenChange,
    loads,
    tipoCambioUit,
    onChangeExchangeRate,
}: SettlementUitControlModalProps) {
    const [search, setSearch] = useState("");
    const [rateInput, setRateInput] = useState(String(tipoCambioUit));

    const personRows = useMemo(() => {
        const byPerson = new Map<
            string,
            {
                id: string;
                nombre: string;
                documento: string;
                vinculo: string;
                proveedorOrigen: string;
                acumuladoPen: number;
            }
        >();

        for (const load of loads) {
            for (const prov of load.proveedores) {
                for (const p of prov.personasVinculadas) {
                    const extraCurrent =
                        !usesV1() && prov.personaLiquidadaId === p.id && prov.estado !== "Por liquidar"
                            ? prov.total
                            : 0;
                    const existing = byPerson.get(p.numeroDocumento);
                    if (existing) {
                        existing.acumuladoPen = Math.max(
                            existing.acumuladoPen,
                            p.acumuladoAnualPen + extraCurrent,
                        );
                    } else {
                        byPerson.set(p.numeroDocumento, {
                            id: p.id,
                            nombre: `${p.nombres} ${p.apellidos}`,
                            documento: `${p.tipoDocumento} ${p.numeroDocumento}`,
                            vinculo: p.vinculo,
                            proveedorOrigen: prov.proveedorNombre,
                            acumuladoPen: p.acumuladoAnualPen + extraCurrent,
                        });
                    }
                }
            }
        }

        const q = search.trim().toLowerCase();
        return [...byPerson.values()].filter((row) =>
            !q
                ? true
                : `${row.nombre} ${row.documento} ${row.proveedorOrigen}`
                      .toLowerCase()
                      .includes(q),
        );
    }, [loads, search]);

    if (!(UIT_VALOR_2026 > 0 && UIT_LIMITE_UNIDADES > 0)) return (
        <AppModal open={open} onOpenChange={onOpenChange} title="Control UIT" icon={<Scale size={22} strokeWidth={2.2} />} size="md" footer={<Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>}>
            <p role="status" className="text-sm text-muted-foreground">Los parámetros UIT no están disponibles. Configúralos en el backend antes de calcular límites o saldos.</p>
        </AppModal>
    );

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Scale size={22} strokeWidth={2.2} />}
            title={`Control UIT por proveedor · Límite anual ${UIT_LIMITE_UNIDADES > 0 ? `${UIT_LIMITE_UNIDADES} UIT` : "pendiente de parámetros"}`}
            description="Control tributario SUNAT para emisión de Liquidaciones de Compra electrónicas por persona natural."
            size="2xl"
            footer={
                <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                    <X size={18} strokeWidth={2.5} /> Cerrar
                </Button>
            }
        >
            <div className="flex flex-col gap-6">
                <SummaryBar
                    items={[
                        { label: "Valor UIT 2026", value: `S/ ${UIT_VALOR_2026.toLocaleString("es-PE")}` },
                        {
                            label: `Límite máximo (${UIT_LIMITE_UNIDADES} UIT)`,
                            value: `S/ ${UIT_LIMITE_SOLES.toLocaleString("es-PE")}`,
                            tone: "brand",
                        },
                        {
                            label: "Tipo de cambio UIT",
                            value: `S/ ${tipoCambioUit.toFixed(2)} / USD`,
                            tone: "highlight",
                        },
                    ]}
                />

                <ModalSection title="Parámetros de búsqueda y tipo de cambio referencial">
                    <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-6">
                        <InputField
                            id="uit-search"
                            label="Filtrar por proveedor o persona vinculada"
                            placeholder="Nombre, DNI o productor..."
                            value={search}
                            onChange={setSearch}
                            className="sm:col-span-4"
                        />
                        <InputField
                            id="uit-tc"
                            label="Tipo de cambio UIT (S/)"
                            step="0.01"
                            min={1}
                            value={rateInput}
                            onChange={(v) => {
                                setRateInput(v);
                                const num = Number(v);
                                if (num > 0) onChangeExchangeRate(num);
                            }}
                            className="sm:col-span-2"
                        />
                    </div>
                </ModalSection>

                <ModalSection
                    title="Acumulado anual por persona (Productores y personas vinculadas)"
                    aside={`${personRows.length} persona(s)`}
                >
                    <div className="flex flex-col gap-3.5">
                        {personRows.map((row) => {
                            const usedUit = row.acumuladoPen / UIT_VALOR_2026;
                            const pct = Math.min(100, (row.acumuladoPen / UIT_LIMITE_SOLES) * 100);
                            const disponiblePen = Math.max(0, UIT_LIMITE_SOLES - row.acumuladoPen);
                            const statusLabel =
                                row.acumuladoPen >= UIT_LIMITE_SOLES
                                    ? "Límite superado"
                                    : pct >= 85
                                        ? "Cerca del límite"
                                        : "Dentro del límite";

                            return (
                                <div
                                    key={row.id}
                                    className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-page/50 p-4"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[14.5px] font-bold text-ink">
                                                    {row.nombre}
                                                </span>
                                                <span className="rounded-full bg-brand-surface px-2.5 py-0.5 text-[11px] font-bold text-brand">
                                                    {row.vinculo}
                                                </span>
                                            </div>
                                            <p className="text-[12px] font-medium text-ink-muted">
                                                {row.documento} · Proveedor titular:{" "}
                                                {row.proveedorOrigen}
                                            </p>
                                        </div>
                                        <StatusBadge status={statusLabel} />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between text-[12px] font-bold tabular-nums">
                                            <span className="text-ink">
                                                Acumulado: S/{" "}
                                                {row.acumuladoPen.toLocaleString("es-PE")} (
                                                {usedUit.toFixed(1)} / {UIT_LIMITE_UNIDADES} UIT)
                                            </span>
                                            <span className="text-brand">
                                                Disponible: S/{" "}
                                                {disponiblePen.toLocaleString("es-PE")}
                                            </span>
                                        </div>
                                        <Progress value={pct} className="h-2.5" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ModalSection>

                <div className="flex items-start gap-3 rounded-xl border border-brand-border/60 bg-brand-surface/35 p-3.5 text-[12px] font-medium text-ink-body">
                    <ShieldAlert size={18} className="mt-0.5 shrink-0 text-brand" />
                    <span>
                        Según la normativa de SUNAT, el límite anual para emitir Liquidaciones de Compra
                        electrónicas a un mismo productor primario es de{" "}
                        <strong>{UIT_LIMITE_UNIDADES > 0 && UIT_VALOR_2026 > 0 ? `${UIT_LIMITE_UNIDADES} UIT (S/ ${formatMoney(UIT_LIMITE_SOLES)})` : "pendiente de parámetros"}</strong>. Cuando una persona se acerca al tope,
                        puedes seleccionar o vincular a un copropietario/familiar autorizado del predio.
                    </span>
                </div>
            </div>
        </AppModal>
    );
}
