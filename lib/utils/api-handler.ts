/**
 * Server Action API 응답 타입
 */
export type ApiResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

/**
 * 느슨한 API 결과 타입 (Server Actions의 실제 반환 타입과 호환)
 */
export type LooseApiResult<T> =
  | { success: true; data?: T }
  | { success: false; error?: string }
  | { success: boolean; data?: T; error?: string };

/**
 * Promise.allSettled 결과를 처리하는 설정
 */
export interface ApiHandlerConfig<T extends unknown[]> {
  /** 각 API 실패 시 사용할 fallback 값 */
  fallbacks: T;
  /** 각 API rejected 시 표시할 에러 메시지 */
  errorMessages: string[];
}

/**
 * Promise.allSettled 결과 처리 결과
 */
export interface ApiHandlerResult<T extends unknown[]> {
  /** 성공한 데이터 또는 fallback 값 */
  data: T;
  /** 발생한 에러 메시지 배열 */
  errors: string[];
}

/**
 * 여러 Server Action API 호출을 Promise.allSettled로 처리하고
 * 각 결과를 파싱하여 데이터와 에러를 반환하는 유틸리티 함수
 *
 * @example
 * ```ts
 * const { data, errors } = await handleApiResults(
 *   [getAssetById(1), getAssets()],
 *   {
 *     fallbacks: [null, []],
 *     errorMessages: [
 *       "자산 정보 조회 중 오류가 발생했습니다.",
 *       "자산 목록 조회 중 오류가 발생했습니다."
 *     ]
 *   }
 * );
 *
 * const [asset, allAssets] = data;
 * ```
 */
export async function handleApiResults<T extends unknown[]>(
  promises: Promise<LooseApiResult<unknown>>[],
  config: ApiHandlerConfig<T>,
): Promise<ApiHandlerResult<T>> {
  // Promise.allSettled로 모든 요청 실행
  const results = await Promise.allSettled(promises);

  // 각 결과에서 데이터 추출 (실패 시 fallback 사용)
  const data = results.map((result, index) => {
    if (result.status === "fulfilled" && result.value.success) {
      return result.value.data ?? config.fallbacks[index];
    }
    return config.fallbacks[index];
  }) as unknown as T;

  // 에러 메시지 수집
  const errors = results
    .map((result, index) => {
      // Promise 자체가 rejected된 경우
      if (result.status === "rejected") {
        return config.errorMessages[index];
      }
      // Promise는 fulfilled지만 success: false인 경우
      if (result.status === "fulfilled" && !result.value.success) {
        return result.value.error ?? config.errorMessages[index];
      }
      return null;
    })
    .filter((error): error is string => error !== null);

  return { data, errors };
}
