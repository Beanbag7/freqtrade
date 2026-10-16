/**
 * Custom klinecharts overlays for trade and strategy-signal markers.
 * Registered once at module scope (must run before chart init).
 */
import { registerOverlay, type OverlayTemplate } from "klinecharts";

export const TRADE_OVERLAY = "ftTradeTag";
export const SIGNAL_OVERLAY = "ftSignalTag";

export type TradeMarkerKind = "open-long" | "close-long" | "open-short" | "close-short";

export interface TradeMarkerExtend {
  kind: TradeMarkerKind;
  /** tooltip-less short label, e.g. "开" / "平" */
  label: string;
  color: string;
}

function kindShape(kind: TradeMarkerKind): { text: string; below: boolean } {
  switch (kind) {
    case "open-long":
      return { text: "▲", below: true };
    case "close-long":
      return { text: "▼", below: false };
    case "open-short":
      return { text: "▼", below: false };
    case "close-short":
      return { text: "▲", below: true };
  }
}

function makeTemplate(name: string, fontSize: number, withLabel: boolean): OverlayTemplate {
  return {
    name,
    totalStep: 1,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: (params) => {
      const { coordinates, overlay } = params;
      const point = coordinates[0];
      const ext = overlay.extendData as TradeMarkerExtend | undefined;
      if (!point || !ext) return [];
      const { text, below } = kindShape(ext.kind);
      const figures = [
        {
          type: "text" as const,
          attrs: {
            x: point.x,
            y: below ? point.y + (withLabel ? 16 : 10) : point.y - (withLabel ? 16 : 10),
            text,
            align: "center" as const,
            baseline: "middle" as const,
          },
          styles: { color: ext.color, size: fontSize },
          ignoreEvent: true,
        },
      ];
      if (withLabel && ext.label) {
        figures.push({
          type: "text" as const,
          attrs: {
            x: point.x,
            y: below ? point.y + 28 : point.y - 28,
            text: ext.label,
            align: "center" as const,
            baseline: "middle" as const,
          },
          styles: { color: ext.color, size: fontSize - 2 },
          ignoreEvent: true,
        });
      }
      return figures;
    },
  };
}

let registered = false;

/** Idempotent registration of the two marker overlay templates. */
export function registerTradeOverlays() {
  if (registered) return;
  registerOverlay(makeTemplate(TRADE_OVERLAY, 13, true));
  registerOverlay(makeTemplate(SIGNAL_OVERLAY, 10, false));
  registered = true;
}
