"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

export function SignaturePad({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(Boolean(value));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#111";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawingRef.current = true;
    lastRef.current = pos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const cur = pos(e);
    const last = lastRef.current!;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(cur.x, cur.y);
    ctx.stroke();
    lastRef.current = cur;
    if (!hasDrawn) setHasDrawn(true);
  }

  function end() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="w-full h-48 rounded-md border bg-white touch-none"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
      />
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {hasDrawn ? "Unterschrift erfasst" : "Hier unterschreiben"}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          <Eraser className="h-4 w-4" /> Löschen
        </Button>
      </div>
    </div>
  );
}
