"use client";
import { useState } from "react";
import { RecategorizeVoxDialog } from "@/components/Moderation/Dialogs/RecategorizeVoxDialog";
import { patchVoxCategoryAsModerator } from "@/features/moderation/api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voxId: string;
  category: string;
  onSaved: () => void | Promise<void>;
};

/** Recategorize from the grid. The draft is seeded on open: seeding on every render would let a list refresh overwrite the staff's choice. */
export const VoxCardRecategorizeDialog = ({
  open,
  onOpenChange,
  voxId,
  category,
  onSaved,
}: Props) => {
  const [value, setValue] = useState(category);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setValue(category);
  }

  return (
    <RecategorizeVoxDialog
      open={open}
      onOpenChange={onOpenChange}
      categoryValue={value}
      onCategoryChange={setValue}
      onSave={async () => {
        await patchVoxCategoryAsModerator(voxId, value);
        onOpenChange(false);
        await onSaved();
      }}
    />
  );
};
