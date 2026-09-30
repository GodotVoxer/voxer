"use client";
import { useRef, useState } from "react";
import { Play, Trash2, Upload } from "lucide-react";
import { useSettingsStore, type NotificationSoundId } from "@/features/settings/store";
import {
  CUSTOM_SOUND_MAX_BYTES,
  CUSTOM_SOUND_NOT_AUDIO_ES,
  CUSTOM_SOUND_STORE_FAILED_ES,
  CUSTOM_SOUND_TOO_LARGE_ES,
  clearCustomNotificationSound,
  isSupportedCustomSoundFile,
  saveCustomNotificationSound,
} from "@/features/settings/customNotificationSound";
import {
  STOCK_SOUNDS,
  invalidateCustomSoundCache,
  playNotificationSound,
} from "@/features/settings/notificationSounds";
import { cn } from "@/lib/utils";

const optionClass = (selected: boolean) =>
  cn(
    "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors",
    selected
      ? "border-brand-500/60 bg-brand-950/40 text-fg"
      : "border-fg/10 text-fg-muted hover:bg-fg/5",
  );

export const NotificationSoundPicker = () => {
  const notificationSound = useSettingsStore((s) => s.notificationSound);
  const customSoundName = useSettingsStore((s) => s.customSoundName);
  const setNotificationSound = useSettingsStore((s) => s.setNotificationSound);
  const setCustomSoundName = useSettingsStore((s) => s.setCustomSoundName);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const select = (id: NotificationSoundId) => {
    setNotificationSound(id);
    // Picking is the user gesture browsers require to play audio: use it to preview the sound.
    playNotificationSound(id);
  };

  const onFile = async (file: File) => {
    setError(null);
    if (!isSupportedCustomSoundFile(file)) {
      setError(CUSTOM_SOUND_NOT_AUDIO_ES);
      return;
    }
    if (file.size > CUSTOM_SOUND_MAX_BYTES) {
      setError(CUSTOM_SOUND_TOO_LARGE_ES);
      return;
    }
    try {
      await saveCustomNotificationSound(file);
    } catch {
      setError(CUSTOM_SOUND_STORE_FAILED_ES);
      return;
    }
    invalidateCustomSoundCache();
    setCustomSoundName(file.name);
    select("custom");
  };

  const removeCustom = async () => {
    await clearCustomNotificationSound().catch(() => {});
    invalidateCustomSoundCache();
    setCustomSoundName(null);
  };

  return (
    <div className="space-y-2 py-3">
      <p className="text-sm font-medium text-fg">Sonido de notificaciones</p>
      <p className="text-xs leading-relaxed text-fg-muted">
        Suena al llegar un comentario o una respuesta con Voxer abierto. Con la app cerrada el aviso
        lo dibuja el sistema y el sonido sale de los ajustes de notificaciones del teléfono.
      </p>
      <div className="space-y-1.5 pt-1">
        <button
          type="button"
          className={optionClass(notificationSound === "silent")}
          onClick={() => select("silent")}
        >
          Silencio
        </button>
        {STOCK_SOUNDS.map((sound) => (
          <button
            key={sound.id}
            type="button"
            className={optionClass(notificationSound === sound.id)}
            onClick={() => select(sound.id)}
          >
            <span className="flex-1">{sound.label}</span>
            <Play className="size-3.5 shrink-0 opacity-60" aria-hidden />
          </button>
        ))}
        {customSoundName ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={cn(optionClass(notificationSound === "custom"), "min-w-0 flex-1")}
              onClick={() => select("custom")}
            >
              <span className="min-w-0 flex-1 truncate">{customSoundName}</span>
              <Play className="size-3.5 shrink-0 opacity-60" aria-hidden />
            </button>
            <button
              type="button"
              className="shrink-0 cursor-pointer rounded-md border border-fg/10 p-2 text-danger-400 hover:bg-danger-950/40"
              aria-label="Quitar el sonido propio"
              title="Quitar el sonido propio"
              onClick={() => void removeCustom()}
            >
              <Trash2 className="size-4 shrink-0" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border border-fg/15 px-3 py-2 text-xs text-fg-soft hover:bg-fg/5"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="size-3.5 shrink-0" aria-hidden />
        {customSoundName ? "Cambiar el sonido propio" : "Usar un sonido propio"}
      </button>
      <p className="text-xs leading-relaxed text-fg-subtle">
        El archivo se guarda solo en este dispositivo: no se sube a Voxer, así que no se comparte
        entre tu teléfono y la computadora.
      </p>
      {error ? <p className="text-xs text-danger-400">{error}</p> : null}
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onFile(file);
        }}
      />
    </div>
  );
};
