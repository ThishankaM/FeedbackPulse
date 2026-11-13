import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Trash2, ZoomIn, ZoomOut, Check, X, RotateCcw, ImageIcon } from 'lucide-react';
import { Button } from './button';
import { cn, sanitizeImageUrl, sanitizeHexColor } from '../../lib/utils';

const VIEW_SIZE = 192; // 1:1 crop viewport in CSS pixels
const OUTPUT_SIZE = 512; // 512x512 output resolution
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export interface SquareLogoUploaderProps {
  value: string;
  onChange: (dataUrl: string) => void;
  fallbackLetter?: string;
  primaryColor?: string;
  onCroppingChange?: (isCropping: boolean) => void;
  className?: string;
}

interface ImageDimensions {
  width: number;
  height: number;
}

export function SquareLogoUploader({
  value,
  onChange,
  fallbackLetter = 'W',
  primaryColor = '#4F46E5',
  onCroppingChange,
  className,
}: SquareLogoUploaderProps) {
  const { t } = useTranslation();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  const [sourceUrl, setSourceUrl] = React.useState<string | null>(null);
  const [imgDims, setImgDims] = React.useState<ImageDimensions | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const dragStateRef = React.useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const isCropping = sourceUrl !== null;

  React.useEffect(() => {
    onCroppingChange?.(isCropping);
  }, [isCropping, onCroppingChange]);

  React.useEffect(() => {
    return () => {
      if (sourceUrl) {
        URL.revokeObjectURL(sourceUrl);
      }
    };
  }, [sourceUrl]);

  const getClampedOffset = React.useCallback(
    (nextX: number, nextY: number, nextZoom: number, dims: ImageDimensions | null) => {
      if (!dims) return { x: 0, y: 0 };
      const baseScale = Math.max(VIEW_SIZE / dims.width, VIEW_SIZE / dims.height);
      const scale = baseScale * nextZoom;
      const dispW = dims.width * scale;
      const dispH = dims.height * scale;
      const maxOffsetX = Math.max(0, (dispW - VIEW_SIZE) / 2);
      const maxOffsetY = Math.max(0, (dispH - VIEW_SIZE) / 2);
      return {
        x: Math.max(-maxOffsetX, Math.min(maxOffsetX, nextX)),
        y: Math.max(-maxOffsetY, Math.min(maxOffsetY, nextY)),
      };
    },
    []
  );

  const safeSourceUrl = React.useMemo(
    () => (sourceUrl ? sanitizeImageUrl(sourceUrl) : null),
    [sourceUrl]
  );
  const safeValue = React.useMemo(() => sanitizeImageUrl(value), [value]);
  const safeColor = React.useMemo(() => sanitizeHexColor(primaryColor), [primaryColor]);
  const safeLetter = React.useMemo(() => {
    const char = (fallbackLetter || 'W').trim().charAt(0);
    return /^[a-zA-Z0-9]$/.test(char) ? char.toUpperCase() : 'W';
  }, [fallbackLetter]);

  const handleFile = (file: File) => {
    setError(null);
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError(t('workspace.logoInvalidType'));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(t('workspace.logoTooLarge'));
      return;
    }

    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
    }
    const objectUrl = URL.createObjectURL(file);
    setSourceUrl(objectUrl);
    setImgDims(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset file input ref so re-selecting the same file still triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const naturalWidth = e.currentTarget.naturalWidth;
    const naturalHeight = e.currentTarget.naturalHeight;
    setImgDims({ width: naturalWidth, height: naturalHeight });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imgDims) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active || !imgDims) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    setOffset(
      getClampedOffset(
        dragStateRef.current.originX + dx,
        dragStateRef.current.originY + dy,
        zoom,
        imgDims
      )
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current.active) {
      dragStateRef.current.active = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handleZoomChange = (nextZoom: number) => {
    const clampedZoom = Math.max(1, Math.min(3, nextZoom));
    setZoom(clampedZoom);
    setOffset((prev) => getClampedOffset(prev.x, prev.y, clampedZoom, imgDims));
  };

  const handleCancelCrop = () => {
    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
    }
    setSourceUrl(null);
    setImgDims(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleApplyCrop = () => {
    const img = imgRef.current;
    if (!img || !imgDims) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseScale = Math.max(VIEW_SIZE / imgDims.width, VIEW_SIZE / imgDims.height);
    const scale = baseScale * zoom;
    const dispW = imgDims.width * scale;
    const dispH = imgDims.height * scale;
    const clamped = getClampedOffset(offset.x, offset.y, zoom, imgDims);

    const ratio = OUTPUT_SIZE / VIEW_SIZE;
    const drawW = dispW * ratio;
    const drawH = dispH * ratio;
    const drawX = (OUTPUT_SIZE - drawW) / 2 + clamped.x * ratio;
    const drawY = (OUTPUT_SIZE - drawH) / 2 + clamped.y * ratio;

    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    let dataUrl = canvas.toDataURL('image/webp', 0.88);
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/png');
    }

    onChange(dataUrl);
    handleCancelCrop();
  };

  // Compute rendered image style inside the 1:1 viewport
  const previewStyle = React.useMemo<React.CSSProperties>(() => {
    if (!imgDims) return { opacity: 0 };
    const baseScale = Math.max(VIEW_SIZE / imgDims.width, VIEW_SIZE / imgDims.height);
    const scale = baseScale * zoom;
    const dispW = imgDims.width * scale;
    const dispH = imgDims.height * scale;
    return {
      width: `${dispW}px`,
      height: `${dispH}px`,
      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
      left: '50%',
      top: '50%',
      position: 'absolute',
      maxWidth: 'none',
      pointerEvents: 'none',
      userSelect: 'none',
    };
  }, [imgDims, zoom, offset]);

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {isCropping ? (
        <div className="rounded-2xl border border-border bg-muted/30 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              {t('workspace.logoCropTitle')}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">1:1</span>
          </div>

          <div className="flex flex-col items-center gap-3">
            {/* 1:1 Square Interactive Crop Viewport */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ width: VIEW_SIZE, height: VIEW_SIZE }}
              className="relative aspect-square rounded-2xl border-2 border-primary/60 bg-background/80 overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none shadow-sm"
            >
              <img
                ref={imgRef}
                src={safeSourceUrl ?? undefined}
                alt="Crop preview"
                onLoad={handleImageLoad}
                style={previewStyle}
                draggable={false}
              />
              {/* 1:1 Rule-of-thirds overlay */}
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-b border-white/25" />
                <div className="border-r border-white/25" />
                <div className="border-r border-white/25" />
                <div />
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 w-full max-w-[240px]">
              <button
                type="button"
                onClick={() => handleZoomChange(zoom - 0.15)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title={t('workspace.logoZoomOut')}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => {
                  const nextVal = parseFloat(e.target.value);
                  if (!Number.isNaN(nextVal)) {
                    handleZoomChange(nextVal);
                  }
                }}
                className="flex-1 accent-primary cursor-pointer h-1.5"
                aria-label={t('workspace.logoZoom')}
              />
              <button
                type="button"
                onClick={() => handleZoomChange(zoom + 0.15)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title={t('workspace.logoZoomIn')}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title={t('workspace.logoReset')}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              {t('workspace.logoCropHint')}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelCrop}
              className="rounded-xl text-xs cursor-pointer"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApplyCrop}
              disabled={!imgDims}
              className="rounded-xl text-xs cursor-pointer"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              {t('workspace.logoApply')}
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
          className={cn(
            'flex items-center gap-3.5 rounded-2xl border border-dashed p-3 transition-colors',
            isDraggingOver
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/20 hover:border-border/80'
          )}
        >
          {/* 1:1 Preview */}
          <div
            className="w-16 h-16 aspect-square rounded-2xl border border-border/80 flex items-center justify-center overflow-hidden shrink-0 shadow-xs"
            style={{
              background: safeValue
                ? undefined
                : `linear-gradient(135deg, ${safeColor} 0%, #2563eb 100%)`,
            }}
          >
            {safeValue ? (
              <img src={safeValue} alt="Logo preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-black text-xl uppercase">
                {safeLetter}
              </span>
            )}
          </div>

          {/* Actions & Hint */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl text-xs font-semibold cursor-pointer h-8"
              >
                {value ? (
                  <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                )}
                {value ? t('workspace.logoChangeButton') : t('workspace.logoUploadButton')}
              </Button>

              {value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange('')}
                  className="rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer h-8"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  {t('settings.logo.remove')}
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t('workspace.logoUploadHint')}
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}
