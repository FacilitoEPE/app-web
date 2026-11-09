import type { CampanaDto, CreateCampanaDto, FrutaDto, CampanaEstado } from "@/modules/campaigns/api/campaign.dto";
import { parseFecha, formatFecha } from "@/modules/campaigns/api/fecha.util";

export interface Campana {
  responsableUsuarioId?: number | null;
  responsableNombre?: string | null;
  temporada?: string | null;
  observaciones?: string | null;
  lineamientosArchivoId?: number | null;
  campaniaId: number;
  nombre: string;
  frutaId: number;
  fruta?: FrutaDto;
  fechaInicio: Date;
  fechaFin: Date;
  estado: CampanaEstado;
  requerimientoComercial: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignFormInput {
  responsableUsuarioId?: number | null;
  responsableNombre?: string | null;
  temporada?: string | null;
  observaciones?: string | null;
  nombre: string;
  frutaId: number;
  fechaInicio: Date;
  fechaFin: Date;
  estado: CampanaEstado;
  requerimientoComercial: string;
}

export function toCampana(dto: CampanaDto): Campana {
  return {
    ...dto,
    fechaInicio: parseFecha(dto.fechaInicio),
    fechaFin: parseFecha(dto.fechaFin),
  };
}

export function toCreateCampanaDto(input: CampaignFormInput): CreateCampanaDto {
  return {
    ...input,
    fechaInicio: formatFecha(input.fechaInicio),
    fechaFin: formatFecha(input.fechaFin),
  };
}
