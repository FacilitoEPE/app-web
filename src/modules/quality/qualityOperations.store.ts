import { useSyncExternalStore } from "react";
import {
    DEMO_QUALITY_DELIVERY_LOADS,
    type QualityDeliveryLoadItem,
    type QualityHarvestAdvance,
    type QualityHarvestClosure,
    type QualityHarvestOrganization,
    type QualityLabAnalysisRecord,
    type QualityMtdProducerRecord,
    type QualityProviderLoadDetail,
    type QualityReviewStatus,
    type QualitySunatRemissionGuide,
} from "@/modules/quality/qualityOperations.demo";

let items: QualityDeliveryLoadItem[] = DEMO_QUALITY_DELIVERY_LOADS;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function useQualityDeliveryLoads() {
    return useSyncExternalStore(subscribe, () => items);
}

export function saveQualityDeliveryReview(
    loadId: string,
    payload: {
        estadoRevision: QualityReviewStatus;
        mtdRegistros: QualityMtdProducerRecord[];
        analisisLaboratorio: QualityLabAnalysisRecord[];
    },
) {
    items = items.map((item) =>
        item.id === loadId
            ? {
                  ...item,
                  estadoRevision: payload.estadoRevision,
                  mtdRegistros: payload.mtdRegistros,
                  analisisLaboratorio: payload.analisisLaboratorio,
              }
            : item,
    );
    emit();
}

export function saveQualityHarvestWizard(
    loadId: string,
    payload: {
        organizacionCosecha: QualityHarvestOrganization;
        avancesCosecha: QualityHarvestAdvance[];
        cierreCosecha: QualityHarvestClosure;
    },
) {
    items = items.map((item) =>
        item.id === loadId
            ? {
                  ...item,
                  organizacionCosecha: payload.organizacionCosecha,
                  avancesCosecha: payload.avancesCosecha,
                  cierreCosecha: payload.cierreCosecha,
              }
            : item,
    );
    emit();
}

export function saveQualityLoadRealData(
    loadId: string,
    payload: {
        fechaCargaReal: string;
        anotador: string;
        cumpleRequisitosIndustria: boolean;
        motivoRechazoIndustria: string;
        viaticosMovilidad: number;
        viaticosInsumos: number;
        gastoCuadrilla: number;
        gastoAnotadores: number;
        observacionesCarga: string;
        proveedoresCarga: QualityProviderLoadDetail[];
    },
) {
    items = items.map((item) =>
        item.id === loadId
            ? {
                  ...item,
                  ...payload,
              }
            : item,
    );
    emit();
}

export function saveQualityRemissionGuide(loadId: string, guide: QualitySunatRemissionGuide) {
    items = items.map((item) => {
        if (item.id !== loadId) return item;
        const exists = item.guiasRemision.some((g) => g.id === guide.id);
        return {
            ...item,
            guiasRemision: exists
                ? item.guiasRemision.map((g) => (g.id === guide.id ? guide : g))
                : [...item.guiasRemision, guide],
        };
    });
    emit();
}

export function createQualityExportLoad(newLoad: QualityDeliveryLoadItem) {
    items = [newLoad, ...items];
    emit();
}
