'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT — ImageUploadZone
// Componente reutilizable de drag & drop para subir imágenes a R2.
// Flujo: seleccionar archivo → presign → PUT a R2 → registrar en DB
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { presignUpload, saveBusinessImage } from '@/lib/api';
import { Button } from '@/components/ui/button';

// Tipos permitidos y tamaño máximo
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export type ImageUploadType = 'COVER' | 'GALLERY' | 'PROMOTION';

export type CurrentImage = {
  id: string;
  url: string;
  type: string;
};

interface ImageUploadZoneProps {
  businessSlug: string;
  imageType: ImageUploadType;
  maxFiles?: number;
  onUploadComplete?: (url: string, key: string) => void;
  currentImages?: CurrentImage[];
  onImageDelete?: (imageId: string) => void;
  label?: string;
  /** Compacto: sin thumbnails de imágenes actuales (para uso en modales) */
  compact?: boolean;
}

export function ImageUploadZone({
  businessSlug,
  imageType,
  maxFiles = 20,
  onUploadComplete,
  currentImages = [],
  onImageDelete,
  label = 'Arrastra imágenes aquí o haz clic',
  compact = false,
}: ImageUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Flujo principal de subida
  const handleFile = useCallback(
    async (file: File) => {
      // 1. Validar tipo
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error('Formato no soportado. Usa JPG, PNG o WebP.');
        return;
      }

      // 2. Validar tamaño
      if (file.size > MAX_SIZE) {
        toast.error('La imagen excede el límite de 5 MB.');
        return;
      }

      // 3. Verificar límite de archivos (para galería)
      if (imageType === 'GALLERY' && currentImages.length >= maxFiles) {
        toast.error(`Máximo ${maxFiles} imágenes en la galería.`);
        return;
      }

      // Mostrar preview local mientras sube
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setUploading(true);

      try {
        // 4. Obtener URL presignada
        let presignData: { uploadUrl: string; publicUrl: string; key: string };
        try {
          presignData = await presignUpload(businessSlug, file.type, imageType);
        } catch (err) {
          // Si es 503, R2 no está configurado
          if (err instanceof Error && err.message.includes('503')) {
            toast.error('Configura R2 en .env para subir imágenes');
          } else {
            toast.error(err instanceof Error ? err.message : 'Error al preparar la subida');
          }
          return;
        }

        // 5. PUT al presigned URL de R2
        const uploadRes = await fetch(presignData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        if (!uploadRes.ok) {
          toast.error('Error al subir la imagen al almacenamiento.');
          return;
        }

        // 6. Registrar en DB
        await saveBusinessImage(businessSlug, {
          url: presignData.publicUrl,
          type: imageType,
          storageKey: presignData.key,
        });

        // 7. Callback al padre
        onUploadComplete?.(presignData.publicUrl, presignData.key);

        toast.success('Imagen subida correctamente');
      } finally {
        // Limpiar preview y estado
        URL.revokeObjectURL(objectUrl);
        setPreview(null);
        setUploading(false);
      }
    },
    [businessSlug, imageType, currentImages.length, maxFiles, onUploadComplete],
  );

  // Manejar selección desde el input
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Limpiar para permitir seleccionar el mismo archivo otra vez
    e.target.value = '';
  };

  // Drag & drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // Decidir si se muestra la zona de drop
  const showDropZone =
    imageType !== 'GALLERY' ||
    currentImages.length < maxFiles ||
    compact;

  return (
    <div className="space-y-3">
      {/* Label opcional */}
      {!compact && label && (
        <p className="text-white/50 text-xs">{label}</p>
      )}

      {/* Zona de drop */}
      {showDropZone && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          aria-label="Subir imagen"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors cursor-pointer select-none
            ${dragOver ? 'border-amber-400/60 bg-amber-500/10' : 'border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/[0.07]'}
            ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          {/* Preview mientras sube */}
          {preview && (
            <div className="relative w-full h-32 rounded-lg overflow-hidden">
              { }
              <img
                src={preview}
                alt="Vista previa"
                className="w-full h-full object-cover"
              />
              {/* Overlay de carga */}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="animate-spin text-amber-400" size={28} />
              </div>
            </div>
          )}

          {/* Icono y texto cuando no hay preview */}
          {!preview && (
            <>
              {uploading ? (
                <Loader2 className="animate-spin text-amber-400" size={28} />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Upload className="text-zinc-400" size={20} />
                </div>
              )}
              <div className="text-center">
                <p className="text-zinc-400 text-sm">
                  {uploading ? 'Subiendo imagen…' : 'Arrastra imágenes aquí o haz clic'}
                </p>
                {!uploading && (
                  <p className="text-zinc-500 text-xs mt-1">JPG, PNG o WebP — máx. 5 MB</p>
                )}
              </div>
            </>
          )}

          {/* Input oculto */}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onInputChange}
          />
        </div>
      )}

      {/* Thumbnails de imágenes actuales (solo modo galería no-compacto) */}
      {!compact && currentImages.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {currentImages.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10"
            >
              { }
              <img
                src={img.url}
                alt="Imagen del negocio"
                className="w-full h-full object-cover"
              />
              {/* Botón eliminar */}
              {onImageDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageDelete(img.id);
                  }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Eliminar imagen"
                >
                  <X size={12} className="text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Variante para una sola imagen (cover / promo) ─────────

interface SingleImageUploadProps {
  businessSlug: string;
  imageType: ImageUploadType;
  currentUrl?: string;
  onUploadComplete?: (url: string, key: string) => void;
  onClear?: () => void;
  label?: string;
}

export function SingleImageUpload({
  businessSlug,
  imageType,
  currentUrl,
  onUploadComplete,
  onClear,
  label = 'Imagen de portada',
}: SingleImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error('Formato no soportado. Usa JPG, PNG o WebP.');
        return;
      }
      if (file.size > MAX_SIZE) {
        toast.error('La imagen excede el límite de 5 MB.');
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setUploading(true);

      try {
        let presignData: { uploadUrl: string; publicUrl: string; key: string };
        try {
          presignData = await presignUpload(businessSlug, file.type, imageType);
        } catch (err) {
          if (err instanceof Error && err.message.includes('503')) {
            toast.error('Configura R2 en .env para subir imágenes');
          } else {
            toast.error(err instanceof Error ? err.message : 'Error al preparar la subida');
          }
          return;
        }

        const uploadRes = await fetch(presignData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        if (!uploadRes.ok) {
          toast.error('Error al subir la imagen al almacenamiento.');
          return;
        }

        await saveBusinessImage(businessSlug, {
          url: presignData.publicUrl,
          type: imageType,
          storageKey: presignData.key,
        });

        onUploadComplete?.(presignData.publicUrl, presignData.key);
        toast.success('Imagen subida correctamente');
      } finally {
        URL.revokeObjectURL(objectUrl);
        setPreview(null);
        setUploading(false);
      }
    },
    [businessSlug, imageType, onUploadComplete],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  // Si hay imagen actual o preview, mostrar thumbnail con acciones
  const displayUrl = preview || currentUrl;

  if (displayUrl) {
    return (
      <div className="space-y-2">
        {label && <p className="text-white/50 text-xs">{label}</p>}
        <div className="relative w-full max-w-xs aspect-video rounded-xl overflow-hidden bg-white/5 border border-white/10">
          { }
          <img
            src={displayUrl}
            alt="Imagen"
            className="w-full h-full object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="animate-spin text-amber-400" size={28} />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="border-white/15 text-white hover:bg-white/5 hover:border-amber-400/40 text-xs"
          >
            <ImageIcon size={12} className="mr-1" /> Cambiar
          </Button>
          {onClear && !uploading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClear}
              className="border-red-500/30 text-red-300 hover:bg-red-500/10 text-xs"
            >
              <X size={12} className="mr-1" /> Eliminar
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onInputChange}
        />
      </div>
    );
  }

  // Sin imagen: mostrar drop zone
  return (
    <ImageUploadZone
      businessSlug={businessSlug}
      imageType={imageType}
      onUploadComplete={onUploadComplete}
      label={label}
      compact
    />
  );
}
