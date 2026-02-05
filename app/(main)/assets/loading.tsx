import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader />

      <div className="space-y-6">
        {/* 총 자산 요약 Skeleton */}
        <div className="bg-card rounded-xl p-6">
          <Skeleton className="h-4 w-12 mb-2" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-16 mt-2" />
        </div>

        {/* 자산 목록 Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-7 w-20" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          ))}
        </div>

        {/* 자산 추가 버튼 Skeleton */}
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
  );
}
