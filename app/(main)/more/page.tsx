"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Monitor, Moon, Sun, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmountEditBottomSheet } from "@/components/more/goal/amount-edit-bottom-sheet";
import {
  getGoal,
  updateTargetAmount,
  updateInitialAmount,
  type GoalData,
} from "@/app/actions/goals";
import { toast } from "sonner";

export default function MorePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [goal, setGoal] = useState<GoalData | undefined>(undefined);

  // 모달 상태
  const [goalModalOpen, setGoalModalOpen] = useState<
    "target" | "initial" | null
  >(null);

  // 목표 데이터 조회
  const fetchGoal = useCallback(async () => {
    const result = await getGoal();

    if (result.success) {
      setGoal(result.data);
    } else {
      toast.error(result.error || "목표 조회에 실패했습니다.");
      setGoal(undefined);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    fetchGoal();
  }, [fetchGoal]);

  // 목표 금액 저장
  const handleSaveTargetAmount = async (value: number) => {
    if (!goal) return { success: false, error: "목표가 없습니다." };

    const result = await updateTargetAmount(goal.id, value);
    if (result.success) {
      setGoal({ ...goal, targetAmount: value });
    }
    return result;
  };

  // 초기 자금 저장
  const handleSaveInitialAmount = async (value: number) => {
    if (!goal) return { success: false, error: "목표가 없습니다." };

    const result = await updateInitialAmount(goal.id, value);
    if (result.success) {
      setGoal({ ...goal, initialAmount: value });
    }
    return result;
  };

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
            <li
              className="flex cursor-pointer items-center justify-between py-3 hover:text-primary"
              onClick={() => setGoalModalOpen("target")}
            >
              <span className="text-base">목표 금액 설정</span>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </div>
            </li>
            <li
              className="flex cursor-pointer items-center justify-between py-3 hover:text-primary"
              onClick={() => setGoalModalOpen("initial")}
            >
              <span className="text-base">초기 자금 설정</span>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </div>
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
            <li>
              <Link
                href="/more/app-info"
                className="block cursor-pointer py-2 text-base hover:text-primary"
              >
                앱 정보
              </Link>
            </li>
            <li>
              <Link
                href="/more/privacy"
                className="block cursor-pointer py-2 text-base hover:text-primary"
              >
                개인정보 처리방침
              </Link>
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

      {/* 목표 금액 수정 모달 */}
      <AmountEditBottomSheet
        key={
          goalModalOpen === "target"
            ? (goal?.targetAmount ?? 0)
            : "target-closed"
        }
        open={goalModalOpen === "target"}
        onOpenChange={() => setGoalModalOpen(null)}
        title="목표 금액 변경"
        description="달성하고 싶은 목표 금액을 입력해주세요."
        placeholder="목표 금액을 입력하세요"
        initialValue={goal?.targetAmount ?? 0}
        onSave={handleSaveTargetAmount}
      />

      {/* 초기 자금 수정 모달 */}
      <AmountEditBottomSheet
        key={
          goalModalOpen === "initial"
            ? (goal?.initialAmount ?? 0)
            : "initial-closed"
        }
        open={goalModalOpen === "initial"}
        onOpenChange={() => setGoalModalOpen(null)}
        title="초기 자금 변경"
        description="시작 시점의 보유 자금을 입력해주세요."
        placeholder="초기 자금을 입력하세요"
        initialValue={goal?.initialAmount ?? 0}
        onSave={handleSaveInitialAmount}
      />
    </div>
  );
}
