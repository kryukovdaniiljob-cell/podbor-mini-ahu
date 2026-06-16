// Рисует аэродинамический график (кривая установки + кривая сети + рабочая точка
// + точка запроса) на canvas и возвращает PNG dataURL для вставки в PDF-отчёт.
// Самодостаточно: не зависит от DOM/Recharts, работает и для аналога.
import type { SelectorResult, SelectorInput } from '../engine/types';

export function chartToPng(result: SelectorResult, input: SelectorInput): string {
  const W = 900;
  const H = 460;
  const padL = 70;
  const padR = 24;
  const padT = 40;
  const padB = 56;
  const scale = 2; // ретина для чёткости

  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const pts = result.chart;
  if (!pts.length) return canvas.toDataURL('image/png');

  const xMax = Math.max(result.actual_flow, input.flow, result.Q_op) * 1.25 || 1000;
  const data = pts.filter((p) => p.Q <= xMax);
  const yMax = Math.max(...data.map((p) => Math.max(p.fan ?? 0, p.sys ?? 0)), input.head) * 1.1 || 100;

  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const sx = (q: number) => padL + (q / xMax) * plotW;
  const sy = (p: number) => padT + plotH - (p / yMax) * plotH;

  // сетка + оси
  ctx.strokeStyle = '#e2e8f0';
  ctx.fillStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.font = '12px Arial, sans-serif';
  ctx.textBaseline = 'middle';
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const val = (yMax / ySteps) * i;
    const y = sy(val);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(val)), padL - 8, y);
  }
  const xSteps = 6;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= xSteps; i++) {
    const val = (xMax / xSteps) * i;
    const x = sx(val);
    ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + plotH); ctx.strokeStyle = '#eef2f6'; ctx.stroke();
    ctx.fillText(String(Math.round(val)), x, padT + plotH + 8);
  }
  // подписи осей
  ctx.fillStyle = '#0f172a';
  ctx.font = '13px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Расход, м³/ч', padL + plotW / 2, H - 20);
  ctx.save();
  ctx.translate(16, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Напор, Па', 0, 0);
  ctx.restore();

  const drawCurve = (key: 'fan' | 'sys', color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    let started = false;
    for (const p of data) {
      const val = p[key];
      if (val == null) continue;
      const x = sx(p.Q);
      const y = sy(val);
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  drawCurve('fan', '#2f6fb5', 2.5); // кривая установки
  drawCurve('sys', '#e8742c', 2); // кривая сети

  // выноски к рабочей точке
  const wx = sx(result.actual_flow);
  const wy = sy(result.actual_head);
  ctx.strokeStyle = '#94a3b8';
  ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(wx, sy(0)); ctx.lineTo(wx, wy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(padL, wy); ctx.lineTo(wx, wy); ctx.stroke();
  ctx.setLineDash([]);

  // точка запроса
  ctx.fillStyle = '#0f172a';
  ctx.beginPath(); ctx.arc(sx(input.flow), sy(input.head), 4, 0, Math.PI * 2); ctx.fill();
  // рабочая точка
  ctx.fillStyle = '#2f9e44';
  ctx.beginPath(); ctx.arc(wx, wy, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#166534';
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Рабочая точка (${Math.round(result.actual_flow)}; ${Math.round(result.actual_head)})`, wx + 8, wy - 10);

  // легенда
  ctx.font = '12px Arial, sans-serif';
  ctx.textBaseline = 'middle';
  const ly = padT - 22;
  ctx.fillStyle = '#2f6fb5'; ctx.fillRect(padL, ly, 16, 3);
  ctx.fillStyle = '#0f172a'; ctx.textAlign = 'left'; ctx.fillText('Хар-ка установки', padL + 22, ly + 1);
  ctx.fillStyle = '#e8742c'; ctx.fillRect(padL + 160, ly, 16, 3);
  ctx.fillStyle = '#0f172a'; ctx.fillText('Хар-ка сети', padL + 182, ly + 1);

  return canvas.toDataURL('image/png');
}
