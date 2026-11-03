/** Texto de normas del prototipo de Cosecha y Control de Calidad. */
const GUIDE_STANDARD_TEXT: Record<string, { issuer: string; phrase: string }> = {
    NOP: { issuer: "ORGANICO: CAAE AMERICA\nCODIGO CAAE: 36774", phrase: "CERTIFIED ORGANIC BY SC CAAE" },
    RTPO: { issuer: "ORGANICO: CAAE AMERICA\nCODIGO CAAE: 36774", phrase: "REGLAMENTO TECNICO PERUANO PARA PRODUCTOS ORGANICOS." },
    EU: { issuer: "ORGANICO: CAAE AMERICA\nCODIGO CAAE: 36774", phrase: "CERTIFICADO ORGANICO POR\nCAAE PE-BIO-178" },
    ROC: { issuer: "ROC: CONTROL UNION", phrase: "Regenerative Organic Certified® Bronce" },
    GLOBALGAP_GRASP: { issuer: "GLOBALG.A.P Y GRASP: CERTIGROW", phrase: "GGN:4063061578877" },
};

export function qualityGuideStandardText(codes: string[]): string {
    const issuers = new Set<string>();
    const lines: string[] = [];
    for (const code of new Set(codes)) {
        const standard = GUIDE_STANDARD_TEXT[code];
        if (!standard) continue;
        if (!issuers.has(standard.issuer)) {
            lines.push(standard.issuer);
            issuers.add(standard.issuer);
        }
        lines.push(standard.phrase);
    }
    return lines.join("\n");
}
