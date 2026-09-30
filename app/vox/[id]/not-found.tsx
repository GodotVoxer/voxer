"use client";
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { VoxDetailView } from "@/components/Vox/Detail/VoxDetailView";
import { VoxDetailSkeleton } from "@/components/Vox/Detail/VoxDetailSkeleton";
import { VoxDetailLoadError } from "@/components/Vox/Detail/VoxDetailLoadError";
import { voxIdFromDetailPathname } from "@/lib/vox/detailPathname";

/**
 * The client Router Cache keeps the segment for `staleTimes.dynamic`, so a vox restored by moderation
 * kept answering 404 until a reload. This 404 refetches the vox through the API (which bypasses that
 * cache) and shows it if it exists again.
 */
const VoxDetailNotFoundFallback = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = voxIdFromDetailPathname(pathname);

  if (!id) {
    return (
      <VoxDetailLoadError
        message="No encontramos este vox."
        onRetry={() => {
          router.refresh();
        }}
      />
    );
  }

  return (
    <VoxDetailView
      key={id}
      id={id}
      markModerationNotificationsRead={searchParams.get("denuncia") === "push"}
    />
  );
};

const VoxDetailNotFound = () => (
  <Suspense fallback={<VoxDetailSkeleton />}>
    <VoxDetailNotFoundFallback />
  </Suspense>
);

export default VoxDetailNotFound;
