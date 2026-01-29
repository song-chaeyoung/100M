"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { PageHeader } from "@/components/page-header";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MorePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader />

      <div className="space-y-8">
        {/* <section>
          <h3 className="mb-2 text-sm font-bold text-muted-foreground">
            분석 및 리포트
          </h3>
          <ul className="space-y-1">
            <li className="cursor-pointer py-2 text-base hover:text-primary">
              월별 분석 리포트
            </li>
            <li className="cursor-pointer py-2 text-base hover:text-primary">
              지출 vs 수입 비교
            </li>
            <li className="cursor-pointer py-2 text-base hover:text-primary">
              목표 달성 예상일
            </li>
          </ul>
        </section> */}

        <section>
          <h3 className="mb-2 text-sm font-bold text-muted-foreground">
            목표 및 설정
          </h3>
          <ul className="space-y-1">
            <li className="cursor-pointer py-2 text-base hover:text-primary">
              목표 금액 설정
            </li>
            <li className="cursor-pointer py-2 text-base hover:text-primary">
              초기 자금 설정
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold text-muted-foreground">
            커스터마이징
          </h3>
          <ul className="space-y-1">
            {/* <li className="cursor-pointer py-2 text-base hover:text-primary">
              카테고리 편집
            </li> */}
            <li className="py-2">
              <div className="mb-3 text-base">다크 모드</div>
              <div className="flex gap-2">
                <Button
                  variant={mounted && theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="flex-1"
                >
                  <Sun className="mr-2 h-4 w-4" />
                  라이트
                </Button>
                <Button
                  variant={mounted && theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="flex-1"
                >
                  <Moon className="mr-2 h-4 w-4" />
                  다크
                </Button>
                <Button
                  variant={
                    mounted && theme === "system" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setTheme("system")}
                  className="flex-1"
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  시스템
                </Button>
              </div>
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold text-muted-foreground">기타</h3>
          <ul className="space-y-1">
            <li className="cursor-pointer py-2 text-base hover:text-primary">
              앱 정보
            </li>
            <li className="cursor-pointer py-2 text-base hover:text-primary">
              개인정보 처리방침
            </li>
            <li
              className="cursor-pointer py-2 text-base text-red-500 hover:text-red-600"
              onClick={() => signOut()}
            >
              로그아웃
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
