import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * UI 显示设置(与雾白墨绿设计规范对齐:主题为规范锁定的单一亮色身份,
 * 不提供暗色切换;此处仅承载显示时区)。
 * freqUI parity:设置页中的 timezone 项;theme 项经决策不移植(见工作单据边界)。
 */
interface UiSettingsState {
  /** 显示时区:"local" 跟随浏览器,否则为 IANA 名称(如 "UTC"、"Asia/Shanghai")。 */
  timezone: string;
  setTimezone: (tz: string) => void;
}

export const useUiSettings = create<UiSettingsState>()(
  persist(
    (set) => ({
      timezone: "local",
      setTimezone: (timezone) => set({ timezone }),
    }),
    { name: "freqtrade-ui-settings" },
  ),
);

export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "local", label: "跟随浏览器" },
  { value: "UTC", label: "UTC" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai(UTC+8)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo(UTC+9)" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Europe/Berlin", label: "Europe/Berlin" },
  { value: "America/New_York", label: "America/New_York" },
  { value: "America/Chicago", label: "America/Chicago" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles" },
];

/** 取出 Date 在目标时区下的各字段(补零字符串)。 */
export function datePartsInTz(d: Date): {
  y: string;
  m: string;
  day: string;
  h: string;
  min: string;
  s: string;
} {
  const tz = useUiSettings.getState().timezone;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (tz === "local") {
    return {
      y: String(d.getFullYear()),
      m: pad(d.getMonth() + 1),
      day: pad(d.getDate()),
      h: pad(d.getHours()),
      min: pad(d.getMinutes()),
      s: pad(d.getSeconds()),
    };
  }
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
        .formatToParts(d)
        .map((p) => [p.type, p.value]),
    );
    // en-CA hour12:false 午夜可能给出 "24"
    return {
      y: parts.year ?? "0000",
      m: parts.month ?? "01",
      day: parts.day ?? "01",
      h: parts.hour === "24" ? "00" : (parts.hour ?? "00"),
      min: parts.minute ?? "00",
      s: parts.second ?? "00",
    };
  } catch {
    // 非法时区名兜底为浏览器本地
    return {
      y: String(d.getFullYear()),
      m: pad(d.getMonth() + 1),
      day: pad(d.getDate()),
      h: pad(d.getHours()),
      min: pad(d.getMinutes()),
      s: pad(d.getSeconds()),
    };
  }
}
