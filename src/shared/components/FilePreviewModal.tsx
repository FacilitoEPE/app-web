import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import { cn } from "@/lib/utils";
import { formatFileSize, isImage, isPdf, isStoredFile, type FileSource } from "@/shared/utils/fileSource";
import { getProtectedDocument, isProtectedDocumentUrl } from "@/shared/api/uploadDocument";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import FormField from "@/shared/components/FormField";

interface FilePreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    file: FileSource | null;
}

/**
 * Visualizador de un documento (PDF o imagen) en un modal. Lo usa el campo de archivo (`FileDropzone`) y
 * cualquier tabla o vista que quiera abrir un documento sin pasar por un formulario.
 */
export default function FilePreviewModal({ open, onOpenChange, file }: FilePreviewModalProps) {
    const [result, setResult] = useState<{ source: string; url: string; type: string } | null>(null);
    const [failedSource, setFailedSource] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const storedUrl = file && isStoredFile(file) ? file.url : null;
    const protectedSource = storedUrl && isProtectedDocumentUrl(storedUrl) ? storedUrl : null;
    // El objeto URL solo tiene sentido mientras dure este archivo; se libera al cambiarlo o desmontar
    const objectUrl = useMemo(() => (file && !isStoredFile(file) ? URL.createObjectURL(file) : null), [file]);
    useEffect(() => {
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [objectUrl]);

    useEffect(() => {
        if (!open || !protectedSource) return;
        const controller = new AbortController();
        let blobUrl: string | null = null;
        void getProtectedDocument(protectedSource, controller.signal).then(data => {
            if (controller.signal.aborted) return;
            blobUrl = URL.createObjectURL(data);
            setResult({ source: protectedSource, url: blobUrl, type: data.type });
        }).catch(() => {
            if (!controller.signal.aborted) setFailedSource(protectedSource);
        });
        return () => {
            controller.abort();
            if (blobUrl) URL.revokeObjectURL(blobUrl);
            setResult(null);
            setFailedSource(null);
        };
    }, [open, protectedSource, attempt]);

    if (!file && !open) return null;
    const preview = result?.source === protectedSource ? result : null;
    const previewUrl = protectedSource ? preview?.url : storedUrl ?? objectUrl;
    const protectedType = preview?.type ?? "";
    const hasError = protectedSource !== null && failedSource === protectedSource;

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Eye size={22} strokeWidth={2} />}
            title="Vista Previa"
            description={file?.size !== undefined ? `${file.name} (${formatFileSize(file.size)})` : file?.name ?? "Sin documento adjunto"}
            size="xl"
        >
            {!file ? (
                <p className="text-sm text-ink-muted">Este registro aún no tiene un documento adjunto.</p>
            ) : hasError ? (
                <div className="flex flex-col items-start gap-3">
                    <FormField error="No se pudo abrir el documento. Inténtalo nuevamente." />
                    <Button variant="outline" onClick={() => { setFailedSource(null); setAttempt(current => current + 1); }}>Reintentar</Button>
                </div>
            ) : !previewUrl ? (
                <div role="status" className="flex min-h-28 items-center justify-center gap-2 text-sm text-ink-muted">
                    <Spinner /> Cargando documento…
                </div>
            ) : <div className={cn("w-full overflow-hidden rounded-xl border border-border bg-surface-page", !isPdf(file) && !isImage(file) && !protectedType && "flex min-h-[40vh] items-center justify-center p-6")}>
                {isPdf(file) || protectedType === 'application/pdf' ? (
                    <iframe src={previewUrl} title={file.name} className="h-[70vh] w-full" />
                ) : isImage(file) || protectedType.startsWith('image/') ? (
                    <div className="flex max-h-[70vh] w-full items-center justify-center bg-muted p-4">
                        <img src={previewUrl} alt={file.name} className="max-h-full max-w-full rounded shadow-sm" />
                    </div>
                ) : (
                    <a href={previewUrl} download={file.name} className="text-[13.5px] font-medium text-brand underline">Descargar documento</a>
                )}
            </div>}
        </AppModal>
    );
}
