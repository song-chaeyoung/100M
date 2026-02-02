"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    toast.error(error.message || "문제가 발생했습니다.");
  }, [error]);

  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <p className="text-muted-foreground">문제가 발생했습니다.</p>
      <Button onClick={reset} variant="outline">
        다시 시도
      </Button>
    </div>
  );
}