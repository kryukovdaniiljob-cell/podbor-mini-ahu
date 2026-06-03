// §5 Аэродинамика: кривая вентилятора, кривая сети, рабочая точка, сетка графика
import type { SizeData, ChartPoint } from './types';

/** P_fan(Q) = a*Q^2 + b*Q + c + d*Q^3 */
export function fanPressure(size: Pick<SizeData, 'fan_a' | 'fan_b' | 'fan_c' | 'fan_d'>, Q: number): number {
  return size.fan_a * Q ** 2 + size.fan_b * Q + size.fan_c + size.fan_d * Q ** 3;
}

/** P_sys(Q) = k*Q^2 */
export function sysPressure(k: number, Q: number): number {
  return k * Q ** 2;
}

/**
 * Рабочая точка — наибольший положительный корень P_fan(Q) - P_sys(Q) = 0.
 * Плотный перебор + уточнение линейной интерполяцией.
 */
export function workingPoint(size: SizeData, k: number, qMax = 8000): number {
  const f = (Q: number) => fanPressure(size, Q) - k * Q ** 2;
  const step = 1;
  let lastRoot = 0;
  let prevQ = 0;
  let prevV = f(0);
  for (let Q = step; Q <= qMax; Q += step) {
    const v = f(Q);
    if (prevV >= 0 && v < 0) {
      // смена знака между prevQ и Q — линейная интерполяция
      const root = prevQ + (step * prevV) / (prevV - v);
      lastRoot = root;
    }
    prevQ = Q;
    prevV = v;
  }
  return lastRoot;
}

/** Сетка расходов как в Excel: 0..1000 переменный шаг, далее 100 до 2000, 200 до 7000.
 *  Для гладкости дополняем плотной сеткой. */
export function flowGrid(qMax: number): number[] {
  const pts = new Set<number>();
  for (let q = 0; q <= 1000; q += 10) pts.add(q);
  for (let q = 1000; q <= 2000; q += 50) pts.add(q);
  for (let q = 2000; q <= Math.max(7000, qMax * 1.2); q += 100) pts.add(q);
  return Array.from(pts).filter((q) => q <= Math.max(7000, qMax * 1.2)).sort((a, b) => a - b);
}

/** Серии графика: кривая вентилятора и кривая сети. */
export function buildChart(size: SizeData, k: number, qMax: number): ChartPoint[] {
  const grid = flowGrid(qMax);
  return grid.map((Q) => ({
    Q,
    fan: round2(fanPressure(size, Q)),
    sys: round2(sysPressure(k, Q)),
  }));
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
