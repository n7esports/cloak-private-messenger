"use client";

import { useMemo } from "react";
import QRCode from "qrcode";
import IconKey from "./IconKey";

const DARK = "#064e3b";
const EMERALD = "#10B981";

export default function BoxQRCode({ payload, size = 256 }: { payload: string; size?: number }) {
  if (!payload) return null;
  const qr = useMemo(() => QRCode.create(payload, { errorCorrectionLevel: "M" }), [payload]);
  const n = qr.modules.size;
  const cell = size / n;
  const circleSize = size * 0.28;
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill={DARK} rx={8} />
        {Array.from(qr.modules.data).map((v, i) => {
          if (!v) return null;
          const c = i % n;
          const r = Math.floor(i / n);
          return (
            <rect
              key={i}
              x={c * cell + cell * 0.08}
              y={r * cell + cell * 0.08}
              width={cell * 0.84}
              height={cell * 0.84}
              rx={4}
              ry={4}
              fill={EMERALD}
            />
          );
        })}
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
