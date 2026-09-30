"use client";
import { useRef, useState, type ChangeEvent } from "react";
import { Clipboard, ClipboardPaste, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createThemeAssetShareRequest,
  importSharedThemeAssetRequest,
  listThemeAssetsRequest,
} from "@/features/theme/api";
import { useThemeStore } from "@/features/theme/store";
import type { CustomThemeInput } from "@/lib/theme/customTheme";
import {
  CUSTOM_THEME_IMPORT_MAX_BYTES,
  customThemeExportFileName,
  parseCustomThemeImport,
  serializeCustomThemeExport,
} from "@/lib/theme/customThemeTransfer";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";
import { cn } from "@/lib/utils";

type Props = { input: CustomThemeInput; onImport: (input: CustomThemeInput) => void };
type Status = { kind: "error" | "info"; text: string };

const actionClassName = "border-fg/20 bg-transparent text-fg hover:bg-fg/10";

/** Exports or pastes strict JSON; images go through opaque server references. */
export const ThemeTransferActions = ({ input, onImport }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pastedJson, setPastedJson] = useState("");
  const setThemeAssets = useThemeStore((s) => s.setThemeAssets);

  const exportedText = async () => {
    const shareId =
      input.voxBackground.kind === "image"
        ? await createThemeAssetShareRequest(input.voxBackground.assetId)
        : null;
    return serializeCustomThemeExport(input, shareId);
  };

  const exportTheme = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const url = URL.createObjectURL(
        new Blob([await exportedText()], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = customThemeExportFileName(input.name);
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus({
        kind: "info",
        text: "Tema exportado. La imagen se comparte con una referencia segura.",
      });
    } catch (error) {
      setStatus({
        kind: "error",
        text: userFacingApiErrorMessage(error) ?? "No se pudo exportar el tema.",
      });
    } finally {
      setBusy(false);
    }
  };

  const copyTheme = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await navigator.clipboard.writeText(await exportedText());
      setStatus({ kind: "info", text: "JSON del tema copiado." });
    } catch (error) {
      setStatus({
        kind: "error",
        text: userFacingApiErrorMessage(error) ?? "No se pudo copiar el tema.",
      });
    } finally {
      setBusy(false);
    }
  };

  const applyImportText = async (text: string) => {
    const result = parseCustomThemeImport(text);
    if (!result.ok) {
      setStatus({ kind: "error", text: result.message });
      return false;
    }
    let importedInput = result.input;
    if (result.sharedImage) {
      const asset = await importSharedThemeAssetRequest(result.sharedImage.shareId);
      const { assets, quota } = await listThemeAssetsRequest();
      setThemeAssets(assets, quota);
      importedInput = {
        ...importedInput,
        voxBackground: {
          kind: "image",
          assetId: asset.id,
          fit: result.sharedImage.fit,
          dimPct: result.sharedImage.dimPct,
        },
      };
    }
    onImport(importedInput);
    setStatus({
      kind: "info",
      text: `Se cargó «${importedInput.name}». Revisalo y guardalo para usarlo.`,
    });
    return true;
  };

  const importPastedTheme = async () => {
    setBusy(true);
    setStatus(null);
    try {
      if (await applyImportText(pastedJson)) {
        setPastedJson("");
        setShowPaste(false);
      }
    } catch (error) {
      setStatus({
        kind: "error",
        text: userFacingApiErrorMessage(error) ?? "No se pudo importar el tema.",
      });
    } finally {
      setBusy(false);
    }
  };

  const importTheme = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > CUSTOM_THEME_IMPORT_MAX_BYTES) {
      setStatus({ kind: "error", text: "El archivo es demasiado grande para ser un tema." });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await applyImportText(await file.text());
    } catch (error) {
      setStatus({
        kind: "error",
        text: userFacingApiErrorMessage(error) ?? "No se pudo importar el tema.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={actionClassName}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <Upload aria-hidden /> Importar archivo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={actionClassName}
          disabled={busy}
          onClick={() => void exportTheme()}
        >
          <Download aria-hidden /> Exportar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={actionClassName}
          disabled={busy}
          onClick={() => void copyTheme()}
        >
          <Clipboard aria-hidden /> Copiar JSON
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={actionClassName}
          disabled={busy}
          aria-expanded={showPaste}
          onClick={() => setShowPaste((shown) => !shown)}
        >
          <ClipboardPaste aria-hidden /> Pegar JSON
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          aria-label="Importar tema desde archivo"
          className="hidden"
          onChange={(event) => void importTheme(event)}
        />
      </div>
      {showPaste ? (
        <div className="space-y-2">
          <label htmlFor="theme-json-import" className="block text-xs font-medium text-fg-muted">
            Pegá el JSON completo del tema
          </label>
          <textarea
            id="theme-json-import"
            value={pastedJson}
            maxLength={CUSTOM_THEME_IMPORT_MAX_BYTES}
            rows={6}
            spellCheck={false}
            autoComplete="off"
            className="w-full resize-y rounded-md border border-fg/20 bg-surface-sunken px-3 py-2 font-mono text-xs text-fg outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/25"
            onChange={(event) => setPastedJson(event.target.value)}
          />
          <Button
            type="button"
            size="sm"
            disabled={busy || pastedJson.trim().length === 0}
            onClick={() => void importPastedTheme()}
          >
            Cargar JSON
          </Button>
        </div>
      ) : null}
      {status ? (
        <p
          role={status.kind === "error" ? "alert" : "status"}
          className={cn("text-xs", status.kind === "error" ? "text-danger-400" : "text-fg-muted")}
        >
          {status.text}
        </p>
      ) : null}
    </div>
  );
};
