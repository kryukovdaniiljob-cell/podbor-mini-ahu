// §6.3 Рекуператор (приточно-вытяжная установка).
// Логика 1:1 с Excel MiniAHU (Лист_подбора стр.33-36, Расчеты стр.3-4,24-26).
// Различает РОТОРНЫЙ и ПЛАСТИНЧАТЫЙ рекуператоры: для пластинчатого температура
// вытяжки на выходе считается через энтальпийно-влажностный баланс с учётом
// конденсации, для роторного — по балансу явного тепла.
import type { AirPropCoeffs, RecupResult, SizeData } from './types';
import { satPressure, moistureContent, enthalpy } from './psychro';

export interface RecupArgs {
  t_outdoor: number;
  rh_outdoor: number;
  t_indoor: number;
  rh_indoor: number;
  t_supply: number;
  flow: number;
}

export type RecupKind = 'роторный' | 'пластинчатый';

/**
 * Численно ищет температуру T (°C), при которой влажный воздух с относительной
 * влажностью phi (%) имеет энтальпию h_target (кДж/кг). Сетка −50…tMax, шаг 0.1.
 * Аналог итерационного поиска в Excel.
 */
function solveT(h_target: number, phiPercent: number, tMax: number, coeffs: AirPropCoeffs): number {
  let bestT = -50;
  let bestErr = Infinity;
  for (let T = -50; T <= tMax + 1e-9; T += 0.1) {
    const h = enthalpy(T, moistureContent(T, phiPercent, coeffs));
    const err = Math.abs(h_target - h);
    if (err < bestErr) {
      bestErr = err;
      bestT = T;
    }
  }
  return bestT;
}

/** Полный расчёт рекуператора с учётом его типа. */
export function computeRecup(
  m60: SizeData,
  args: RecupArgs,
  coeffs: AirPropCoeffs,
  kind: RecupKind,
): RecupResult {
  const CM = m60.preheat_CM ?? 0;
  const effT = m60.recup_eff_T ?? 0;
  const effH = m60.recup_eff_H ?? 0;
  const { t_outdoor: to, rh_outdoor: rho, t_indoor: ti, rh_indoor: rhi, t_supply: ts, flow } = args;

  // 1) Преднагрев и вход притока
  const preheatDeltaT = CM > 0 ? (CM / 1.005 / flow / 353.5) * (273 + ts) * 3600 : 0;
  const I33 = Math.min(to + preheatDeltaT, ts);
  const E4 = (rho * satPressure(to, coeffs)) / satPressure(I33, coeffs); // φ притока на входе

  // 2) Приток на выходе
  const J33 = Math.min(I33 + effT * (ti - I33), ts);
  const eff_T_pct = ti - I33 !== 0 ? ((J33 - I33) / (ti - I33)) * 100 : 0;

  // 3) Энтальпии
  const d_si = moistureContent(I33, E4, coeffs);
  const Q25 = enthalpy(I33, d_si); // приток вход
  const d_ei = moistureContent(ti, rhi, coeffs);
  const Q26 = enthalpy(ti, d_ei); // вытяжка вход
  const R25 = Q25 + effH * (Q26 - Q25); // приток выход (энтальпия)
  const R26 = Q26 - (R25 - Q25); // вытяжка выход (энтальпия, баланс)
  const eff_H_pct = Q26 - Q25 !== 0 ? ((R25 - Q25) / (Q26 - Q25)) * 100 : 0;

  // 4) Вытяжка на выходе — ветвление по типу рекуператора
  let S25: number; // оценочная t вытяжки на выходе (для расчёта φ)
  if (kind === 'роторный') {
    S25 = ti - (J33 - I33);
  } else {
    const d_x = d_ei + (d_si - d_ei) * ((R26 - Q26) / (Q25 - Q26));
    S25 = (R26 - 2.5 * d_x) / (1.01 + 0.0018 * d_x);
  }
  // φ вытяжки на выходе
  const T25 =
    (1 / ((1555 + 1.12 * S25) / (R26 - 1.01 * S25) + 1)) * (101.3 / satPressure(S25, coeffs)) * 100;
  const rh_exhaust_out = Math.min(T25, kind === 'пластинчатый' ? 100 : 95);
  // итоговая t вытяжки на выходе
  const t_exhaust_out = Math.min(ti, solveT(R26, rh_exhaust_out, ti, coeffs));

  // φ притока на выходе (J34) — по тому же принципу
  const j34 =
    (1 / ((1555 + 1.12 * J33) / (R25 - 1.01 * J33) + 1)) * (101.3 / satPressure(J33, coeffs)) * 100;
  const rh_supply_out = Math.max(0, Math.min(j34, 100));

  return {
    recup_kind: kind,
    t_supply_in: to,
    t_supply_out: J33,
    rh_supply_in: E4,
    rh_supply_out,
    d_supply_in: d_si,
    h_supply_in: Q25,
    h_supply_out: R25,
    t_exhaust_in: ti,
    t_exhaust_out,
    rh_exhaust_in: rhi,
    rh_exhaust_out,
    d_exhaust_in: d_ei,
    h_exhaust_in: Q26,
    h_exhaust_out: R26,
    eff_T_pct,
    eff_H_pct,
    preheat_kW: CM,
  };
}
