"use client";
import { Button } from "@/components/ui/button";

type Props = {
  moderatorUsername: string;
  onModeratorUsernameChange: (value: string) => void;
  banIdFilter: string;
  onBanIdFilterChange: (value: string) => void;
  onSearch: () => void;
};

export const ModerationActionFilters = ({
  moderatorUsername,
  onModeratorUsernameChange,
  banIdFilter,
  onBanIdFilterChange,
  onSearch,
}: Props) => {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
      className="flex flex-wrap gap-2"
    >
      <input
        placeholder="Username del moderador (exacto o parte)"
        value={moderatorUsername}
        onChange={(e) => onModeratorUsernameChange(e.target.value)}
        className="min-w-[200px] flex-1 rounded-md border border-fg/15 bg-surface-sunken px-2 py-2 text-sm"
      />
      <input
        placeholder="Filtrar por ID de ban"
        value={banIdFilter}
        onChange={(e) => onBanIdFilterChange(e.target.value)}
        className="min-w-[200px] flex-1 rounded-md border border-fg/15 bg-surface-sunken px-2 py-2 text-sm"
      />
      <Button type="submit" variant="outline" className="cursor-pointer">
        Buscar
      </Button>
    </form>
  );
};
