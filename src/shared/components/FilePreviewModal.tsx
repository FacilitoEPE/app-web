import { useEffect, useMemo } from "react";
import { Eye } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import { cn } from "@/lib/utils";
import { formatFileSize, isImage, isPdf, isStoredFile, type FileSource } from "@/shared/utils/fileSource";

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
    // El objeto URL solo tiene sentido mientras dure este archivo; se libera al cambiarlo o desmontar
    const objectUrl = useMemo(() => (file && !isStoredFile(file) ? URL.createObjectURL(file) : null), [file]);
    useEffect(() => {
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [objectUrl]);

    const previewUrl = file && isStoredFile(file) ? file.url : objectUrl;
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
            <div className={cn("w-full overflow-hidden rounded-xl border border-border bg-surface-page", !isPdf(file) && !isImage(file) && "flex min-h-[40vh] items-center justify-center p-6")}>
                {isPdf(file) ? (
                    <iframe src={previewUrl} title={file.name} className="h-[70vh] w-full" />
                ) : isImage(file) ? (
                    <div className="flex max-h-[70vh] w-full items-center justify-center bg-muted p-4">
                        <img src={previewUrl} alt={file.name} className="max-h-full max-w-full rounded shadow-sm" />
                    </div>
                ) : (
                    <p className="text-[13.5px] font-medium">Vista previa no disponible para este tipo de archivo.</p>
                )}
            </div>
        </AppModal>
    );
}
