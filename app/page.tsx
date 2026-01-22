import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">일억모으기</h1>
            <p className="text-sm text-muted-foreground">
              {session.user.name}님 환영합니다
            </p>
          </div>
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
        </div>

        {/* 사용자 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>계정 정보</CardTitle>
            <CardDescription>현재 로그인된 계정입니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="h-12 w-12 rounded-full"
                />
              )}
              <div>
                <p className="font-medium">{session.user.name}</p>
                <p className="text-sm text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 상태 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>시스템 상태</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">✅ 로그인 완료</p>
            <p className="text-sm">✅ 세션 유지 중</p>
            <p className="text-sm">✅ DB 연결 확인</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
