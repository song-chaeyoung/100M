import {
  Control,
  Controller,
  useFieldArray,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAmount } from "@/lib/utils";
import { AssetFormValues } from "@/lib/validations/asset";
import { StockSearchResult } from "@/lib/validations/stock";
import { StockSearchInput } from "@/components/stocks/stock-search-input";

interface StockHoldingInputListProps {
  control: Control<AssetFormValues>;
  watch: UseFormWatch<AssetFormValues>;
  setValue: UseFormSetValue<AssetFormValues>;
}

export function StockHoldingInputList({
  control,
  watch,
  setValue,
}: StockHoldingInputListProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "stocks",
  });

  const handleStockSelect = (
    index: number,
    stock: StockSearchResult | null,
  ) => {
    if (stock) {
      setValue(`stocks.${index}.stockCode`, stock.stockCode, {
        shouldDirty: true,
      });
      setValue(`stocks.${index}.stockName`, stock.stockName, {
        shouldDirty: true,
      });
      setValue(`stocks.${index}.country`, stock.country as "KR" | "US", {
        shouldDirty: true,
      });
      setValue(`stocks.${index}.market`, stock.market, { shouldDirty: true });
    } else {
      setValue(`stocks.${index}.stockCode`, "", { shouldDirty: true });
      setValue(`stocks.${index}.stockName`, "", { shouldDirty: true });
      setValue(`stocks.${index}.country`, "KR", { shouldDirty: true });
      setValue(`stocks.${index}.market`, "KOSPI", { shouldDirty: true });
    }
  };

  return (
    <div className="space-y-6">
      {fields.map((field, index) => {
        const country = watch(`stocks.${index}.country`) as "KR" | "US";
        const quantity = watch(`stocks.${index}.quantity`);
        const avgPrice = watch(`stocks.${index}.avgPrice`);
        const stockCode = watch(`stocks.${index}.stockCode`);
        const stockName = watch(`stocks.${index}.stockName`);
        const market = watch(`stocks.${index}.market`);

        const selectedStock: StockSearchResult | null = stockCode
          ? {
              stockCode,
              stockName: stockName || "",
              stockNameEn: null,
              market: market || "KOSPI",
              country: country || "KR",
            }
          : null;

        return (
          <div
            key={field.id}
            className="p-4 border rounded-xl space-y-4 relative bg-card"
          >
            <div className="absolute top-4 right-4 z-10">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {/* 종목 검색 */}
            <div className="space-y-2 pt-2">
              <Label>종목 검색</Label>
              <StockSearchInput
                value={selectedStock}
                onChange={(val) => handleStockSelect(index, val)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* 수량 */}
              <div className="space-y-2">
                <Label>보유 수량</Label>
                <Controller
                  name={`stocks.${index}.quantity`}
                  control={control}
                  render={({ field: controllerField }) => (
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode={country === "US" ? "decimal" : "numeric"}
                        value={controllerField.value}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (country === "US") {
                            if (/^\d*\.?\d{0,6}$/.test(raw))
                              controllerField.onChange(raw);
                          } else {
                            controllerField.onChange(formatAmount(raw));
                          }
                        }}
                        placeholder={country === "US" ? "0.5" : "0"}
                        className="text-right pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        주
                      </span>
                    </div>
                  )}
                />
              </div>

              {/* 평단가 */}
              <div className="space-y-2">
                <Label>평단가</Label>
                <Controller
                  name={`stocks.${index}.avgPrice`}
                  control={control}
                  render={({ field: controllerField }) => (
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={controllerField.value}
                        onChange={(e) =>
                          controllerField.onChange(e.target.value)
                        }
                        placeholder="0"
                        className="text-right pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        {country === "US" ? "USD" : "원"}
                      </span>
                    </div>
                  )}
                />
              </div>
            </div>

            {/* 자동계산 평가금액 요약 */}
            {quantity && avgPrice && country === "KR" ? (
              <div className="bg-muted/40 border-t mx-[-16px] mb-[-16px] p-3 px-4 rounded-b-xl flex items-center justify-between text-sm mt-4">
                <span className="text-muted-foreground">초기 평가 금액</span>
                <span className="font-semibold text-primary">
                  {formatAmount(
                    String(
                      Math.round(
                        Number(quantity.replace(/,/g, "")) *
                          Number(avgPrice.replace(/,/g, "")),
                      ),
                    ),
                  )}{" "}
                  원
                </span>
              </div>
            ) : null}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          append({
            stockCode: "",
            stockName: "",
            country: "KR",
            market: "KOSPI",
            quantity: "",
            avgPrice: "",
          })
        }
        className="w-full border-dashed"
      >
        <Plus className="h-4 w-4 mr-2" /> 종목 추가하기
      </Button>
    </div>
  );
}
