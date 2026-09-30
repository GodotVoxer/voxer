"use client";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onClose: () => void;
};

export const ReportEntityDialogSuccess = ({ onClose }: Props) => {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-6">
      <CheckCircle2 className="size-12 text-success-400" strokeWidth={2} aria-hidden />
      <p className="text-base font-semibold text-fg">Denuncia enviada</p>
      <p className="text-center text-sm text-fg-muted">
        Gracias. El equipo de moderación va a revisarla.
      </p>
      <Button
        type="button"
        className="mt-2 cursor-pointer bg-success-700 text-on-solid hover:bg-success-600"
        onClick={onClose}
      >
        Cerrar
      </Button>
    </div>
  );
};
