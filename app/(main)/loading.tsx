import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader />

      {/* GoalProgressCard Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
          <div className="flex justify-between items-baseline">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* MonthlySummaryCards Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-7 w-28" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="py-4">
              <CardContent className="flex flex-col items-center gap-2 px-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
