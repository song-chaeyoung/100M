import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background p-4">
      <div className="flex flex-1 flex-col justify-center">
        {/* 헤더 */}
        <div className="mb-12 text-center">
          <div className="mb-3 text-4xl">💰</div>
          <h1 className="mb-2 text-2xl font-semibold">일억모으기</h1>
          <p className="text-sm text-muted-foreground">
            소셜 계정으로 시작하세요
          </p>
        </div>

        {/* 로그인 버튼들 */}
        <div className="space-y-3">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              size="default"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google로 계속하기
            </Button>
          </form>

          <form
            action={async () => {
              "use server";
              await signIn("kakao", { redirectTo: "/" });
            }}
          >
            <Button
              type="submit"
              className="w-full bg-[#FEE500] text-[#000000] hover:bg-[#FEE500]/90"
              size="default"
            >
              <svg
                className="mr-2 h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 3C6.477 3 2 6.477 2 10.75c0 2.567 1.656 4.823 4.156 6.262l-.993 3.644a.5.5 0 00.746.576l4.42-2.946c.554.074 1.12.114 1.671.114 5.523 0 10-3.477 10-7.75S17.523 3 12 3z" />
              </svg>
              카카오로 계속하기
            </Button>
          </form>
        </div>
      </div>

      {/* 하단 약관 */}
      {/* <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">
          로그인하면{" "}
          <a href="#" className="underline">
            서비스 약관
          </a>{" "}
          및{" "}
          <a href="#" className="underline">
            개인정보 처리방침
          </a>
          에 동의하게 됩니다.
        </p>
      </div> */}
    </div>
  );
}
