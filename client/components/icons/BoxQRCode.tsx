"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import IconKey from "./IconKey";

const OBSIDIAN = "#0f131c";
const EMERALD = "#10B981";

export default function BoxQRCode({
  payload,
  size = 256,
}: {
  payload: string;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !payload) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const qr = QRCode.create(payload, { errorCorrectionLevel: "H", margin: 2 } as any);
    const modules = qr.modules.data;
    const qrSize = qr.modules.size;

    canvas.width = size;
    canvas.height = size;

    const padding = size * 0.04;
    const areaSize = size - padding * 2;
    const cellSize = areaSize / qrSize;

    ctx.fillStyle = OBSIDIAN;
    ctx.fillRect(0, 0, size, size);

    const iconSize = size * 0.22;
    const iconLeft = (size - iconSize) / 2;
    const iconRight = iconLeft + iconSize;
    const iconTop = (size - iconSize) / 2;
    const iconBottom = iconTop + iconSize;

    ctx.fillStyle = EMERALD;

    for (let row = 0; row < qrSize; row++) {
      for (let col = 0; col < qrSize; col++) {
        if (!modules[row * qrSize + col]) continue;

        const x = padding + col * cellSize;
        const y = padding + row * cellSize;
        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;

        if (cx >= iconLeft && cx <= iconRight && cy >= iconTop && cy <= iconBottom) {
          continue;
        }

        const mod = (row + col) % 3;
        const r = cellSize * 0.25;

        if (mod === 0) {
          // short pill
          const w = cellSize * 1.05;
          const h = cellSize * 0.22;
          roundRect(ctx, x + (cellSize - w) / 2, y + (cellSize - h) / 2, w, h, r);
        } else if (mod === 1) {
          // long horizontal bar
          const w = cellSize * 1.25;
          const h = cellSize * 0.16;
          roundRect(ctx, x + (cellSize - w) / 2, y + (cellSize - h) / 2, w, h, r);
        } else {
          // small rounded square
          const s = cellSize * 0.28;
          roundRect(ctx, x + (cellSize - s) / 2, y + (cellSize - s) / 2, s, s, r);
        }
      }
    }
  }, [payload, size]);

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="block rounded-lg"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="flex items-center justify-center rounded-full bg-surface/90"
          style={{ width: size * 0.2, height: size * 0.2 }}
        >
          <IconKey size={size * 0.1} className="text-primary" />
        </div>
      </div>
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}
