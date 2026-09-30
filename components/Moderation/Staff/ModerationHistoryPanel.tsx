"use client";
import { useState } from "react";
import { useModerationActionsQuery } from "@/hooks/moderation/useModerationActionsQuery";
import { ModerationActionFilters } from "@/components/Moderation/Staff/ModerationActionFilters";
import { ModerationActionList } from "@/components/Moderation/Staff/ModerationActionList";

type Props = {
  onAuthRefresh: () => Promise<void>;
};

export const ModerationHistoryPanel = ({ onAuthRefresh }: Props) => {
  const [moderatorUsername, setModeratorUsername] = useState("");
  const [banIdFilter, setBanIdFilter] = useState("");
  const { actions, nextCursor, loading, queryError, refresh, appendNextPage } =
    useModerationActionsQuery({
      moderatorUsername,
      banIdFilter,
    });

  return (
    <div className="space-y-4">
      {queryError ? (
        <p className="text-sm text-danger-400" role="alert">
          {queryError}
        </p>
      ) : null}
      <ModerationActionFilters
        moderatorUsername={moderatorUsername}
        onModeratorUsernameChange={setModeratorUsername}
        banIdFilter={banIdFilter}
        onBanIdFilterChange={setBanIdFilter}
        onSearch={() => void refresh()}
      />
      <ModerationActionList
        actions={actions}
        loading={loading}
        nextCursor={nextCursor}
        onAppendNextPage={appendNextPage}
        onRefresh={refresh}
        onAuthRefresh={onAuthRefresh}
      />
    </div>
  );
};
