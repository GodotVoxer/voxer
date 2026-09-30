"use client";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteThemeAssetRequest,
  listCustomThemesRequest,
  listThemeAssetsRequest,
  uploadThemeAssetRequest,
} from "@/features/theme/api";
import { useThemeStore } from "@/features/theme/store";
import { prepareClientImageFileForUpload } from "@/features/media/clientImagePrep";
import {
  THEME_BACKGROUND_FITS,
  VOX_BACKGROUND_DIM_MAX,
  type ThemeBackgroundFit,
  type VoxBackground,
} from "@/lib/theme/customTheme";
import { isSafeThemeImageUrl } from "@/lib/theme/themeAssetUrls";
import { THEME_BG_UPLOAD_MAX_BYTES } from "@/lib/theme/themeBackgroundLimits";
import { clientFileReadErrorMessage } from "@/features/media/fileReadErrorMessage";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";
import { cn } from "@/lib/utils";
import { DISPLAY_LOCALE } from "@/lib/format/dates";

type ImageBackground = Extract<VoxBackground, { kind: "image" }>;

type Props = {
  value: ImageBackground | null;
  onChange: (next: VoxBackground) => void;
};

const FIT_LABELS: Record<ThemeBackgroundFit, string> = {
  cover: "Cubrir",
  contain: "Contener",
  tile: "Mosaico",
};

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";
const DEFAULT_DIM_PCT = 35;

const formatMb = (bytes: number) =>
  `${(bytes / (1024 * 1024)).toLocaleString(DISPLAY_LOCALE, { maximumFractionDigits: 1 })} MB`;

export const ThemeBackgroundImagePicker = ({ value, onChange }: Props) => {
  const assets = useThemeStore((s) => s.themeAssets);
  const quota = useThemeStore((s) => s.themeAssetQuota);
  const setThemeAssets = useThemeStore((s) => s.setThemeAssets);
  const setCustomThemes = useThemeStore((s) => s.setCustomThemes);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const refreshAssets = async () => {
    const { assets: next, quota: nextQuota } = await listThemeAssetsRequest();
    setThemeAssets(next, nextQuota);
  };

  useEffect(() => {
    if (assets !== null) return;
    let cancelled = false;
    listThemeAssetsRequest()
      .then(({ assets: loaded, quota: loadedQuota }) => {
        if (!cancelled) setThemeAssets(loaded, loadedQuota);
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar tus imágenes.");
      });
    return () => {
      cancelled = true;
    };
  }, [assets, setThemeAssets]);

  const select = (assetId: string) =>
    onChange({
      kind: "image",
      assetId,
      fit: value?.fit ?? "cover",
      dimPct: value?.dimPct ?? DEFAULT_DIM_PCT,
    });

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const original = event.target.files?.[0];
    event.target.value = "";
    if (!original) return;
    setBusy(true);
    setError(null);
    try {
      const file = await prepareClientImageFileForUpload(original);
      if (file.size > THEME_BG_UPLOAD_MAX_BYTES) {
        setError(`La imagen supera ${formatMb(THEME_BG_UPLOAD_MAX_BYTES)} aun achicada.`);
        return;
      }
      const asset = await uploadThemeAssetRequest(file);
      await refreshAssets();
      select(asset.id);
    } catch (err) {
      setError(
        userFacingApiErrorMessage(err) ??
          clientFileReadErrorMessage(err) ??
          "No se pudo subir la imagen.",
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (assetId: string) => {
    setBusy(true);
    setError(null);
    try {
      await deleteThemeAssetRequest(assetId);
      await refreshAssets();
      // The server reset the themes that used it to no background.
      setCustomThemes(await listCustomThemesRequest());
      if (value?.assetId === assetId) onChange({ kind: "none" });
    } catch (err) {
      setError(userFacingApiErrorMessage(err) ?? "No se pudo borrar la imagen.");
    } finally {
      setBusy(false);
      setConfirmDeleteId(null);
    }
  };

  const atLimit = quota ? quota.count >= quota.maxCount : false;

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => void upload(e)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || atLimit}
          onClick={() => fileInputRef.current?.click()}
          className="border-fg/20 bg-transparent text-fg hover:bg-fg/10"
        >
          <ImagePlus aria-hidden />
          {busy ? "Procesando…" : "Subir imagen"}
        </Button>
        {quota ? (
          <span className="text-xs text-fg-subtle">
            {quota.count} de {quota.maxCount} imágenes · {formatMb(quota.bytes)} de{" "}
            {formatMb(quota.maxBytes)}
          </span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-xs text-danger-400">
          {error}
        </p>
      ) : null}

      {assets && assets.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {assets.map((asset) => {
            const selected = value?.assetId === asset.id;
            return (
              <li key={asset.id} className="relative">
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={`Usar imagen de ${asset.width}×${asset.height}`}
                  onClick={() => select(asset.id)}
                  className={cn(
                    "block aspect-video w-full cursor-pointer overflow-hidden rounded-md border-2 bg-media-placeholder",
                    selected ? "border-brand-500" : "border-transparent hover:border-fg/30",
                  )}
                >
                  {isSafeThemeImageUrl(asset.urlSm) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura propia ya optimizada (WebP 1280px).
                    <img
                      src={asset.urlSm}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </button>
                {confirmDeleteId === asset.id ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-md bg-surface-raised/95 p-1 text-center text-[11px]">
                    <span>¿Borrar?</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="cursor-pointer rounded px-1.5 py-0.5 hover:bg-fg/10"
                      >
                        No
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(asset.id)}
                        className="cursor-pointer rounded bg-danger-600 px-1.5 py-0.5 text-on-solid hover:bg-danger-500"
                      >
                        Sí
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label="Borrar imagen"
                    onClick={() => setConfirmDeleteId(asset.id)}
                    className="absolute top-1 right-1 flex size-6 cursor-pointer items-center justify-center rounded bg-surface-raised/80 text-fg-muted hover:text-danger-400"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : assets ? (
        <p className="text-xs text-fg-subtle">Todavía no subiste imágenes.</p>
      ) : null}

      {value ? (
        <div className="space-y-3">
          <div
            role="radiogroup"
            aria-label="Ajuste de la imagen"
            className="grid grid-cols-3 gap-1"
          >
            {THEME_BACKGROUND_FITS.map((fit) => (
              <button
                key={fit}
                type="button"
                role="radio"
                aria-checked={value.fit === fit}
                onClick={() => onChange({ ...value, fit })}
                className={cn(
                  "h-8 cursor-pointer rounded-md text-xs font-medium",
                  value.fit === fit
                    ? "bg-brand-600 text-on-solid"
                    : "border border-fg/15 text-fg-secondary hover:bg-fg/10",
                )}
              >
                {FIT_LABELS[fit]}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3 text-sm text-fg-soft">
            <span className="w-24 shrink-0">Oscurecer</span>
            <input
              type="range"
              min={0}
              max={VOX_BACKGROUND_DIM_MAX}
              step={5}
              value={value.dimPct}
              onChange={(e) =>
                onChange({
                  ...value,
                  dimPct: Math.min(
                    VOX_BACKGROUND_DIM_MAX,
                    Math.max(0, Math.round(Number(e.target.value))),
                  ),
                })
              }
              className="min-w-0 flex-1 accent-brand-600"
            />
            <span className="w-10 text-right font-mono text-xs">{value.dimPct}%</span>
          </label>
        </div>
      ) : null}

      <p className="text-xs text-fg-subtle">
        JPG, PNG o WebP. En el servidor se quitan los metadatos (como la ubicación) y se convierte a
        WebP. Solo la ves vos.
      </p>
    </div>
  );
};
