/**
 * 前端侧校验:后端对 timerange 的非法值检查发生在**后台任务**里
 * (提交后先回 200 再失败,用户会先看到「任务已启动」的错误成功信号),
 * 这里在提交前拦下明显非法的输入。
 *
 * 语法与 freqtrade/configuration/timerange.py `_TIMERANGE_FORMATS` 逐条对齐:
 * 每侧可为 yyyymmdd / yyyymmddThhmm / yyyymmddThhmmss / epoch 秒(10 位)/
 * epoch 毫秒(13 位),两侧可混用,任一侧可留空(如 `20250901-`)。
 * 注意后端**不**接受 `20250901 08:00`(空格+冒号)形式。
 */

type TimeRangePart =
  | { kind: "date"; ymd: string; hms: string }
  | { kind: "epoch"; seconds: number };

const T_FORMAT_RE = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$/;

function isCalendarDate(y: number, mo: number, d: number): boolean {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function parsePart(text: string): TimeRangePart | null {
  if (/^\d{8}$/.test(text)) {
    const y = Number(text.slice(0, 4));
    const mo = Number(text.slice(4, 6));
    const d = Number(text.slice(6, 8));
    if (!isCalendarDate(y, mo, d)) return null;
    return { kind: "date", ymd: text, hms: "" };
  }
  const tm = T_FORMAT_RE.exec(text);
  if (tm) {
    const [, y, mo, d, hh, mm, ss] = tm;
    if (!isCalendarDate(Number(y), Number(mo), Number(d))) return null;
    if (Number(hh) > 23 || Number(mm) > 59 || (ss !== undefined && Number(ss) > 59)) return null;
    return { kind: "date", ymd: `${y}${mo}${d}`, hms: `${hh}${mm}${ss ?? "00"}` };
  }
  // epoch 秒(10 位)/毫秒(13 位);13 位与后端一致做 //1000 归一为秒
  if (/^\d{10}$/.test(text)) return { kind: "epoch", seconds: Number(text) };
  if (/^\d{13}$/.test(text)) return { kind: "epoch", seconds: Math.floor(Number(text) / 1000) };
  return null;
}

/** 归一到 epoch 秒(与后端 `_parse_timerange_part` 的返回一致)。 */
function partSeconds(p: TimeRangePart): number {
  if (p.kind === "epoch") return p.seconds;
  const y = Number(p.ymd.slice(0, 4));
  const mo = Number(p.ymd.slice(4, 6));
  const d = Number(p.ymd.slice(6, 8));
  const hh = p.hms ? Number(p.hms.slice(0, 2)) : 0;
  const mm = p.hms ? Number(p.hms.slice(2, 4)) : 0;
  const ss = p.hms ? Number(p.hms.slice(4, 6)) : 0;
  return Date.UTC(y, mo - 1, d, hh, mm, ss) / 1000;
}

function describeInvalid(seg: string): string {
  if (/^\d{8}$/.test(seg) || T_FORMAT_RE.test(seg)) return `不是合法日期:${seg}`;
  return `不支持的格式:${seg}(支持 YYYYMMDD / YYYYMMDDTHHMM(SS) / 10 或 13 位 epoch)`;
}

/**
 * 校验 freqtrade timerange。返回错误文案;null 表示通过。
 * 空串视为未填,交给调用方的必填逻辑。
 */
export function validateTimerange(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  // 与后端一致:split("-") 后恰好两段,且至少一段非空(纯 "-" 非法)
  const segs = v.split("-");
  if (segs.length !== 2 || (segs[0] === "" && segs[1] === "")) {
    return "格式应为 起始-结束(如 20250901-20251001,任一侧可留空)";
  }
  const parts: (TimeRangePart | null)[] = [];
  for (const seg of segs) {
    if (seg === "") {
      parts.push(null);
      continue;
    }
    const parsed = parsePart(seg);
    if (parsed === null) return describeInvalid(seg);
    parts.push(parsed);
  }
  const [start, stop] = parts;
  if (start && stop) {
    const s = partSeconds(start);
    const e = partSeconds(stop);
    // 与后端 `if start > stop > 0` 逐字对齐(结束侧解析为 epoch 0 时后端不校验顺序)
    if (s > e && e > 0) return "起始时间不能晚于结束时间";
  }
  return null;
}
