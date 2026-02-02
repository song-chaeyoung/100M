import { PageHeader } from "@/components/page-header";

export default function AppInfoPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader backHref="/more" />

      <div className="space-y-8">
        {/* 앱 기본 정보 */}
        <section className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="text-3xl font-bold text-primary">1억</span>
          </div>
          <h2 className="text-xl font-bold">일억모으기</h2>
          <p className="text-sm text-muted-foreground mt-1">버전 0.1.0</p>
        </section>

        {/* 앱 소개 */}
        <section>
          <h3 className="mb-3 text-sm font-bold text-muted-foreground">
            앱 소개
          </h3>
          <div className="rounded-lg bg-muted/50 p-4 space-y-3 text-sm">
            <p>
              <strong>일억모으기</strong>는 1억 원 저축 목표를 달성하기 위한
              개인 자산 관리 앱입니다.
            </p>
            <p>
              수입과 지출을 기록하고, 자산 현황을 한눈에 파악하며, 목표
              달성까지의 진행 상황을 추적할 수 있습니다.
            </p>
          </div>
        </section>

        {/* 주요 기능 */}
        <section>
          <h3 className="mb-3 text-sm font-bold text-muted-foreground">
            주요 기능
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>목표 금액 설정 및 달성률 추적</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>수입/지출 내역 관리</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>고정 지출 및 저축 자동화</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>저축 및 투자 자산 관리</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>다크 모드 지원</span>
            </li>
          </ul>
        </section>

        {/* 개발 정보 */}
        {/* <section>
          <h3 className="mb-3 text-sm font-bold text-muted-foreground">
            개발 정보
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">개발</span>
              <span>개인 프로젝트</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">기술 스택</span>
              <span>Next.js, React, TypeScript</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">문의</span>
              <span>-</span>
            </div>
          </div>
        </section> */}

        {/* 저작권 */}
        <section className="text-center text-xs text-muted-foreground pt-4">
          <p>© 2024-2025 일억모으기. All rights reserved.</p>
        </section>
      </div>
    </div>
  );
}
