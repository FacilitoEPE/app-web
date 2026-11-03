import { usesV1 } from '@/shared/api/data-contract';
import { qualityCommands } from '@/modules/quality/api/quality-commands.api';
import { useSyncExternalStore } from "react";
import {
    type QualityDeliveryLoadItem,
    type QualityHarvestAdvance,
    type QualityHarvestClosure,
    type QualityHarvestOrganization,
    type QualityLabAnalysisRecord,
    type QualityMtdProducerRecord,
    type QualityProviderLoadDetail,
    type QualityReviewStatus,
    type QualitySunatRemissionGuide,
} from "@/modules/quality/qualityOperations.models";

let items: QualityDeliveryLoadItem[] = [];
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
    if (usesV1()) return qualityCommands.review(loadId, payload);
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
    if (usesV1()) return qualityCommands.harvest(loadId, payload);
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
    if (usesV1()) return qualityCommands.saveLoad(loadId, payload);
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
    if (usesV1()) return qualityCommands.guide(loadId, guide);
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

export function removeQualityRemissionGuide(loadId: string, guideId: string) {
    if (usesV1()) return qualityCommands.removeGuide(loadId, guideId);
    items = items.map(item => item.id === loadId
        ? { ...item, guiasRemision: item.guiasRemision.filter(guide => guide.id !== guideId || guide.estado === 'Generada') }
        : item);
    emit();
}

export function createQualityExportLoad(newLoad: QualityDeliveryLoadItem) {
    if (usesV1()) return qualityCommands.createLoad(newLoad);
    items = [newLoad, ...items];
    emit();
}

export function hydrateQualityOperations(value: QualityDeliveryLoadItem[]) { items = value; emit(); }
