import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader />

      <div className="space-y-8">
        {/* 목표 및 설정 섹션 */}
        <section>
          <Skeleton className="h-4 w-20 mb-2" />
          <div className="space-y-1">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </section>

        {/* 커스터마이징 섹션 */}
        <section>
          <Skeleton className="h-4 w-24 mb-2" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-20 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
            </div>
          </div>
        </section>

        {/* 기타 섹션 */}
        <section>
          <Skeleton className="h-4 w-12 mb-2" />
          <div className="space-y-1">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </section>
      </div>
    </div>
  );
}
