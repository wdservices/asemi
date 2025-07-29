
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Video Player Skeleton */}
      <Skeleton className="w-full aspect-video rounded-lg" />

      <div className="mt-6 bg-card p-6 rounded-lg shadow space-y-4">
        {/* Title Skeleton */}
        <Skeleton className="h-8 w-3/4" />

        {/* Tabs Skeleton */}
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Content Skeleton */}
        <div className="space-y-3 pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </div>
  );
}
