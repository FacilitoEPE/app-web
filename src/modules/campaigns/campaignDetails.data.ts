export interface CampaignGrower {
    id: number;
    name: string;
    location: string;
    hectares: number;
    owner: string;
    phone: string;
    varieties: string[];
}

export interface CampaignClient {
    id: number;
    name: string;
    type: string;
    contact: string;
    email: string;
    orders: number;
    status: "Activo" | "Inactivo";
}

export interface CampaignCertification {
    id: number;
    name: string;
    files: string[];
    expires: string;
    /** Estado ya calculado por quien arma el dato; sin él se deduce de `expires` */
    status?: string;
    icon: "leaf" | "file" | "tree" | "shield";
}

export const getGrowerTotals = (providers: CampaignGrower[]) => ({
    hectares: providers.reduce((sum, provider) => sum + provider.hectares, 0),
    varieties: new Set(providers.flatMap((provider) => provider.varieties)).size,
});
