"use client";

import IconKey from "./IconKey";

const DARK = "#064e3b";
const EMERALD = "#10B981";

export default function BoxQRCode({ payload, size = 256 }: { payload: string; size?: number }) {
  if (!payload) return null;
  const cols = 8;
  const rows = 6;
  const gap = size * 0.04;
  const cellSize = (size - gap * (cols + 1)) / cols;
  const radius = 4;
  const cells: { c: number; r: number; fill: string }[] = [];
  // deterministic pattern from payload
  let h = 0;
  for (let i = 0; i < payload.length; i++) h = (h * 31 + payload.charCodeAt(i)) >>> 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = (h ^ (r * 37 + c * 13)) & 1;
      cells.push({ c, r, fill: v ? EMERALD : DARK });
    }
  }
  const circleSize = size * 0.28;
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill={DARK} rx={8} />
        {cells.map((cell, i) => (
          <rect
            key={i}
            x={gap + cell.c * (cellSize + gap)}
            y={gap + cell.r * (cellSize + gap)}
            width={cellSize}
            height={cellSize}
            rx={radius}
            ry={radius}
            fill={cell.fill}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: circleSize, height: circleSize, backgroundColor: DARK }}
        >
          <IconKey size={circleSize * 0.45} className="text-emerald-400" />
        </div>
      </div>
    </div>
  );
}