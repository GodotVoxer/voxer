"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { VOX_TITLE_MAX } from "@/lib/limits";

type FormProps = {
  onCancel: () => void;
  onSubmitQuery: (q: string) => void;
};

/** Remounted on every opening (`key`): the previous query must not survive in state or in the DOM input, where Android keyboards can re-insert the word being composed. */
const SearchVoxForm = ({ onCancel, onSubmitQuery }: FormProps) => {
  const [value, setValue] = useState("");
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (q) onSubmitQuery(q);
      }}
    >
      <Input
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Escribí palabras del título…"
        maxLength={VOX_TITLE_MAX}
        autoComplete="off"
        autoFocus
        className="border-fg/20 bg-surface-sunken text-fg placeholder:text-fg-subtle"
      />
      <DialogFooter className="gap-2 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer border-fg/25 bg-surface-sunken text-fg-soft hover:bg-fg/10"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="cursor-pointer bg-brand-600 text-on-solid hover:bg-brand-500"
          disabled={!value.trim()}
        >
          Buscar
        </Button>
      </DialogFooter>
    </form>
  );
};

type Props = {
  open: boolean;
  /** Bumped on every opening to remount the form. */
  openCount: number;
  onOpenChange: (open: boolean) => void;
};

export const SearchVoxDialogContent = ({ open, openCount, onOpenChange }: Props) => {
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-fg/15 sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Buscar por título</DialogTitle>
        </DialogHeader>
        <SearchVoxForm
          key={openCount}
          onCancel={() => onOpenChange(false)}
          onSubmitQuery={(q) => {
            onOpenChange(false);
            router.push(`/buscar?q=${encodeURIComponent(q)}`);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
