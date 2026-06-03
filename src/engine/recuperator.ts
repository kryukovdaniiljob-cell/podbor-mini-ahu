// §6.3 Рекуператор (приточно-вытяжная установка)
import type { AirPropCoeffs, RecupResult, SizeData } from './types';
import { moistureContent, enthalpy } from './psychro';

export interface RecupArgs {
  t_outdoor: number;
  rh_outdoor: number;
  t_indoor: number;
  rh_indoor: number;
  t_supply: number;
  flow: number;
}

/** Температура приточного воздуха после рекуператора (J33) и эффективности. */
export function computeRecup(m60: SizeData, args: RecupArgs, coeffs: AirPropCoeffs): RecupResult {
  const CM = m60.preheat_CM ?? 0;
  const effT = m60.recup_eff_T ?? 0;
  const effH = m60.recup_eff_H ?? 0;

  // I33: t наружного с учётом преднагрева CM (кВт)
  const preheatDeltaT =
    CM > 0 ? (CM / 1.005 / args.flow / 353.5) * (273 + args.t_supply) * 3600 : 0;
  const I33 = Math.min(args.t_outdoor + preheatDeltaT, args.t_supply);

  // J33: после рекуператора по температуре
  const J33 = Math.min(I33 + effT * (args.t_indoor - I33), args.t_supply);

  const eff_T_pct = args.t_indoor - I33 !== 0 ? ((J33 - I33) / (args.t_indoor - I33)) * 100 : 0;

  // психрометрия
  const d_in = moistureContent(args.t_outdoor, args.rh_outdoor, coeffs);
  const h_in = enthalpy(args.t_outdoor, d_in);
  const d_indoor = moistureContent(args.t_indoor, args.rh_indoor, coeffs);
  const h_indoor = enthalpy(args.t_indoor, d_indoor);

  // энтальпийная эффективность по recup_eff_H
  const h_supply_out = h_in + effH * (h_indoor - h_in);
  const eff_H_pct = h_indoor - h_in !== 0 ? ((h_supply_out - h_in) / (h_indoor - h_in)) * 100 : 0;

  // температура вытяжки после рекуператора (отдаёт тепло)
  // балансовое приближение по эффективности температуры
  const t_exhaust_out = args.t_indoor - effT * (args.t_indoor - I33);

  return {
    t_supply_in: args.t_outdoor,
    t_supply_out: J33,
    rh_supply_in: args.rh_outdoor,
    d_supply_in: d_in,
    h_supply_in: h_in,
    t_exhaust_in: args.t_indoor,
    t_exhaust_out,
    rh_exhaust_in: args.rh_indoor,
    eff_T_pct,
    eff_H_pct,
    preheat_kW: CM,
  };
}
