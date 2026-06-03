// §6.1–6.4, §7 Нагреватель (электрический / водяной) и смесительный узел MST
import type { MstUnit, WaterResult } from './types';

/**
 * §6.1 Требуемая мощность нагревателя R28, кВт.
 * tIn — t воздуха на входе в нагреватель (наружный для приточной,
 *        после рекуператора J33 для приточно-вытяжной).
 */
export function requiredHeaterKW(actualFlow: number, tSupply: number, tIn: number): number {
  const q = (actualFlow / 3600) * (353.5 / (273 + tSupply)) * (tSupply - tIn) * 1.01;
  return Math.max(q, 0);
}

/** §6.4 Достижимая t воздуха на выходе электрического нагревателя R31. */
export function tAfterElectricHeater(
  heaterPowerKW: number,
  tSupply: number,
  actualFlow: number,
  tIn: number,
): number {
  return (heaterPowerKW / 353.5) * ((tSupply + 273) / actualFlow) * 3600 + tIn;
}

/** §7 Расход воды через водяной калорифер, м³/ч. */
export function waterFlow(powerKW: number, tWaterIn: number, tWaterOut: number): number {
  const dt = tWaterIn - tWaterOut;
  if (dt <= 0) return 0;
  return ((powerKW / 4.2) * 3.6) / dt;
}

/**
 * §7 Подбор смесительного узла MST.
 * Критерий J = ((H - dpWater) * авторитет), авторитет учитывается, если >= 1/1.428.
 */
export function selectMst(
  units: MstUnit[],
  flowWaterM3h: number,
  dpWaterKPa: number,
): WaterResult {
  let best: { unit: MstUnit; J: number; authority: number } | null = null;

  for (const u of units) {
    const dpValve = (flowWaterM3h / u.Kvs) ** 2 * 100; // кПа
    let authority = dpValve + dpWaterKPa > 0 ? dpValve / (dpValve + dpWaterKPa) : 0;
    const H = u.a * flowWaterM3h ** 2 + u.b * flowWaterM3h + u.c;
    const authForCrit = authority >= 1 / 1.428 ? authority : 0;
    const J = (H - dpWaterKPa) * authForCrit < 0 ? 0 : (H - dpWaterKPa) * authForCrit;
    if (!best || J > best.J) best = { unit: u, J, authority };
  }

  return {
    flow_water_m3h: flowWaterM3h,
    dp_water_kPa: dpWaterKPa,
    mst_mark: best ? best.unit.mark : '—',
    valve_authority: best ? best.authority : 0,
  };
}
