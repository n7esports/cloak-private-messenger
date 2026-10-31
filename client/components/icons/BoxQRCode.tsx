"use client";

import QRCode from "qrcode";
import IconKey from "./IconKey";

const DARK_EMERALD = "#064e3b";
const EMERALD = "#10B981";

export default function BoxQRCode({ payload, size = 256 }: { payload: string; size?: number }) {
  if (!payload) return null;
  const qr = QRCode.create(payload, { errorCorrectionLevel: "H", margin: 2 } as any);
  const modules = qr.modules.data;
  const qrSize = qr.modules.size;
  const padding = Math.round(size * 0.04);
  const areaSize = size - padding * 2;
  const cellSize = areaSize / qrSize;
  const iconSize = size * 0.22;
  const iconLeft = (size - iconSize) / 2;
  const iconRight = iconLeft + iconSize;
  const iconTop = (size - iconSize) / 2;
  const iconBottom = iconTop + iconSize;

  const rects: { x: number; y: number; w: number; h: number; rx: number }[] = [];
  for (let row = 0; row < qrSize; row++) {
    for (let col = 0; col < qrSize; col++) {
      if (!modules[row * qrSize + col]) continue;
      const x = padding + col * cellSize;
      const y = padding + row * cellSize;
      const cx = x + cellSize / 2;
      const cy = y + cellSize / 2;
      if (cx >= iconLeft && cx <= iconRight && cy >= iconTop && cy <= iconBottom) continue;
      const mod = (row + col) % 3;
      const r = cellSize * 0.25;
      if (mod === 0) {
        const w = cellSize * 1.05;
        const h = cellSize * 0.22;
        rects.push({ x: x + (cellSize - w) / 2, y: y + (cellSize - h) / 2, w, h, rx: r });
      } else if (mod === 1) {
        const w = cellSize * 1.25;
        const h = cellSize * 0.16;
        rects.push({ x: x + (cellSize - w) / 2, y: y + (cellSize - h) / 2, w, h, rx: r });
      } else {
        const s = cellSize * 0.28;
        rects.push({ x: x + (cellSize - s) / 2, y: y + (cellSize - s) / 2, w: s, h: s, rx: r });
      }
    }
  }

  return (
    <div className="relative inline-block">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill={DARK_EMERALD} />
        {rects.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx} ry={r.rx} fill={EMERALD} />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: size * 0.2, height: size * 0.2, backgroundColor: DARK_EMERALD }}
        >
          <IconKey size={size * 0.1} className="text-emerald-400" />
        </div>
      </div>
    </div>
  );
}