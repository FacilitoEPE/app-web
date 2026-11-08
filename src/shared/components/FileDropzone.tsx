import { useEffect, useRef, useState } from "react";
import { FileText, Upload, Eye, X, Pencil, Image as ImageIcon } from "lucide-react";
import FilePreviewModal from "@/shared/components/FilePreviewModal";
import { formatFileSize, isImage, isStoredFile, type FileSource, type StoredFile } from "@/shared/utils/fileSource";
import { getDocumentAvailability, type DocumentAvailability } from '@/shared/api/uploadDocument';
import Hint from "@/shared/components/Hint";
import { INFO_LABEL_CLASS } from "@/shared/components/InfoField";
import { cn } from "@/lib/utils";
import { BRAND_ACTIVE_SURFACE } from "@/shared/styles/brandGradients";
export type { StoredFile };

export interface FileDropzoneProps {
    label: string;
    /** Oculta la etiqueta visible (sigue disponible para lectores de pantalla) cuando el bloque ya tiene su propio título */
    hideLabel?: boolean;
    hint?: string;
    accept?: string;
    /** Archivo recién elegido o referencia a un archivo ya guardado por el backend. */
    file: FileSource | null;
    onChange: (file: File | null) => void;
    /** Variante de visualización: "default" (caja vertical centrada) o "horizontal" (barra compacta h-11 alineada con inputs) */
    variant?: "default" | "horizontal";
    className?: string;
    disabled?: boolean;
    /** Modo visualizador: muestra el archivo con su vista previa, sin poder quitarlo ni reemplazarlo */
    readOnly?: boolean;
    /** Con un archivo ya puesto, cambia "quitar" por "reemplazar": abre el selector y entrega el nuevo archivo por `onChange` */
    replaceable?: boolean;
    hasColon?: boolean;
    optional?: boolean;
    required?: boolean;
    /** Permite elegir y previsualizar un archivo en V1 cuando el formulario advierte que no se persistirá. */
    allowLocalSelection?: boolean;
}

/**
 * Botón de adjuntar que, al elegir un archivo, se convierte en una tarjeta con nombre + peso
 * y dos acciones: ver una vista previa (PDF o imagen) y quitarlo para adjuntar otro.
 * Soporta variante "default" (vertical amplia) y "horizontal" (compacta h-11 para filas de formularios).
 * Con `readOnly` sirve de visualizador: solo la tarjeta con el archivo y su vista previa.
 * Con `replaceable` (edición) la tarjeta ofrece un lápiz para cambiar el archivo en vez de quitarlo.
 */
export default function FileDropzone({
    label,
    hideLabel,
    hint = "PDF · Máx. 10 MB",
    accept = "application/pdf,image/*",
    file,
    onChange,
    variant = "default",
    className,
    disabled = false,
    readOnly = false,
    replaceable = false,
    hasColon,
    optional,
    required,
}: FileDropzoneProps) {
    const [previewOpen, setPreviewOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const inputId = `file-dropzone-${label.replace(/\s+/g, "-").toLowerCase()}`;
    const replaceInputRef = useRef<HTMLInputElement>(null);
    const storedUrl = file && isStoredFile(file) ? file.url : null;
    const [verification, setVerification] = useState<{ source: string; estado: DocumentAvailability } | null>(null);
    const [verificationAttempt, setVerificationAttempt] = useState(0);
    useEffect(() => {
        if (!storedUrl) return;
        const abort = new AbortController();
        void getDocumentAvailability(storedUrl, abort.signal)
            .then(estado => { if (!abort.signal.aborted) setVerification({ source: storedUrl, estado }); })
            .catch(() => { if (!abort.signal.aborted) setVerification({ source: storedUrl, estado: 'NO_VERIFICABLE' }); });
        return () => abort.abort();
    }, [storedUrl, verificationAttempt]);
    const availability = storedUrl && verification?.source === storedUrl ? verification.estado : null;
    const available = availability === 'DISPONIBLE';
    const unavailable = availability === 'FALTANTE' || availability === 'INVALIDO';
    const statusText = !storedUrl ? 'Pendiente de guardar' : availability === null ? 'Verificando documento…'
        : available ? 'Documento verificado'
        : availability === 'FALTANTE' ? 'El documento no existe en el almacenamiento. Vuelve a adjuntarlo.'
        : availability === 'INVALIDO' ? 'El documento no coincide con sus metadatos. Vuelve a adjuntarlo.'
        : 'No se pudo verificar el documento. Revisa la conexión o los permisos.';
    const cardStatusClass = available ? 'border-brand-border bg-brand-surface/40'
        : unavailable ? 'border-destructive bg-destructive/10'
        : 'border-border bg-surface-page';
    const iconStatusClass = available ? 'text-white' : unavailable ? 'bg-destructive/10 text-destructive' : 'bg-muted text-ink-muted';

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (disabled) return;
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            onChange(droppedFile);
        }
    };

    /** Ojo (vista previa) y, según el modo, lápiz para reemplazar o X para quitar. `compact` es la variante horizontal. */
    const renderActions = (compact: boolean) => {
        const box = compact ? "h-7 w-7 rounded-md" : "h-9 w-9 rounded-lg";
        const iconSize = compact ? 14 : 17;
        return (
            <>
                <Hint label="Ver archivo">
                    <button
                        type="button"
                        disabled={unavailable}
                        onClick={() => setPreviewOpen(true)}
                        aria-label="Ver archivo"
                        className={cn("flex items-center justify-center text-ink-muted transition-colors hover:bg-card hover:text-brand active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed", box)}
                    >
                        <Eye size={iconSize} strokeWidth={2.5} />
                    </button>
                </Hint>
                {replaceable && !readOnly && (
                    <Hint label="Reemplazar archivo">
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => replaceInputRef.current?.click()}
                            aria-label="Reemplazar archivo"
                            className={cn("flex items-center justify-center text-ink-muted transition-colors hover:bg-card hover:text-brand active:scale-95 cursor-pointer disabled:pointer-events-none disabled:opacity-50", box)}
                        >
                            <Pencil size={iconSize} strokeWidth={2.5} />
                        </button>
                    </Hint>
                )}
                {!replaceable && !readOnly && (
                    <Hint label="Quitar">
                        <button
                            type="button"
                            onClick={() => onChange(null)}
                            aria-label="Quitar archivo"
                            className={cn("flex items-center justify-center text-ink-muted transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-95 cursor-pointer", box)}
                        >
                            <X size={iconSize} strokeWidth={2.5} />
                        </button>
                    </Hint>
                )}
            </>
        );
    };

    const colonChar = hasColon !== undefined ? (hasColon ? ":" : "") : (required || optional ? "" : ":");
    const isHorizontal = variant === "horizontal";
    const FileIcon = file && isImage(file) ? ImageIcon : FileText;

    return (
        <div className={cn("flex min-w-0 flex-col", readOnly ? "gap-2" : "gap-2.5", className)}>
            {/* Como visualizador es un dato más del detalle: misma etiqueta que InfoField */}
            {readOnly ? (
                <span className={cn(INFO_LABEL_CLASS, hideLabel && "sr-only")}>{label}</span>
            ) : (
                <label htmlFor={inputId} className={cn("text-[13px] font-semibold text-ink flex items-center gap-1.5 leading-snug", hideLabel && "sr-only")}>
                    <span>{label}{colonChar}</span>
                    {required && <span className="text-destructive font-bold">*</span>}
                    {optional && <span className="font-normal text-ink-muted/70 text-[11.5px] lowercase">(Opcional)</span>}
                </label>
            )}

            {!file && readOnly ? (
                <div className="flex h-10 items-center rounded-lg border border-border/60 bg-card px-3 text-[13px] font-medium text-ink-muted">Sin documento adjunto</div>
            ) : !file ? (
                isHorizontal ? (
                    <label
                        htmlFor={inputId}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                            "group relative flex min-h-11 w-full min-w-0 cursor-pointer flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border-2 border-dashed border-border px-3.5 py-1.5 transition-colors hover:border-brand/40 hover:bg-brand-surface/40 has-[:focus-visible]:border-brand has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-brand/30",
                            isDragging && "border-brand bg-brand-surface/70",
                            disabled && "pointer-events-none opacity-50"
                        )}
                    >
                        <input
                            id={inputId}
                            type="file"
                            accept={accept}
                            disabled={disabled}
                            className="sr-only"
                            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
                        />
                        <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface-page text-ink-muted transition-colors group-hover:border-brand/30 group-hover:text-brand">
                                <Upload size={14} strokeWidth={2.5} />
                            </span>
                            <span className="truncate text-[13px] font-semibold text-ink group-hover:text-brand transition-colors">
                                Haz clic para adjuntar
                            </span>
                        </div>
                        {hint && (
                            <span className="min-w-0 wrap-anywhere text-[11px] font-medium text-ink-muted/80">
                                {hint}
                            </span>
                        )}
                    </label>
                ) : (
                    <label
                        htmlFor={inputId}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                            "group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-brand/30 hover:bg-brand-surface/40 has-[:focus-visible]:border-brand has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-brand/30",
                            isDragging && "border-brand bg-brand-surface/70",
                            disabled && "pointer-events-none opacity-50"
                        )}
                    >
                        <input
                            id={inputId}
                            type="file"
                            accept={accept}
                            disabled={disabled}
                            className="sr-only"
                            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
                        />
                        <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-page text-ink-muted transition-colors group-hover:border-brand/30 group-hover:text-brand">
                            <Upload size={18} strokeWidth={2.5} />
                        </span>
                        <span className="text-[14px] font-bold text-ink">Haz clic para adjuntar</span>
                        <span className="text-[12px] font-medium text-ink-muted">{hint}</span>
                    </label>
                )
            ) : (
                isHorizontal ? (
                    <div className={cn("flex min-h-11 w-full min-w-0 items-center justify-between gap-2.5 rounded-lg border px-3", cardStatusClass)}>
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <span 
                                className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding", iconStatusClass)}
                                style={available ? BRAND_ACTIVE_SURFACE : undefined}
                            >
                                <FileIcon size={14} strokeWidth={2.5} />
                            </span>
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                <span className="truncate text-[13px] font-bold text-ink">{file.name}</span>
                                {file.size !== undefined && <span className="shrink-0 text-[11px] font-medium text-ink-muted">({formatFileSize(file.size)})</span>}
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">{renderActions(true)}</div>
                    </div>
                ) : (
                    <div className={cn("flex items-center gap-3 rounded-lg border p-3", cardStatusClass)}>
                        <span 
                            className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding", iconStatusClass)}
                            style={available ? BRAND_ACTIVE_SURFACE : undefined}
                        >
                            <FileIcon size={20} strokeWidth={2.5} />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-[13.5px] font-bold text-ink">{file.name}</span>
                            {file.size !== undefined && <span className="text-[12px] font-medium text-ink-muted">{formatFileSize(file.size)}</span>}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">{renderActions(false)}</div>
                    </div>
                )
            )}

            {file && (
                <div role="status" aria-live="polite" className={cn('text-[12px] font-medium', unavailable ? 'text-destructive' : availability === 'NO_VERIFICABLE' ? 'text-status-warning' : 'text-ink-muted')}>
                    {statusText}
                    {storedUrl && availability !== null && (
                        <button type="button" className="ml-2 cursor-pointer underline" onClick={() => { setVerification(null); setVerificationAttempt(value => value + 1); }}>Volver a verificar</button>
                    )}
                </div>
            )}

            {replaceable && file && (
                <input
                    ref={replaceInputRef}
                    id={inputId}
                    type="file"
                    accept={accept}
                    disabled={disabled}
                    className="sr-only"
                    onChange={(event) => {
                        const next = event.target.files?.[0];
                        if (next) onChange(next);
                        event.target.value = "";
                    }}
                />
            )}

            <FilePreviewModal open={previewOpen} onOpenChange={setPreviewOpen} file={file} />
        </div>
    );
}
