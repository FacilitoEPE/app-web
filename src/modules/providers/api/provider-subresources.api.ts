import { apiClient } from "@/shared/api/client";
import type {
    CertificadoProveedorDto,
    CertificadoProveedorInput,
    CertificadoProveedorMetadataInput,
    CertificadoDocumentoUploadResponse,
    CertificadoDocumentoConfirmationResponse,
    CertificadoDocumentoDownloadResponse,
    ExamenProveedorDto,
    ExamenProveedorInput,
    FrutaDto,
    ProveedorFrutaDto,
} from "@/modules/providers/api/provider-subresources.dto";
import { validateCertificadoProveedorFile } from "@/modules/providers/api/provider-subresources.validation";

export async function getFrutasCatalogo(): Promise<FrutaDto[]> {
    const { data } = await apiClient.get<FrutaDto[]>("/v1/frutas");
    return data;
}

export async function getFrutasProveedor(proveedorId: number): Promise<ProveedorFrutaDto[]> {
    const { data } = await apiClient.get<ProveedorFrutaDto[]>(`/v1/proveedores/${proveedorId}/frutas`);
    return data;
}

export async function assignProveedorFruta(proveedorId: number, frutaId: number): Promise<ProveedorFrutaDto> {
    const { data } = await apiClient.post<ProveedorFrutaDto>(`/v1/proveedores/${proveedorId}/frutas/${frutaId}`);
    return data;
}

export async function unassignProveedorFruta(proveedorId: number, frutaId: number): Promise<void> {
    await apiClient.delete(`/v1/proveedores/${proveedorId}/frutas/por-fruta/${frutaId}`);
}

export async function getExamenesProveedor(proveedorId: number): Promise<ExamenProveedorDto[]> {
    const { data } = await apiClient.get<ExamenProveedorDto[]>(`/v1/proveedores/${proveedorId}/examenes`);
    return data;
}

export async function createExamenProveedor(proveedorId: number, input: ExamenProveedorInput): Promise<ExamenProveedorDto> {
    const { data } = await apiClient.post<ExamenProveedorDto>(`/v1/proveedores/${proveedorId}/examenes`, input);
    return data;
}

export async function updateExamenProveedor(proveedorId: number, examenProveedorId: number, input: ExamenProveedorInput): Promise<ExamenProveedorDto> {
    const { data } = await apiClient.patch<ExamenProveedorDto>(`/v1/proveedores/${proveedorId}/examenes/${examenProveedorId}`, input);
    return data;
}

export async function deleteExamenProveedor(proveedorId: number, examenProveedorId: number): Promise<void> {
    await apiClient.delete(`/v1/proveedores/${proveedorId}/examenes/${examenProveedorId}`);
}

export async function getCertificadosProveedor(proveedorId: number): Promise<CertificadoProveedorDto[]> {
    const { data } = await apiClient.get<CertificadoProveedorDto[]>(`/v1/proveedores/${proveedorId}/certificados/documentos/registro`);
    return data;
}

export async function createCertificadoProveedor(proveedorId: number, input: CertificadoProveedorInput): Promise<CertificadoProveedorDto> {
    const { data } = await apiClient.post<CertificadoProveedorDto>(`/v1/proveedores/${proveedorId}/certificados/documentos/registro`, input);
    return data;
}

export async function createCertificadoProveedorWithFile(
    proveedorId: number,
    file: File,
    metadata: CertificadoProveedorMetadataInput,
    onStage?: (stage: string) => void,
): Promise<CertificadoProveedorDto> {
    const documentoArchivoId = await uploadAndConfirmCertificateFile(proveedorId, file, onStage);
    onStage?.("Guardando certificado…");
    return createCertificadoProveedor(proveedorId, {
        ...metadata,
        nombre: metadata.nombre.trim(),
        documentoArchivoId,
    });
}

async function uploadAndConfirmCertificateFile(proveedorId: number, file: File, onStage?: (stage: string) => void): Promise<number> {
    const fileError = validateCertificadoProveedorFile(file);
    if (fileError) throw new Error(fileError);

    onStage?.("Preparando archivo…");
    const { data: upload } = await apiClient.post<CertificadoDocumentoUploadResponse>(
        `/v1/proveedores/${proveedorId}/certificados/documentos/subida`,
        { nombreOriginal: file.name, mimeType: file.type, tamanoBytes: file.size },
    );
    onStage?.("Subiendo archivo…");
    const s3Response = await fetch(upload.uploadUrl, { method: upload.method, headers: upload.headers, body: file });
    if (!s3Response.ok) throw new Error("No se pudo subir el archivo a S3.");

    onStage?.("Verificando archivo…");
    const { data: confirmation } = await apiClient.post<CertificadoDocumentoConfirmationResponse>(
        `/v1/proveedores/${proveedorId}/certificados/documentos/${upload.archivoId}/confirmacion`,
    );
    if (confirmation.estado !== "DISPONIBLE") throw new Error("El archivo no quedó disponible.");
    return upload.archivoId;
}

export async function getCertificadoProveedorDownloadUrl(proveedorId: number, certificadoProveedorId: number): Promise<string> {
    const { data } = await apiClient.get<CertificadoDocumentoDownloadResponse>(
        `/v1/proveedores/${proveedorId}/certificados/${certificadoProveedorId}/documento/descarga`,
    );
    return data.downloadUrl;
}

export async function updateCertificadoProveedor(proveedorId: number, certificadoProveedorId: number, input: CertificadoProveedorInput): Promise<CertificadoProveedorDto> {
    const { data } = await apiClient.patch<CertificadoProveedorDto>(`/v1/proveedores/${proveedorId}/certificados/${certificadoProveedorId}/documentos/registro`, input);
    return data;
}

export async function updateCertificadoProveedorWithFile(
    proveedorId: number,
    certificadoProveedorId: number,
    file: File,
    metadata: CertificadoProveedorMetadataInput,
    onStage?: (stage: string) => void,
): Promise<CertificadoProveedorDto> {
    const documentoArchivoId = await uploadAndConfirmCertificateFile(proveedorId, file, onStage);
    onStage?.("Guardando certificado…");
    return updateCertificadoProveedor(proveedorId, certificadoProveedorId, {
        ...metadata,
        nombre: metadata.nombre.trim(),
        documentoArchivoId,
    });
}

export async function deleteCertificadoProveedor(proveedorId: number, certificadoProveedorId: number): Promise<void> {
    await apiClient.delete(`/v1/proveedores/${proveedorId}/certificados/${certificadoProveedorId}/documentos/registro`);
}
