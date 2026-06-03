// §6.0 Психрометрия: давление насыщенного пара, влагосодержание, энтальпия
import type { AirPropCoeffs } from './types';

/** Давление насыщенного пара Psat(T), кПа */
export function satPressure(T: number, coeffs: AirPropCoeffs): number {
  if (T < 0) {
    const c = coeffs.sat_pressure_below0_kPa;
    return c.e * T ** 4 + c.d * T ** 3 + c.a * T ** 2 + c.b * T + c.c;
  }
  const c = coeffs.sat_pressure_above0_kPa;
  return c.d * T ** 3 + c.a * T ** 2 + c.b * T + c.c;
}

/** Влагосодержание d(T, φ), г/кг. φ в процентах. */
export function moistureContent(T: number, rhPercent: number, coeffs: AirPropCoeffs): number {
  const psat = satPressure(T, coeffs);
  const pv = (rhPercent / 100) * psat;
  if (pv <= 0) return 0;
  return 622 / (101.3 / pv - 1);
}

/** Энтальпия h(T, d), кДж/кг. d в г/кг. */
export function enthalpy(T: number, dGkg: number): number {
  return 1.01 * T + (2500 + 1.8 * T) * (dGkg / 1000);
}
