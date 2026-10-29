import { usesV1 } from '@/shared/api/data-contract';
import { campaignCommands } from '@/modules/campaigns/api/campaign-commands.api';
import type { InterviewAgronomicValues, InterviewValues } from "@/modules/campaigns/campaignInterview";
import type { Finca } from "@/modules/providers/providerFinca.utils";

export interface CampaignInterviewRecord {
    id: string;
    campaignId: number;
    createdAt: string;
    codigoFyv: string;
    values: InterviewValues;
}

// TODO(api): sustituir este almacén en memoria por el servicio de entrevistas cuando exista.
// No representa una confirmación del backend y se vacía al recargar la aplicación.
// En desarrollo arranca con entrevistas de demostración (`campaignInterviews.demo.ts`); en producción y en las
// pruebas arranca vacío, sin simular respuestas del backend.
const interviewsByRelation: Map<number, CampaignInterviewRecord[]> = new Map();

const normalizeFincaName = (name: string) => name.trim().toLocaleLowerCase("es");

export function getAvailableInterviewFincas(fincas: Finca[], interviewedNames: string[]) {
    const interviewed = new Set(interviewedNames.map(normalizeFincaName));
    return fincas.map((finca, index) => ({ finca, index }))
        .filter(({ finca }) => !interviewed.has(normalizeFincaName(finca.nombre)));
}

export function toInterviewValues(finca: Finca, agronomic: InterviewAgronomicValues): InterviewValues {
    return {
        ...agronomic,
        fincaNombre: finca.nombre,
        haTotalFinca: String(finca.haTotal),
        haCultivo: String(finca.haCultivo),
        departamento: finca.departamento,
        provincia: finca.provincia,
        distrito: finca.distrito,
        latitud: finca.latitud === null ? "" : String(finca.latitud),
        longitud: finca.longitud === null ? "" : String(finca.longitud),
    };
}

export function fruitCodePrefix(fruitName: string): string {
    const normalized = fruitName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
    return normalized.slice(0, 3).padEnd(3, "X");
}

/** Secuencia compartida por todos los productores de una campaña. */
export function getNextCampaignFincaCode(campaignId: number, fruitName: string): string {
    const prefix = `FYV-${fruitCodePrefix(fruitName)}-`;
    const used = [...interviewsByRelation.values()].flat().filter((record) => record.campaignId === campaignId).map((record) => record.codigoFyv)
        .filter((code) => code.startsWith(prefix))
        .map((code) => Number(code.slice(prefix.length)))
        .filter((number) => Number.isInteger(number) && number > 0);
    return `${prefix}${String(Math.max(0, ...used) + 1).padStart(2, "0")}`;
}

export function getCampaignInterviews(cxpId: number): CampaignInterviewRecord[] {
    return interviewsByRelation.get(cxpId) ?? [];
}

export function saveCampaignInterview(campaignId: number, cxpId: number, fruitName: string, values: InterviewValues, recordId?: string): CampaignInterviewRecord[] | Promise<CampaignInterviewRecord[]> {
    if (usesV1()) return campaignCommands.interview(cxpId, values, recordId).then(() => getCampaignInterviews(cxpId));
    const current = getCampaignInterviews(cxpId);
    if (!values.fincaNombre?.trim()) throw new Error("Selecciona o registra una finca para la entrevista.");
    if (recordId && !current.some((record) => record.id === recordId)) {
        throw new Error("No se encontró la entrevista que deseas editar.");
    }
    if (!recordId && current.some((record) => normalizeFincaName(record.values.fincaNombre ?? "") === normalizeFincaName(values.fincaNombre ?? ""))) {
        throw new Error("Esta finca ya tiene una entrevista en la campaña.");
    }
    const next = recordId
        ? current.map((record) => record.id === recordId ? { ...record, values } : record)
        : [{ id: crypto.randomUUID(), campaignId, createdAt: new Date().toISOString(), codigoFyv: getNextCampaignFincaCode(campaignId, fruitName), values }, ...current];
    interviewsByRelation.set(cxpId, next);
    return next;
}

export function resetCampaignInterviews() {
    interviewsByRelation.clear();
}

export function hydrateCampaignInterviews(value: Map<number, CampaignInterviewRecord[]>) { interviewsByRelation.clear(); for (const [id, rows] of value) interviewsByRelation.set(id, rows); }
