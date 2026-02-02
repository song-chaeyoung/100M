import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <h2 className="text-2xl font-semibold">페이지를 찾을 수 없습니다</h2>
      <p className="text-muted-foreground">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Button asChild variant="outline">
        <Link href="/">홈으로 돌아가기</Link>
      </Button>
    </div>
  );
}