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

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">일억모으기 💰</h1>
            <p className="text-muted-foreground">환영합니다!</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="outline">
              로그아웃
            </Button>
          </form>
        </div>

        {/* 사용자 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>로그인 정보</CardTitle>
            <CardDescription>현재 로그인된 계정 정보입니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="h-16 w-16 rounded-full"
                />
              )}
              <div>
                <p className="text-lg font-semibold">{session.user.name}</p>
                <p className="text-sm text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="mb-2 text-sm font-medium">세션 정보 (디버그용)</p>
              <pre className="overflow-auto text-xs">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* 안내 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>🎉 로그인 성공!</CardTitle>
            <CardDescription>CHA-8 인증 구현이 완료되었습니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">✅ Google/Kakao 소셜 로그인 성공</p>
            <p className="text-sm">✅ 세션 유지 확인</p>
            <p className="text-sm">✅ DB에 사용자 정보 저장 확인</p>
            <p className="mt-4 text-sm text-muted-foreground">
              다음 단계: 홈 화면 및 가계부 기능 구현 (CHA-9)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
