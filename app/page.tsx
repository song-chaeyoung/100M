import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader
        action={
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              로그아웃
            </Button>
          </form>
        }
      />

      {/* 캘린더 영역 (추후 구현) */}
      <Card>
        <CardHeader>
          <CardTitle>지출 캘린더</CardTitle>
          <CardDescription>{session.user.name}님의 지출 내역</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            캘린더 뷰는 추후 구현 예정입니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
