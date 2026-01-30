/**
 * 자동화(고정 지출/저축) 관련 타입 정의
 * 서버 액션 반환 타입 기준
 */

// 카테고리 (조인 결과)
export interface CategoryInfo {
  id: number;
  name: string;
  icon: string;
  type: string;
}

// 자산 계좌
export interface Asset {
  id: number;
  name: string;
  type: string;
}

// 고정 지출 (getFixedExpenses 반환 타입)
export interface FixedExpense {
  id: number;
  userId: string;
  title: string;
  amount: string;
  scheduledDay: number;
  type: "FIXED" | "ETC";
  categoryId: number | null;
  method: "CARD" | "CASH";
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  lastGeneratedMonth: string | null;
  createdAt: Date;
  updatedAt: Date;
  category: CategoryInfo | null;
}

// 고정 저축 (getFixedSavings 반환 타입)
export interface FixedSaving {
  id: number;
  userId: string;
  title: string;
  amount: string;
  scheduledDay: number;
  assetId: number | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  lastGeneratedMonth: string | null;
  createdAt: Date;
  updatedAt: Date;
  asset: Asset | null;
}
