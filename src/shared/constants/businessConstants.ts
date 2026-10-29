/**
 * Constantes y catálogos fijos de negocio para el frontend (EPE Web).
 *
 * Estos catálogos no cuentan con CRUD en la base de datos o se almacenan
 * como columnas varchar/jsonb simples, por lo que se mantienen centralizados
 * como constantes tipadas para asegurar consistencia en todos los módulos.
 */

export const EXAM_TYPES = [
  { value: "CADMIO", label: "CADMIO (Metales pesados)" },
  { value: "Residuos de Plaguicidas", label: "Residuos de Plaguicidas (LMR)" },
  { value: "Microbiológico", label: "Análisis Microbiológico" },
  { value: "Metales Pesados", label: "Metales Pesados (Plomo/Arsénico)" },
  { value: "Análisis Nutricional", label: "Análisis Nutricional de Suelo/Foliar" },
  { value: "Trazabilidad de Campo", label: "Trazabilidad y Cuaderno de Campo" },
] as const;

export type ExamTypeValue = (typeof EXAM_TYPES)[number]["value"];

/** Tipos de envase / embalaje para transporte y recepción */
export const PACKAGE_TYPES = [
  { value: "Jabas", label: "Jabas plásticas cosecha (20 kg)" },
  { value: "Bines", label: "Bines plásticos / madera (350-400 kg)" },
  { value: "Mallas", label: "Mallas / Sacos de recojo" },
] as const;

export type PackageTypeValue = (typeof PACKAGE_TYPES)[number]["value"];

/** Conceptos de gastos operativos durante la carga y estiba en campo */
export const CARGO_EXPENSE_TYPES = [
  { value: "cuadrilla", label: "Cuadrilla de estibadores / cosecha" },
  { value: "anotadores", label: "Anotadores y control de campo" },
  { value: "viaticos_movilidad", label: "Viáticos de movilidad y traslado" },
  { value: "insumos_campo", label: "Insumos, desinfectantes y materiales" },
] as const;

export type CargoExpenseTypeValue = (typeof CARGO_EXPENSE_TYPES)[number]["value"];

/** Conceptos de gastos operativos de transporte */
export const TRANSPORT_EXPENSE_TYPES = [
  { value: "flete", label: "Flete acordado de ruta" },
  { value: "peajes", label: "Peajes" },
  { value: "balanza", label: "Pesaje y balanza comercial" },
  { value: "estiba_desestiba", label: "Estiba / Desestiba adicional" },
  { value: "viaticos_chofer", label: "Alimentación / Viáticos del conductor" },
] as const;

export type TransportExpenseTypeValue = (typeof TRANSPORT_EXPENSE_TYPES)[number]["value"];

/** Monedas utilizadas en contratos, acuerdos y liquidaciones */
export const CURRENCIES = [
  { value: "PEN", label: "Soles (S/)", symbol: "S/" },
  { value: "USD", label: "Dólares Americanos ($)", symbol: "$" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["value"];

/** Tipos de documento de identidad admitidos */
export const DOCUMENT_TYPES = [
  { value: "DNI", label: "DNI (Documento Nacional de Identidad)", length: 8 },
  { value: "RUC", label: "RUC (Registro Único de Contribuyentes)", length: 11 },
  { value: "Carnet de extranjeria", label: "Carnet de Extranjería", length: 12 },
  { value: "Pasaporte", label: "Pasaporte", length: 12 },
] as const;

export type DocumentTypeValue = (typeof DOCUMENT_TYPES)[number]["value"];

/** Estados del viaje y trazabilidad logística */
export const TRANSPORT_STAGES = [
  { value: "planificado", label: "Planificado" },
  { value: "en recojo", label: "En recojo de fincas" },
  { value: "despachado", label: "Despachado / En ruta" },
  { value: "llegada", label: "Llegada a destino" },
  { value: "en espera", label: "En espera de descarga" },
  { value: "recibido", label: "Recibido / Descargado" },
] as const;

export type TransportStageValue = (typeof TRANSPORT_STAGES)[number]["value"];

/** Normas de certificación orgánica y exportación */
export const EXPORT_STANDARDS = [
  {
    code: "NOP",
    label: "NOP (National Organic Program - EE.UU.)",
    issuer: "ORGANICO: CAAE AMERICA\nCODIGO CAAE: 36774",
    phrase: "CERTIFIED ORGANIC BY SC CAAE",
  },
  {
    code: "RTPO",
    label: "RTPO (Reglamento Técnico Peruano para Productos Orgánicos)",
    issuer: "ORGANICO: CAAE AMERICA\nCODIGO CAAE: 36774",
    phrase: "REGLAMENTO TECNICO PERUANO PARA PRODUCTOS ORGANICOS.",
  },
  {
    code: "EU",
    label: "EU (Reglamento Orgánico Unión Europea)",
    issuer: "ORGANICO: CAAE AMERICA\nCODIGO CAAE: 36774",
    phrase: "CERTIFICADO ORGANICO POR\nCAAE PE-BIO-178",
  },
  {
    code: "ROC",
    label: "ROC (Regenerative Organic Certified)",
    issuer: "ROC: CONTROL UNION",
    phrase: "Regenerative Organic Certified® Bronce",
  },
  {
    code: "GLOBALGAP_GRASP",
    label: "GLOBALG.A.P. / GRASP",
    issuer: "GLOBALG.A.P Y GRASP: CERTIGROW",
    phrase: "GGN:4063061578877",
  },
] as const;

export type ExportStandardCode = (typeof EXPORT_STANDARDS)[number]["code"];

/** Principales regiones agroexportadoras de operación (Ubigeo) */
export const REGIONES_AGROEXPORTADORAS = [
  { departamento: "Piura", provincias: ["Piura", "Sullana", "Tambogrande", "Morropón", "Paita"] },
  { departamento: "Lambayeque", provincias: ["Chiclayo", "Lambayeque", "Ferreñafe", "Motupe", "Olmos"] },
  { departamento: "La Libertad", provincias: ["Trujillo", "Virú", "Chepén", "Pacasmayo"] },
  { departamento: "Lima", provincias: ["Lima", "Huaral", "Barranca", "Cañete"] },
  { departamento: "Ica", provincias: ["Ica", "Chincha", "Pisco", "Nazca"] },
] as const;
