"use client";
import { useModerationStaffDirectory } from "@/hooks/moderation/useModerationStaffDirectory";
import { isAdminRole } from "@/lib/moderation/roles";
import type { UserRole } from "@prisma/client";
import { StaffAddModeratorForm } from "@/components/Moderation/Staff/StaffAddModeratorForm";
import { StaffDirectoryTable } from "@/components/Moderation/Staff/StaffDirectoryTable";

type StaffUser = {
  id: string;
  role: UserRole;
};

type Props = {
  currentUser: StaffUser;
  onAuthRefresh: () => Promise<void>;
};

export const ModerationStaffPanel = ({ currentUser, onAuthRefresh }: Props) => {
  const isAdmin = isAdminRole(currentUser.role);
  const { staffList, setStaffList, directoryLoadError } = useModerationStaffDirectory(true);

  return (
    <div className="space-y-4">
      {directoryLoadError ? (
        <p className="text-sm text-danger-400" role="alert">
          {directoryLoadError}
        </p>
      ) : null}
      {isAdmin ? (
        <StaffAddModeratorForm onStaffListUpdate={setStaffList} onAuthRefresh={onAuthRefresh} />
      ) : null}
      <StaffDirectoryTable
        currentUser={currentUser}
        isAdmin={isAdmin}
        staffList={staffList}
        onStaffListUpdate={setStaffList}
        onAuthRefresh={onAuthRefresh}
      />
    </div>
  );
};
