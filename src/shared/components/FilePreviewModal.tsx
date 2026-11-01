import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import { cn } from "@/lib/utils";
import { formatFileSize, isImage, isPdf, isStoredFile, type FileSource } from "@/shared/utils/fileSource";
import { apiClient } from '@/shared/api/client';

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
    const [protectedUrl, setProtectedUrl] = useState<string | null>(null);
    const [protectedType, setProtectedType] = useState('');
    // El objeto URL solo tiene sentido mientras dure este archivo; se libera al cambiarlo o desmontar
    const objectUrl = useMemo(() => (file && !isStoredFile(file) ? URL.createObjectURL(file) : null), [file]);
    useEffect(() => {
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [objectUrl]);

    useEffect(() => {
        if (!open || !file || !isStoredFile(file)) return;
        const url = new URL(file.url, window.location.origin);
        const apiOrigin = new URL(apiClient.defaults.baseURL || window.location.origin, window.location.origin).origin;
        if (url.origin !== apiOrigin || !url.pathname.startsWith('/api/archivos-locales/')) return;
        let active = true;
        let blobUrl: string | null = null;
        void apiClient.get<Blob>(url.href, { responseType: 'blob' }).then(({ data }) => {
            if (!active) return;
            blobUrl = URL.createObjectURL(data);
            setProtectedType(data.type);
            setProtectedUrl(blobUrl);
        }).catch(() => { if (active) setProtectedUrl(null); });
        return () => { active = false; if (blobUrl) URL.revokeObjectURL(blobUrl); setProtectedUrl(null); setProtectedType(''); };
    }, [open, file]);

    const protectedFile = file && isStoredFile(file) && new URL(file.url, window.location.origin).pathname.startsWith('/api/archivos-locales/');
    const previewUrl = file && isStoredFile(file) ? (protectedFile ? protectedUrl : file.url) : objectUrl;
    if (!file || !previewUrl) return null;

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Eye size={22} strokeWidth={2} />}
            title="Vista Previa"
            description={file.size !== undefined ? `${file.name} (${formatFileSize(file.size)})` : file.name}
            size="xl"
        >
            <div className={cn("w-full overflow-hidden rounded-xl border border-border bg-surface-page", !isPdf(file) && !isImage(file) && !protectedType && "flex min-h-[40vh] items-center justify-center p-6")}>
                {isPdf(file) || protectedType === 'application/pdf' ? (
                    <iframe src={previewUrl} title={file.name} className="h-[70vh] w-full" />
                ) : isImage(file) || protectedType.startsWith('image/') ? (
                    <div className="flex max-h-[70vh] w-full items-center justify-center bg-muted p-4">
                        <img src={previewUrl} alt={file.name} className="max-h-full max-w-full rounded shadow-sm" />
                    </div>
                ) : (
                    <a href={previewUrl} download={file.name} className="text-[13.5px] font-medium text-brand underline">Descargar documento</a>
                )}
            </div>
        </AppModal>
    );
}
