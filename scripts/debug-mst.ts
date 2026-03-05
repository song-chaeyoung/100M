/**
 * MST 그룹코드 위치 탐색 스크립트
 * 삼성전자(005930) 레코드를 찾아서 각 바이트 오프셋에 무슨 값이 있는지 확인합니다.
 * 실행: npx tsx scripts/debug-mst.ts
 */
import * as iconv from "iconv-lite";
import { inflateRawSync } from "zlib";
import { config } from "dotenv";
import * as path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });

const KOSPI_URL =
  "https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip";

function extractFirstFileFromZip(zipBuffer: Buffer): Buffer {
  const sig = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  const idx = zipBuffer.indexOf(sig);
  if (idx === -1) throw new Error("ZIP 헤더 없음");
  const fnLen = zipBuffer.readUInt16LE(idx + 26);
  const exLen = zipBuffer.readUInt16LE(idx + 28);
  const method = zipBuffer.readUInt16LE(idx + 8);
  const size = zipBuffer.readUInt32LE(idx + 18);
  const start = idx + 30 + fnLen + exLen;
  const data = zipBuffer.slice(start, start + size);
  if (method === 0) return data;
  if (method === 8) return inflateRawSync(data);
  throw new Error("지원하지 않는 압축방식");
}

function analyzeRecord(line: Buffer) {
  console.log(`레코드 크기: ${line.length} bytes`);
  console.log(
    `단축코드  [0~8]  : "${iconv.decode(line.slice(0, 9), "euc-kr")}"`,
  );
  console.log(
    `ISIN     [9~20]  : "${iconv.decode(line.slice(9, 21), "euc-kr")}"`,
  );
  console.log(
    `한글명   [21~60] : "${iconv.decode(line.slice(21, 61), "euc-kr").trim()}"`,
  );
  console.log(
    `영문명   [61~100]: "${iconv.decode(line.slice(61, 101), "euc-kr").trim()}"`,
  );
  // 그룹코드 후보 구간들 출력
  for (const pos of [101, 103, 105, 107, 109, 228, 230]) {
    if (line.length > pos + 1) {
      const raw = line.slice(pos, pos + 2);
      const val = raw.toString("ascii");
      const hex = raw.toString("hex");
      console.log(`  offset ${pos}: "${val}" (hex: ${hex})`);
    }
  }
  console.log(`전체 hex:\n${line.toString("hex")}`);
}

async function main() {
  console.log("KOSPI MST 다운로드 중...");
  const res = await fetch(KOSPI_URL);
  const mstBuffer = extractFirstFileFromZip(
    Buffer.from(await res.arrayBuffer()),
  );
  console.log(`파일 크기: ${mstBuffer.length} bytes\n`);

  // 1. 삼성전자(005930) 레코드 찾기
  const target = Buffer.from("005930   ", "ascii");
  let found = -1;
  let offset = 0;
  while (offset < mstBuffer.length) {
    let lineEnd = mstBuffer.indexOf(0x0a, offset);
    if (lineEnd === -1) lineEnd = mstBuffer.length;
    const line = mstBuffer.slice(offset, lineEnd);
    if (line.slice(0, 9).equals(target)) {
      found = offset;
      break;
    }
    offset = lineEnd + 1;
  }

  if (found === -1) {
    console.log("❌ 삼성전자(005930) 없음, KR7 레코드 3개 출력:\n");
    offset = 0;
    let count = 0;
    while (offset < mstBuffer.length && count < 3) {
      let lineEnd = mstBuffer.indexOf(0x0a, offset);
      if (lineEnd === -1) lineEnd = mstBuffer.length;
      const line = mstBuffer.slice(offset, lineEnd);
      const isin = iconv.decode(line.slice(9, 21), "euc-kr");
      if (isin[2] === "7") {
        count++;
        console.log(`\n━━━ KR7 레코드 ${count} ━━━`);
        analyzeRecord(line);
      }
      offset = lineEnd + 1;
    }
  } else {
    let lineEnd = mstBuffer.indexOf(0x0a, found);
    if (lineEnd === -1) lineEnd = mstBuffer.length;
    console.log("✅ 삼성전자(005930) 발견!\n");
    analyzeRecord(mstBuffer.slice(found, lineEnd));
  }

  // 2. ISIN 타입별 통계 + 그룹코드 후보 탐색
  console.log("\n━━━ ISIN 타입별 통계 ━━━");
  const stats: Record<string, number> = {};
  const candidates: Record<string, Record<string, number>> = {};
  offset = 0;
  let total = 0;
  while (offset < mstBuffer.length) {
    let lineEnd = mstBuffer.indexOf(0x0a, offset);
    if (lineEnd === -1) lineEnd = mstBuffer.length;
    const line = mstBuffer.slice(offset, lineEnd);
    offset = lineEnd + 1;
    if (line.length < 22) continue;
    total++;
    const isin = iconv.decode(line.slice(9, 21), "euc-kr");
    const t = isin[2] ?? "?";
    stats[t] = (stats[t] || 0) + 1;
    for (const pos of [61, 63, 101, 103, 105, 107, 228, 230]) {
      if (line.length > pos + 1) {
        const val = line.slice(pos, pos + 2).toString("ascii");
        if (/^[A-Z]{2}$/.test(val)) {
          if (!candidates[pos]) candidates[pos] = {};
          candidates[pos][val] = (candidates[pos][val] || 0) + 1;
        }
      }
    }
  }
  console.log(`전체: ${total}건`);
  for (const [k, v] of Object.entries(stats).sort())
    console.log(`  ISIN[2]='${k}': ${v}건`);

  console.log("\n━━━ 그룹코드 후보 (대문자 2자리 패턴) ━━━");
  for (const [pos, codes] of Object.entries(candidates)) {
    const top = Object.entries(codes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, v]) => `${k}:${v}`)
      .join(", ");
    console.log(`  offset ${pos}: ${top}`);
  }
}

main().catch(console.error);
