import type { ComponentProps } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CreateVoxTriggerButton = (props: ComponentProps<typeof Button>) => (
  <Button
    variant="ghost"
    size="icon"
    className="app-header-control cursor-pointer rounded-md border border-brand-800/60 bg-surface-raised text-brand-100 hover:border-brand-500 hover:bg-brand-950 hover:text-fg"
    {...props}
  >
    <Plus className="size-6" />
    <span className="sr-only">Crear vox</span>
  </Button>
);
