import { describe, it, expect } from 'vitest';
import { runSelection } from '../src/engine/engine';
import { satPressure, moistureContent, enthalpy } from '../src/engine/psychro';
import { fanPressure } from '../src/engine/fan';
import database from '../src/data/models_data.json';

const db = database as any;

const within = (a: number, b: number, pct = 0.01) =>
  Math.abs(a - b) <= Math.abs(b) * pct + 1e-9;

describe('§11 контрольный пример Unimax_P_CE (ручной, типоразмер 4)', () => {
  const input = {
    installation_type: 'приточно-вытяжная' as const,
    selection_mode: 'вручную' as const,
    manual_model_se: 'Unimax_P_CE',
    manual_size_no: 4,
    flow: 500,
    head: 150,
    t_outdoor: -30,
    rh_outdoor: 80,
    t_supply: 21,
    t_indoor: 18,
    rh_indoor: 40,
    recup_type: 'пластинчатый' as const,
    heater_type: 'электрический' as const,
  };
  const res = runSelection(input);

  it('выбрана модель Unimax_P_CE', () => {
    expect(res.modelName).toBe('Unimax_P_CE');
  });

  it('коэффициенты вентилятора M60', () => {
    expect(res.m60!.fan_a).toBeCloseTo(0.0002537, 8);
    expect(res.m60!.fan_b).toBeCloseTo(-0.6308, 6);
    expect(res.m60!.fan_c).toBeCloseTo(694.5, 3);
    expect(res.m60!.fan_d).toBeCloseTo(-8.66e-8, 12);
  });

  it('P_fan(0)=694.5, P_fan(500)≈431.7 ≥ 150', () => {
    expect(fanPressure(res.m60!, 0)).toBeCloseTo(694.5, 2);
    const p500 = fanPressure(res.m60!, 500);
    expect(within(p500, 431.7, 0.01)).toBe(true);
    expect(p500 - 150).toBeGreaterThan(0);
  });

  it('наклон сети k=0.0006', () => {
    expect(res.k).toBeCloseTo(0.0006, 8);
  });

  it('рабочий расход Q_op≈742', () => {
    expect(within(res.Q_op, 742, 0.01)).toBe(true);
  });

  it('actual_flow=500, actual_head=150', () => {
    expect(res.actual_flow).toBeCloseTo(500, 1);
    expect(res.actual_head).toBeCloseTo(150, 1);
  });

  it('психрометрия наружного: h≈-29.84, d≈0.19', () => {
    expect(within(res.psy_outdoor.h, -29.84, 0.02)).toBe(true);
    expect(within(res.psy_outdoor.d, 0.19, 0.05)).toBe(true);
  });

  it('требуемая мощность нагревателя R28≈4.23 кВт', () => {
    expect(within(res.required_heater_kW, 4.23, 0.02)).toBe(true);
  });

  it('температура после рекуператора ≈ -4.08°C', () => {
    expect(within(res.recup!.t_supply_out, -4.08, 0.02)).toBe(true);
  });
});

describe('§3 автоподбор модели', () => {
  const base = {
    installation_type: 'приточно-вытяжная' as const,
    selection_mode: 'автоматический' as const,
    flow: 500, head: 150, t_outdoor: -30, rh_outdoor: 80, t_supply: 21,
    t_indoor: 18, rh_indoor: 40, heater_type: 'электрический' as const,
  };
  it('пластинчатый, вбок, подвесная, ЕС → Unimax_P_CE_EC', () => {
    const r = runSelection({ ...base, recup_type: 'пластинчатый', air_outlet: 'вбок', mounting: 'подвесная', motor_type: 'ЕС' });
    expect(r.modelName).toBe('Unimax_P_CE_EC');
  });
  it('роторный, вбок, водяной → Unimax_R_SW', () => {
    const r = runSelection({ ...base, recup_type: 'роторный', air_outlet: 'вбок', heater_type: 'водяной', t_water_in: 80, t_water_out: 60 });
    expect(r.modelName).toBe('Unimax_R_SW');
  });
  it('без нагревателя → Nova', () => {
    const r = runSelection({ ...base, heater_type: 'без нагревателя' });
    expect(r.modelName).toBe('Nova');
  });
  it('приточная водяная встроенная → ECO_Slim_W', () => {
    const r = runSelection({ installation_type: 'приточная', selection_mode: 'автоматический', flow: 500, head: 150, t_outdoor: -20, rh_outdoor: 80, t_supply: 21, heater_type: 'водяной', automation: 'встроенная', t_water_in: 80, t_water_out: 60 });
    expect(r.modelName).toBe('ECO_Slim_W');
  });
});

describe('§6.0 психрометрия', () => {
  it('Psat монотонно растёт', () => {
    expect(satPressure(0, db.air_properties)).toBeGreaterThan(0);
    expect(satPressure(20, db.air_properties)).toBeGreaterThan(satPressure(0, db.air_properties));
  });
  it('энтальпия наружного (-30,80%)', () => {
    const d = moistureContent(-30, 80, db.air_properties);
    expect(within(enthalpy(-30, d), -29.84, 0.02)).toBe(true);
  });
});
