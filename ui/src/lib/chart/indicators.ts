/**
 * Generic "column line" indicator for klinecharts: renders precomputed
 * strategy indicator columns (from /plot_config + /pair_candles) as line
 * figures. Values are injected via extendData as a timestamp → value map.
 */
import {
  registerIndicator,
  type Indicator,
  type IndicatorTemplate,
  type KLineData,
} from "klinecharts";

export const FT_LINE_INDICATOR = "ftColumnLine";

export interface FtLineExtend {
  map: Record<number, number>;
}

let registered = false;

export function registerColumnLineIndicator() {
  if (registered) return;
  const template = {
    name: FT_LINE_INDICATOR,
    shortName: "",
    figures: [{ key: "value", title: "", type: "line" }],
    calc: (dataList: KLineData[], indicator: Indicator) => {
      const ext = indicator.extendData as FtLineExtend | undefined;
      return dataList.map((d: KLineData) => {
        const v = ext?.map[d.timestamp];
        return { value: typeof v === "number" && Number.isFinite(v) ? v : Number.NaN };
      });
    },
  } as unknown as IndicatorTemplate;
  registerIndicator(template);
  registered = true;
}
