/**
 * 前端侧校验:后端对 timerange 的日期_合法性_检查发生在后台任务里
 * (提交后先回 200 再失败,用户会先看到「任务已启动」的错误成功信号),
 * 这里在提交前拦下明显非法的输入。
 */

function isCalendarDate(yyyymmdd: string): boolean {
  const y = Number(yyyymmdd.slice(0, 4));
  const mo = Number(yyyymmdd.slice(4, 6));
  const d = Number(yyyymmdd.slice(6, 8));
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

/**
 * 校验 freqtrade timerange 的日期形式(YYYYMMDD / YYYYMMDD HH:MM,支持单边,
 * 如 `20250901-20251001`、`20250901-`、`-20251001`、`20250901 08:00-20251001`)。
 * 返回错误文案;null 表示通过。空串视为未填,交给调用方的必填逻辑。
 */
export function validateTimerange(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const m = /^(\d{8}(?: \d{2}:\d{2})?)?-(\d{8}(?: \d{2}:\d{2})?)?$/.exec(v);
  if (!m) return "格式应为 YYYYMMDD-YYYYMMDD(如 20250901-20251001)";
  const [, start, end] = m;
  if (!start && !end) return "格式应为 YYYYMMDD-YYYYMMDD";
  for (const seg of [start, end]) {
    if (!seg) continue;
    const date = seg.slice(0, 8);
    if (!isCalendarDate(date)) return `不是合法日期:${date}`;
  }
  if (start && end) {
    const s = start.slice(0, 8);
    const e = end.slice(0, 8);
    if (s > e) return "起始日期不能晚于结束日期";
  }
  return null;
}
