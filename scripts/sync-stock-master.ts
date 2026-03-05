/**
 * 종목 마스터 동기화 스크립트
 * 한국투자증권 KIS Developers에서 마스터파일을 다운로드하여
 * stock_master 테이블에 insert합니다.
 *
 * 실행: npx tsx scripts/sync-stock-master.ts
 *
 * 참고 (Python):
 *   stocks_info/kis_kospi_code_mst.py    → 국내 종목 파싱
 *   stocks_info/overseas_stock_code.py  → 해외 종목 파싱
 */

import * as fs from "fs";
import * as path from "path";
import * as iconv from "iconv-lite";
import { inflateRawSync } from "zlib";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { stockMaster } from "../db/schema";
import { eq } from "drizzle-orm";
import type { NewStockMaster } from "../db/schema";

// .env.local 로드
config({ path: path.resolve(process.cwd(), ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL 환경변수가 없습니다.");

const db = drizzle(neon(DATABASE_URL));

// ─────────────────────────────────────────────
// URL 정의
// ─────────────────────────────────────────────

// 국내: .mst (binary, EUC-KR)
const KR_URLS: Record<string, string> = {
  KOSPI: "https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip",
  KOSDAQ:
    "https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip",
};

// 해외: {val}mst.cod.zip (탭 구분 텍스트, cp949)
// 참고: overseas_stock_code.py의 실제 URL 패턴
const US_MARKET_CODES: Record<string, string> = {
  NASDAQ: "nas",
  NYSE: "nys",
  AMEX: "ams",
};

type KRMarket = "KOSPI" | "KOSDAQ";
type USMarket = "NASDAQ" | "NYSE" | "AMEX";
type Market = KRMarket | USMarket;

// ─────────────────────────────────────────────
// ZIP 압축 해제 (adm-zip 없이)
// ─────────────────────────────────────────────

function extractFirstFileFromZip(zipBuffer: Buffer): Buffer {
  const sig = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  const headerIdx = zipBuffer.indexOf(sig);
  if (headerIdx === -1) throw new Error("ZIP 헤더를 찾을 수 없습니다.");

  const fileNameLen = zipBuffer.readUInt16LE(headerIdx + 26);
  const extraFieldLen = zipBuffer.readUInt16LE(headerIdx + 28);
  const compressionMethod = zipBuffer.readUInt16LE(headerIdx + 8);
  const compressedSize = zipBuffer.readUInt32LE(headerIdx + 18);
  const dataStart = headerIdx + 30 + fileNameLen + extraFieldLen;
  const compressedData = zipBuffer.slice(dataStart, dataStart + compressedSize);

  if (compressionMethod === 0) return compressedData;
  if (compressionMethod === 8) return inflateRawSync(compressedData);
  throw new Error(`지원하지 않는 압축 방식: ${compressionMethod}`);
}

async function downloadZipAndExtract(
  url: string,
  tmpPath: string,
): Promise<Buffer> {
  console.log(`  다운로드 중... ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`다운로드 실패 (${res.status}): ${url}`);
  const zipBuffer = Buffer.from(await res.arrayBuffer());
  const content = extractFirstFileFromZip(zipBuffer);
  fs.writeFileSync(tmpPath, content);
  return content;
}

// ─────────────────────────────────────────────
// 국내 .mst 파싱 (KOSPI / KOSDAQ)
//
// 디버깅으로 확인한 필드 레이아웃:
//   offset  0~ 8: 단축코드 (9 bytes, EUC-KR)
//   offset  9~20: 표준코드/ISIN (12 bytes)
//   offset 21~60: 한글종목명 (40 bytes, EUC-KR)
//   offset 61~62: 증권그룹구분코드 (2 bytes, ASCII)
//                 "ST"=주식 ✅ / "EF"=ETF / "EN"=ETN / "BC"=수익증권 등
// ─────────────────────────────────────────────

function parseKRMaster(mstBuffer: Buffer, market: KRMarket): NewStockMaster[] {
  const records: NewStockMaster[] = [];
  let offset = 0;

  while (offset < mstBuffer.length) {
    let lineEnd = mstBuffer.indexOf(0x0a, offset);
    if (lineEnd === -1) lineEnd = mstBuffer.length;

    const line = mstBuffer.slice(offset, lineEnd);
    offset = lineEnd + 1;

    if (line.length < 63) continue;

    // 단축코드 (offset 0, 9 bytes)
    const stockCode = iconv
      .decode(line.slice(0, 9), "euc-kr")
      .trim()
      .replace(/\s+/g, "");
    if (!stockCode || stockCode.length < 5) continue;

    // 증권그룹구분코드 (offset 61, 2 bytes) — "ST"만 주식
    const groupCode = line.slice(61, 63).toString("ascii");
    if (groupCode !== "ST") continue;

    // 한글종목명 (offset 21, 40 bytes)
    const stockName = iconv.decode(line.slice(21, 61), "euc-kr").trim();
    if (!stockName) continue;

    records.push({
      stockCode,
      stockName,
      stockNameEn: null,
      market,
      country: "KR",
    });
  }

  return records;
}

// ─────────────────────────────────────────────
// 해외 .cod 파싱 (NASDAQ / NYSE / AMEX)
//
// 파일 형식: 탭(\t) 구분 텍스트, cp949 인코딩
// 칼럼 (overseas_stock_code.py 참조):
//   [0] National code
//   [1] Exchange id
//   [2] Exchange code
//   [3] Exchange name
//   [4] Symbol (티커)
//   [5] realtime symbol
//   [6] Korea name (한글명)
//   [7] English name (영문명)
//   [8] Security type (1:Index, 2:Stock, 3:ETP/ETF, 4:Warrant)
//   ...
// ─────────────────────────────────────────────

function parseUSMaster(codBuffer: Buffer, market: USMarket): NewStockMaster[] {
  const records: NewStockMaster[] = [];

  // cp949 → 문자열 변환 후 줄 단위로 분리
  const text = iconv.decode(codBuffer, "cp949");
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    const cols = line.split("\t");
    if (cols.length < 9) continue;

    const stockCode = cols[4]?.trim(); // Symbol
    const stockName = cols[6]?.trim(); // Korea name (한글명, 없으면 영문명)
    const stockNameEn = cols[7]?.trim(); // English name
    const securityType = cols[8]?.trim(); // "1"=Index, "2"=Stock, "3"=ETF, "4"=Warrant

    if (!stockCode) continue;

    // 주식(2)만 포함, ETF(3)/Warrant(4)/Index(1) 제외
    if (securityType !== "2") continue;

    const displayName = stockName || stockNameEn || stockCode;

    records.push({
      stockCode,
      stockName: displayName,
      stockNameEn: stockNameEn || null,
      market,
      country: "US",
    });
  }

  return records;
}

// ─────────────────────────────────────────────
// DB insert (기존 시장 데이터 교체)
// ─────────────────────────────────────────────

async function upsertStockMaster(
  records: NewStockMaster[],
  market: Market,
): Promise<void> {
  if (records.length === 0) {
    console.log(`  [${market}] 삽입할 데이터 없음`);
    return;
  }

  await db.delete(stockMaster).where(eq(stockMaster.market, market));
  console.log(`  [${market}] 기존 데이터 삭제 완료`);

  const BATCH = 500;
  for (let i = 0; i < records.length; i += BATCH) {
    await db.insert(stockMaster).values(records.slice(i, i + BATCH));
    process.stdout.write(
      `  insert ${Math.min(i + BATCH, records.length)}/${records.length}건\r`,
    );
  }
  console.log("");
}

// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────

async function main() {
  const tmpDir = path.join(process.cwd(), "tmp_mst");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  const krMarkets: KRMarket[] = ["KOSPI", "KOSDAQ"];
  const usMarkets: USMarket[] = ["NASDAQ", "NYSE", "AMEX"];

  // ── 국내 동기화
  for (const market of krMarkets) {
    try {
      console.log(`\n━━━ [${market}] 동기화 시작 ━━━`);
      const url = KR_URLS[market];
      const mstBuffer = await downloadZipAndExtract(
        url,
        path.join(tmpDir, `${market}.mst`),
      );
      const records = parseKRMaster(mstBuffer, market);
      console.log(`[${market}] 파싱 완료: ${records.length}건`);
      await upsertStockMaster(records, market);
      console.log(`[${market}] DB insert 완료 ✓`);
    } catch (err) {
      console.error(`[${market}] 오류 발생:`, err);
    }
  }

  // ── 해외 동기화
  for (const market of usMarkets) {
    try {
      console.log(`\n━━━ [${market}] 동기화 시작 ━━━`);
      const val = US_MARKET_CODES[market];
      const url = `https://new.real.download.dws.co.kr/common/master/${val}mst.cod.zip`;
      const codBuffer = await downloadZipAndExtract(
        url,
        path.join(tmpDir, `${market}.cod`),
      );
      const records = parseUSMaster(codBuffer, market);
      console.log(`[${market}] 파싱 완료: ${records.length}건`);
      await upsertStockMaster(records, market);
      console.log(`[${market}] DB insert 완료 ✓`);
    } catch (err) {
      console.error(`[${market}] 오류 발생:`, err);
    }
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log("\n✅ 전체 동기화 완료");
  process.exit(0);
}

main().catch((err) => {
  console.error("동기화 실패:", err);
  process.exit(1);
});
