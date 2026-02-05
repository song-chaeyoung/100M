import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader />

      <div className="space-y-6">
        {/* AutomationSummaryCards Skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <Card key={i} className="py-4">
              <CardContent className="flex flex-col items-center gap-2 px-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FixedExpenseList & FixedSavingList Accordion Skeleton */}
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="border rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          ))}
        </div>

        {/* Add Button Skeleton */}
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
  );
}
