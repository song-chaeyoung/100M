"use client";

import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { StockSearchResult } from "@/lib/validations/stock";
import { Search, X } from "lucide-react";

interface StockSearchInputProps {
  value?: StockSearchResult | null;
  onChange: (stock: StockSearchResult | null) => void;
  country?: "KR" | "US"; // 필터 (없으면 전체)
  placeholder?: string;
  error?: string;
}

export function StockSearchInput({
  value,
  onChange,
  country,
  placeholder = "종목명 또는 코드 검색 (예: 삼성전자, AAPL)",
  error,
}: StockSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 종목이 선택된 상태면 선택된 종목명 표시
  const displayValue = value
    ? `${value.stockCode} · ${value.stockName}`
    : query;

  const search = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!q.trim()) {
        setResults([]);
        setOpen(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const params = new URLSearchParams({ q });
          if (country) params.set("country", country);
          const res = await fetch(`/api/stocks/search?${params}`);
          if (res.ok) {
            const data = (await res.json()) as StockSearchResult[];
            setResults(data);
            setOpen(true);
          }
        } catch {
          // 검색 실패 시 무시
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [country],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    if (value) {
      // 선택된 종목 있을 때 입력하면 초기화
      onChange(null);
    }
    setQuery(q);
    search(q);
  };

  const handleSelect = (stock: StockSearchResult) => {
    onChange(stock);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const MARKET_BADGE: Record<string, string> = {
    KOSPI: "bg-blue-100 text-blue-700",
    KOSDAQ: "bg-green-100 text-green-700",
    NYSE: "bg-orange-100 text-orange-700",
    NASDAQ: "bg-purple-100 text-purple-700",
    AMEX: "bg-pink-100 text-pink-700",
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onBlur={() => {
            // 약간 딜레이 후 닫기 (클릭 이벤트 처리 후)
            setTimeout(() => setOpen(false), 150);
          }}
          placeholder={placeholder}
          className={cn(
            "pl-9 pr-9",
            error && "border-destructive",
            value && "text-foreground font-medium",
          )}
          readOnly={!!value} // 선택된 경우 직접 편집 불가
        />
        {(value || query) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}

      {/* 드롭다운 */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {loading ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              검색 중...
            </div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              검색 결과가 없습니다.
            </div>
          ) : (
            <ul className="max-h-60 overflow-auto py-1">
              {results.map((stock) => (
                <li
                  key={`${stock.stockCode}-${stock.market}`}
                  onMouseDown={() => handleSelect(stock)} // onBlur 이전에 실행
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent transition-colors"
                >
                  {/* 시장 배지 */}
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0",
                      MARKET_BADGE[stock.market] ??
                        "bg-muted text-muted-foreground",
                    )}
                  >
                    {stock.market}
                  </span>

                  {/* 종목 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm">
                        {stock.stockName}
                      </span>
                      {stock.stockNameEn && stock.country === "US" && (
                        <span className="text-xs text-muted-foreground truncate">
                          {stock.stockNameEn}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stock.stockCode}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
