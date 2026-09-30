"use client";
import { useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronDown, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeColorField } from "@/components/Theme/ThemeColorField";
import { ThemeContrastSummary } from "@/components/Theme/ThemeContrastSummary";
import { HeaderBackgroundEditor } from "@/components/Theme/HeaderBackgroundEditor";
import { ThemeTransferActions } from "@/components/Theme/ThemeTransferActions";
import { VoxBackgroundEditor } from "@/components/Theme/VoxBackgroundEditor";
import {
  createCustomThemeRequest,
  deleteCustomThemeRequest,
  updateCustomThemeRequest,
} from "@/features/theme/api";
import { useThemeStore, type ThemeEditorTarget } from "@/features/theme/store";
import { cssColorToHex } from "@/lib/theme/colorMath";
import {
  CUSTOM_THEME_BASIC_KEYS,
  CUSTOM_THEME_NAME_MAX,
  deriveCustomThemeTokens,
  type CustomThemeInput,
  type CustomThemeOverrideKey,
} from "@/lib/theme/customTheme";
import {
  CUSTOM_THEME_EDITOR_GROUPS,
  CUSTOM_THEME_OVERRIDE_LABELS,
} from "@/lib/theme/customThemeLabels";
import { customThemeInputSchema } from "@/lib/theme/customThemeSchema";
import { THEME_RAMP_FAMILIES, type ThemeTokenMap } from "@/lib/theme/themeTokens";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";
import { cn } from "@/lib/utils";
import { countNoun } from "@/lib/format/plural";

type Tab = "basic" | "advanced";

const tokenHexFor = (tokens: ThemeTokenMap, key: CustomThemeOverrideKey): string => {
  const token = (THEME_RAMP_FAMILIES as readonly string[]).includes(key)
    ? tokens[`${key}-600` as keyof ThemeTokenMap]
    : tokens[key as keyof ThemeTokenMap];
  return cssColorToHex(token) ?? "#000000";
};

export const ThemeEditorPanel = ({ target }: { target: ThemeEditorTarget }) => {
  const customThemes = useThemeStore((s) => s.customThemes);
  const setDraft = useThemeStore((s) => s.setDraft);
  const closeEditor = useThemeStore((s) => s.closeEditor);
  const upsertCustomTheme = useThemeStore((s) => s.upsertCustomTheme);
  const removeCustomTheme = useThemeStore((s) => s.removeCustomTheme);
  const selectCustomTheme = useThemeStore((s) => s.selectCustomTheme);

  const editing =
    target.kind === "edit" ? customThemes?.find((t) => t.id === target.themeId) : null;

  const [initial] = useState<CustomThemeInput>(() =>
    editing
      ? {
          name: editing.name,
          base: editing.base,
          overrides: editing.overrides,
          headerBackground: editing.headerBackground,
          voxBackground: editing.voxBackground,
        }
      : {
          name: "Mi tema",
          base: target.kind === "create" ? target.base : "dark",
          overrides: {},
          headerBackground: { kind: "none" },
          voxBackground: { kind: "none" },
        },
  );
  // Version read on open: if the list refreshes (another device saved), saving must conflict, not overwrite.
  const [openedVersion] = useState(() => editing?.version);
  const [input, setInput] = useState(initial);
  const [tab, setTab] = useState<Tab>("basic");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"discard" | "delete" | null>(null);

  useEffect(() => {
    setDraft(initial);
    return () => setDraft(null);
  }, [initial, setDraft]);

  const tokens = useMemo(
    () => deriveCustomThemeTokens(input.base, input.overrides),
    [input.base, input.overrides],
  );
  const dirty = JSON.stringify(input) !== JSON.stringify(initial);
  const missingTheme = target.kind === "edit" && !editing;

  const update = (next: CustomThemeInput) => {
    setInput(next);
    setDraft(next);
    setError(null);
    setConfirm(null);
  };

  const setOverride = (key: CustomThemeOverrideKey, color: string | null) => {
    const overrides = { ...input.overrides };
    if (color) overrides[key] = color;
    else delete overrides[key];
    update({ ...input, overrides });
  };

  const requestClose = () => {
    if (dirty && !saving) setConfirm("discard");
    else closeEditor();
  };

  const save = async () => {
    const parsed = customThemeInputSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisá los datos del tema.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = editing
        ? await updateCustomThemeRequest(editing.id, {
            ...parsed.data,
            version: openedVersion ?? editing.version,
          })
        : await createCustomThemeRequest(parsed.data);
      upsertCustomTheme(saved);
      selectCustomTheme(saved);
      closeEditor();
    } catch (err) {
      setError(userFacingApiErrorMessage(err) ?? "No se pudo guardar el tema.");
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await deleteCustomThemeRequest(editing.id);
      removeCustomTheme(editing.id);
      closeEditor();
    } catch (err) {
      setError(userFacingApiErrorMessage(err) ?? "No se pudo eliminar el tema.");
      setSaving(false);
      setConfirm(null);
    }
  };

  const renderField = (key: CustomThemeOverrideKey) => (
    <ThemeColorField
      key={key}
      id={`theme-token-${key}`}
      label={CUSTOM_THEME_OVERRIDE_LABELS[key]}
      value={input.overrides[key] ?? tokenHexFor(tokens, key)}
      overridden={typeof input.overrides[key] === "string"}
      onChange={(color) => setOverride(key, color)}
      onReset={() => setOverride(key, null)}
    />
  );

  return (
    <DialogPrimitive.Root
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          data-theme={input.base}
          onInteractOutside={(event) => event.preventDefault()}
          className={cn(
            "fixed z-50 flex flex-col border-fg/10 bg-surface-raised text-fg shadow-2xl outline-none",
            "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl border-t",
            "md:inset-y-0 md:right-0 md:left-auto md:h-dvh md:max-h-none md:w-[420px] md:rounded-none md:border-t-0 md:border-l",
          )}
        >
          <div className="flex items-start gap-3 border-b border-fg/10 p-4">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-lg font-semibold">
                {target.kind === "edit" ? "Editar tema" : "Crear tema"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-xs text-fg-muted">
                Los cambios se ven en vivo detrás de este panel, que conserva los colores base para
                que siempre se lea bien.
              </DialogPrimitive.Description>
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Cerrar editor de tema"
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-fg/10 hover:text-fg"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {missingTheme ? (
            <p className="p-4 text-sm text-danger-400">
              No encontramos ese tema. Puede que se haya borrado en otro dispositivo.
            </p>
          ) : (
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4">
              <div className="space-y-2">
                <label htmlFor="theme-editor-name" className="text-sm font-medium text-fg-soft">
                  Nombre
                </label>
                <input
                  id="theme-editor-name"
                  value={input.name}
                  maxLength={CUSTOM_THEME_NAME_MAX}
                  onChange={(e) => update({ ...input, name: e.target.value })}
                  className="h-9 w-full rounded-md border border-fg/15 bg-surface-sunken px-3 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
                />
              </div>

              <div className="space-y-2">
                <p id="theme-editor-base" className="text-sm font-medium text-fg-soft">
                  Tema base
                </p>
                <div
                  role="radiogroup"
                  aria-labelledby="theme-editor-base"
                  className="grid grid-cols-2 gap-1"
                >
                  {(
                    [
                      ["dark", "Oscuro"],
                      ["light", "Claro"],
                    ] as const
                  ).map(([base, label]) => (
                    <button
                      key={base}
                      type="button"
                      role="radio"
                      aria-checked={input.base === base}
                      onClick={() => update({ ...input, base })}
                      className={cn(
                        "h-9 cursor-pointer rounded-md text-sm font-medium",
                        input.base === base
                          ? "bg-brand-600 text-on-solid"
                          : "border border-fg/15 text-fg-secondary hover:bg-fg/10",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <ThemeTransferActions input={input} onImport={update} />

              <section aria-labelledby="theme-editor-colors" className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 id="theme-editor-colors" className="text-sm font-semibold">
                    Colores
                  </h3>
                  <div role="tablist" aria-label="Nivel de detalle" className="flex gap-1">
                    {(
                      [
                        ["basic", "Básico"],
                        ["advanced", "Avanzado"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={tab === value}
                        onClick={() => setTab(value)}
                        className={cn(
                          "h-7 cursor-pointer rounded-md px-2.5 text-xs font-medium",
                          tab === value ? "bg-fg/15 text-fg" : "text-fg-muted hover:bg-fg/10",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {tab === "basic" ? (
                  <>
                    <p className="text-xs text-fg-subtle">
                      Los demás tonos se derivan de estos. En Avanzado podés ajustar cada uno,
                      incluidas las etiquetas de las tarjetas y los avatares.
                    </p>
                    <div className="space-y-3">{CUSTOM_THEME_BASIC_KEYS.map(renderField)}</div>
                  </>
                ) : (
                  <div className="space-y-2">
                    {CUSTOM_THEME_EDITOR_GROUPS.map((group, index) => {
                      const changed = group.keys.filter(
                        (key) => typeof input.overrides[key] === "string",
                      ).length;
                      return (
                        <details
                          key={group.id}
                          open={index === 0}
                          className="group rounded-md border border-fg/10"
                        >
                          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-fg-soft hover:bg-fg/5 [&::-webkit-details-marker]:hidden">
                            <span className="min-w-0 flex-1 truncate">{group.title}</span>
                            {changed > 0 ? (
                              <span className="text-xs font-normal text-brand-300">
                                {countNoun(changed, "cambiado", "cambiados")}
                              </span>
                            ) : null}
                            <ChevronDown
                              className="size-4 shrink-0 text-fg-muted transition-transform group-open:rotate-180"
                              aria-hidden
                            />
                          </summary>
                          <div className="space-y-3 border-t border-fg/10 p-3">
                            {group.keys.map(renderField)}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}
              </section>

              <section aria-labelledby="theme-editor-header-background" className="space-y-3">
                <h3 id="theme-editor-header-background" className="text-sm font-semibold">
                  Fondo del encabezado
                </h3>
                <HeaderBackgroundEditor
                  value={input.headerBackground}
                  onChange={(headerBackground) => update({ ...input, headerBackground })}
                  surfaceColor={tokenHexFor(tokens, "surface-sunken")}
                  accentColor={tokenHexFor(tokens, "brand")}
                />
              </section>

              <section aria-labelledby="theme-editor-background" className="space-y-3">
                <h3 id="theme-editor-background" className="text-sm font-semibold">
                  Fondo del vox
                </h3>
                <VoxBackgroundEditor
                  value={input.voxBackground}
                  onChange={(voxBackground) => update({ ...input, voxBackground })}
                  surfaceColor={tokenHexFor(tokens, "surface-vox-detail")}
                  accentColor={tokenHexFor(tokens, "brand")}
                />
              </section>

              <section aria-labelledby="theme-editor-contrast" className="space-y-2">
                <h3 id="theme-editor-contrast" className="text-sm font-semibold">
                  Legibilidad
                </h3>
                <ThemeContrastSummary tokens={tokens} />
              </section>
            </div>
          )}

          <div className="space-y-3 border-t border-fg/10 p-4">
            {error ? (
              <p role="alert" className="text-sm text-danger-400">
                {error}
              </p>
            ) : null}
            {confirm ? (
              <div
                role="alertdialog"
                aria-label={confirm === "delete" ? "Confirmar eliminación" : "Confirmar descarte"}
                className="flex flex-wrap items-center gap-2 rounded-md border border-fg/15 p-3 text-sm"
              >
                <span className="min-w-0 flex-1">
                  {confirm === "delete"
                    ? "¿Eliminar este tema? No se puede deshacer."
                    : "¿Descartar los cambios sin guardar?"}
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirm(null)}>
                  Seguir editando
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={saving}
                  className="bg-danger-600 text-on-solid hover:bg-danger-500"
                  onClick={() => (confirm === "delete" ? void remove() : closeEditor())}
                >
                  {confirm === "delete" ? "Eliminar" : "Descartar"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {editing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={() => setConfirm("delete")}
                    className="text-danger-400 hover:bg-danger-950/40 hover:text-danger-300"
                  >
                    <Trash2 aria-hidden />
                    Eliminar
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-auto border-fg/20 bg-transparent text-fg hover:bg-fg/10"
                  onClick={requestClose}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || missingTheme}
                  className="bg-brand-600 text-on-solid hover:bg-brand-500"
                  onClick={() => void save()}
                >
                  {saving ? "Guardando…" : "Guardar y usar"}
                </Button>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
