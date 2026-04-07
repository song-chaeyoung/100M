import type { Metadata } from "next";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export const metadata: Metadata = {
  title: "로그인",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background p-4">
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-8 text-center">
          <Image
            src="/logo.PNG"
            alt="일억모으기 로고"
            className="mx-auto h-20 w-20"
            width={80}
            height={80}
          />
          <h1 className="mb-2 text-2xl font-semibold">일억모으기</h1>
          <p className="text-sm text-muted-foreground">
            소셜 계정으로 시작하세요
          </p>
        </div>

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

          <form
            action={async () => {
              "use server";
              await signIn("apple", { redirectTo: "/" });
            }}
          >
            <Button
              type="submit"
              className="w-full border border-border bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              size="default"
            >
              <svg
                className="mr-2 h-5 w-5"
                viewBox="0 0 384 512"
                fill="currentColor"
              >
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50.5-85.1-19-27.8-47.5-43.1-85.3-46-35.8-2.8-74.8 20.9-89.1 20.9-15.1 0-49.7-19.9-77-19.9C62.3 138.9 0 183.2 0 273.8c0 26.8 4.9 54.5 14.8 83.1 13.2 37.8 61.1 130.4 111 128.9 26.1-.6 44.6-18.6 78.5-18.6 32.9 0 50 18.6 79.1 18.6 50.4-.7 93.9-84.5 106.4-122.4-73.7-34.7-71.1-92.1-71.1-94.7zM261.8 86.2c27.2-32.3 24.7-61.6 23.9-72.2-24 .9-51.8 16.4-67.6 35.6-17.4 20.8-27.6 46.5-25.4 74 26.1 2 50.3-11.1 69.1-37.4z" />
              </svg>
              Apple로 계속하기
            </Button>
          </form>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">
          로그인하시면{" "}
          <a href="/terms" className="underline">
            서비스 약관
          </a>{" "}
          및{" "}
          <a href="/privacy" className="underline">
            개인정보 처리방침
          </a>
          에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
