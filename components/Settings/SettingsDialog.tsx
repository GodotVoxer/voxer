"use client";
import { useSettingsStore } from "@/features/settings/store";
import {
  Dialog as UiDialog,
  DialogContent as UiDialogContent,
  DialogDescription as UiDialogDescription,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
} from "@/components/ui/dialog";
import { NotificationSoundPicker } from "./NotificationSoundPicker";
import { CommentSubmitShortcutPicker } from "./CommentSubmitShortcutPicker";
import { SettingsToggleRow } from "./SettingsToggleRow";

export const SettingsDialog = () => {
  const dialogOpen = useSettingsStore((s) => s.dialogOpen);
  const setDialogOpen = useSettingsStore((s) => s.setDialogOpen);
  const videoSoundEnabled = useSettingsStore((s) => s.videoSoundEnabled);
  const notificationHistoryEnabled = useSettingsStore((s) => s.notificationHistoryEnabled);
  const classicTagNavigation = useSettingsStore((s) => s.classicTagNavigation);
  const openImagesInNewTab = useSettingsStore((s) => s.openImagesInNewTab);
  const setVideoSoundEnabled = useSettingsStore((s) => s.setVideoSoundEnabled);
  const setNotificationHistoryEnabled = useSettingsStore((s) => s.setNotificationHistoryEnabled);
  const setClassicTagNavigation = useSettingsStore((s) => s.setClassicTagNavigation);
  const setOpenImagesInNewTab = useSettingsStore((s) => s.setOpenImagesInNewTab);

  return (
    <UiDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <UiDialogContent className="max-h-[85dvh] overflow-y-auto border-fg/10 sm:max-w-md">
        <UiDialogHeader>
          <UiDialogTitle>Configuración</UiDialogTitle>
          <UiDialogDescription>
            Estas preferencias se guardan en este dispositivo.
          </UiDialogDescription>
        </UiDialogHeader>
        <div className="divide-y divide-fg/10">
          <SettingsToggleRow
            label="Sonido al reproducir un video"
            description="Apagado, los videos arrancan en silencio y los desmuteás desde sus controles."
            checked={videoSoundEnabled}
            onCheckedChange={setVideoSoundEnabled}
          />
          <SettingsToggleRow
            label="Historial de notificaciones"
            description="Apagado, una notificación desaparece del panel apenas la leés."
            checked={notificationHistoryEnabled}
            onCheckedChange={setNotificationHistoryEnabled}
          />
          <SettingsToggleRow
            label="Abrir imágenes en nueva pestaña"
            description="Apagado, se abren acá mismo a pantalla completa, con zoom y sin salir del vox."
            checked={openImagesInNewTab}
            onCheckedChange={setOpenImagesInNewTab}
          />
          <SettingsToggleRow
            label="Tag clásico"
            description="Tocar un >>TAG te lleva con scroll al comentario en vez de abrir su tarjeta."
            checked={classicTagNavigation}
            onCheckedChange={setClassicTagNavigation}
          />
          <CommentSubmitShortcutPicker />
          <NotificationSoundPicker />
        </div>
      </UiDialogContent>
    </UiDialog>
  );
};
