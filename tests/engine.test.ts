import { describe, it, expect } from 'vitest';
import { runSelection, findAnalog } from '../src/engine/engine';
import { satPressure, moistureContent, enthalpy } from '../src/engine/psychro';
import { fanPressure } from '../src/engine/fan';
import { findStock } from '../src/engine/stock';
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

  it('температура притока после рекуператора ≈ -4.08°C', () => {
    expect(within(res.recup!.t_supply_out, -4.08, 0.02)).toBe(true);
  });

  it('t вытяжки на выходе ≈ -14.3°C (пластинчатый, баланс с конденсацией)', () => {
    expect(res.recup!.recup_kind).toBe('пластинчатый');
    expect(Math.abs(res.recup!.t_exhaust_out - -14.3)).toBeLessThanOrEqual(0.5);
  });

  it('φ вытяжки на выходе = 100% (конденсация в пластинчатом)', () => {
    expect(res.recup!.rh_exhaust_out).toBeCloseTo(100, 1);
  });

  it('энтальпийный баланс: Q26≈31.07, R26≈-11.80, effH≈70.38%', () => {
    expect(within(res.recup!.h_exhaust_in, 31.07, 0.02)).toBe(true);
    expect(within(res.recup!.h_exhaust_out, -11.80, 0.05)).toBe(true);
    expect(within(res.recup!.eff_H_pct, 70.38, 0.02)).toBe(true);
  });
});

describe('Рекуператор: ветвление по типу', () => {
  const args = {
    t_outdoor: -30, rh_outdoor: 80, t_indoor: 18, rh_indoor: 40, t_supply: 21, flow: 500,
  };
  const plateSize = (db.models['Unimax_P_CE'].sizes as any[])[3]; // пластинчатая модель, size №4

  it('пластинчатый и роторный дают разную t вытяжки на тех же коэффициентах', async () => {
    const { computeRecup } = await import('../src/engine/recuperator');
    const plate = computeRecup(plateSize, args, db.air_properties, 'пластинчатый');
    const rotary = computeRecup(plateSize, args, db.air_properties, 'роторный');
    expect(Math.abs(plate.t_exhaust_out - -14.3)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(rotary.t_exhaust_out - -11.7)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(plate.t_exhaust_out - rotary.t_exhaust_out)).toBeGreaterThan(1.5);
  });

  it('для роторной модели (Unimax_R_*) используется роторная ветвь', () => {
    const r = runSelection({
      installation_type: 'приточно-вытяжная', selection_mode: 'вручную',
      manual_model_se: 'Unimax_R_SW', manual_size_no: 1,
      flow: 500, head: 150, t_outdoor: -30, rh_outdoor: 80, t_supply: 21,
      t_indoor: 18, rh_indoor: 40, recup_type: 'роторный', heater_type: 'водяной',
      t_water_in: 80, t_water_out: 60,
    });
    expect(r.recup!.recup_kind).toBe('роторный');
    expect(r.recup!.rh_exhaust_out).toBeCloseTo(95, 0); // роторный кэп 95%
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

describe('Складские остатки (НС-код + наличие)', () => {
  it('контрольный пример: Unimax P 1500 CE → НС-1058575, 14 шт', () => {
    const m = findStock('Unimax P 1500 CE');
    expect(m.code).toBe('НС-1058575');
    expect(m.qty).toBe(14);
  });
  it('вариант исполнения не путается (SW не матчит CE)', () => {
    const m = findStock('Unimax P 450 SW EC');
    // ближайшее SW-исполнение, не CE
    expect(m.matchedName).toMatch(/SW/);
    expect(m.matchedName).not.toMatch(/CE/);
  });
  it('AirTube 160 находится с наличием', () => {
    const m = findStock('AirTube 160');
    expect(m.code).toBe('НС-1170512');
    expect(m.qty).toBeGreaterThan(0);
  });
  it('ECO_A 160/1-2,4/1 находится', () => {
    const m = findStock('ECO_A 160/1-2,4/1');
    expect(m.code).toBe('НС-1084911');
  });
  it('отсутствующая позиция (CAUF 500) → qty 0', () => {
    const m = findStock('CAUF 500 VIM уцененная');
    expect(m.qty).toBe(0);
  });
  it('результат подбора содержит stock', () => {
    const r = runSelection({
      installation_type: 'приточно-вытяжная', selection_mode: 'вручную',
      manual_model_se: 'Unimax_P_CE', manual_size_no: 4,
      flow: 500, head: 150, t_outdoor: -30, rh_outdoor: 80, t_supply: 21,
      t_indoor: 18, rh_indoor: 40, recup_type: 'пластинчатый', heater_type: 'электрический',
    });
    expect(r.stock).toBeDefined();
    expect(r.stock!.code).toBe('НС-1058575');
  });
});

describe('Подбор аналога', () => {
  const input = {
    installation_type: 'приточно-вытяжная' as const,
    selection_mode: 'вручную' as const,
    manual_model_se: 'Unimax_P_CE', manual_size_no: 4,
    flow: 500, head: 150, t_outdoor: -30, rh_outdoor: 80, t_supply: 21,
    t_indoor: 18, rh_indoor: 40, recup_type: 'пластинчатый' as const,
    heater_type: 'электрический' as const,
  };
  const primary = runSelection(input);
  const { best, candidates } = findAnalog(input, primary);

  it('аналог найден и отличается от исходного', () => {
    expect(best).not.toBeNull();
    expect(best!.modelName !== primary.modelName || best!.m61?.name !== primary.m61?.name).toBe(true);
  });
  it('аналог того же типа установки', () => {
    expect(best!.modelType).toBe(primary.modelType);
  });
  it('аналог совместим по нагревателю (электрический, не водяная модель)', () => {
    expect(best!.modelName).not.toMatch(/_[CSV]W/);
  });
  it('приоритет отдаётся позициям в наличии', () => {
    if (candidates.some((c) => c.inStock)) {
      expect((best!.stock?.qty ?? 0)).toBeGreaterThan(0);
    }
  });

  it('аналог не архивный (нет пометки НЕДОСТУПНА/НЕАКТУАЛЬНО)', async () => {
    const { parseDisplayName } = await import('../src/engine/displayName');
    expect(parseDisplayName(best!.m61!.name).status).toBeNull();
  });

  it('среди кандидатов нет архивных/снятых позиций', async () => {
    const { parseDisplayName } = await import('../src/engine/displayName');
    for (const c of candidates) {
      expect(parseDisplayName(c.result.m61!.name).status).toBeNull();
    }
  });

  it('архивные не предлагаются ни при одном входе (сводка по сценариям)', async () => {
    const { parseDisplayName } = await import('../src/engine/displayName');
    const scenarios = [
      { installation_type: 'приточно-вытяжная', selection_mode: 'автоматический',
        recup_type: 'пластинчатый', heater_type: 'электрический',
        air_outlet: 'вбок', mounting: 'подвесная', motor_type: 'асинхронный' },
      { installation_type: 'приточная', selection_mode: 'автоматический',
        heater_type: 'электрический', case_type: 'изолированный',
        automation: 'встроенная', motor_type: 'асинхронный', wall_thickness: 'стандартная' },
    ].map((o) => ({ flow: 500, head: 150, t_outdoor: -30, rh_outdoor: 80, t_supply: 21, t_indoor: 18, rh_indoor: 40, ...o })) as any[];
    for (const s of scenarios) {
      const p = runSelection(s);
      const { candidates: cands } = findAnalog(s, p);
      for (const c of cands) {
        expect(parseDisplayName(c.result.m61!.name).status).toBeNull();
      }
    }
  });

  it('нет активного аналога → best=null (модалка покажет сообщение)', () => {
    const noAnalog = {
      installation_type: 'приточно-вытяжная' as const,
      selection_mode: 'вручную' as const,
      manual_model_se: 'Unimax_P_VW', manual_size_no: 4,
      flow: 2000, head: 300, t_outdoor: -30, rh_outdoor: 80, t_supply: 21,
      t_indoor: 18, rh_indoor: 40, recup_type: 'пластинчатый' as const,
      heater_type: 'водяной' as const, t_water_in: 80, t_water_out: 60,
    };
    const p = runSelection(noAnalog);
    const { best: b } = findAnalog(noAnalog, p);
    expect(b).toBeNull();
  });
});

describe('Синхронизация тип рекуператора ↔ модель Unimax (ручной режим)', () => {
  const seExists = (n: string) => Object.keys((db as any).models).includes(n)
    && (db as any).models[n].type === 'supply_exhaust';

  it('recupTypeOfModel определяет тип по имени', async () => {
    const { recupTypeOfModel } = await import('../src/engine/selectModel');
    expect(recupTypeOfModel('Unimax_P_SE')).toBe('пластинчатый');
    expect(recupTypeOfModel('Unimax_R_SE')).toBe('роторный');
    expect(recupTypeOfModel('Nova')).toBeNull();
  });

  it('Unimax_R_SE + пластинчатый → Unimax_P_SE и обратно', async () => {
    const { modelForRecupType } = await import('../src/engine/selectModel');
    expect(modelForRecupType('Unimax_R_SE', 'пластинчатый', seExists)).toBe('Unimax_P_SE');
    expect(modelForRecupType('Unimax_P_SE', 'роторный', seExists)).toBe('Unimax_R_SE');
  });

  it('у роторных нет C и _EC: C→S, _EC отбрасывается', async () => {
    const { modelForRecupType } = await import('../src/engine/selectModel');
    expect(modelForRecupType('Unimax_P_CE', 'роторный', seExists)).toBe('Unimax_R_SE');
    expect(modelForRecupType('Unimax_P_SW_EC', 'роторный', seExists)).toBe('Unimax_R_SW');
  });

  it('переключение меняет подобранную позицию (числа отличаются)', () => {
    const baseSE = {
      installation_type: 'приточно-вытяжная' as const, selection_mode: 'вручную' as const,
      manual_size_no: 1, flow: 500, head: 150, t_outdoor: -30, rh_outdoor: 80, t_supply: 21,
      t_indoor: 18, rh_indoor: 40, heater_type: 'электрический' as const,
    };
    const rotary = runSelection({ ...baseSE, manual_model_se: 'Unimax_R_SE', recup_type: 'роторный' });
    const plate = runSelection({ ...baseSE, manual_model_se: 'Unimax_P_SE', recup_type: 'пластинчатый' });
    expect(rotary.modelName).toBe('Unimax_R_SE');
    expect(plate.modelName).toBe('Unimax_P_SE');
    expect(rotary.m61!.name).not.toBe(plate.m61!.name);
    expect(rotary.recup!.recup_kind).toBe('роторный');
    expect(plate.recup!.recup_kind).toBe('пластинчатый');
  });
});

describe('Очистка служебных пометок в названии', () => {
  it('убирает НЕДОСТУПНА и возвращает статус', async () => {
    const { parseDisplayName } = await import('../src/engine/displayName');
    const r = parseDisplayName('ECO_A 200/1-3,0/1 НЕДОСТУПНА');
    expect(r.clean).toBe('ECO_A 200/1-3,0/1');
    expect(r.status).toMatch(/Архив/);
  });
  it('убирает НЕАКТУАЛЬНО', async () => {
    const { parseDisplayName } = await import('../src/engine/displayName');
    const r = parseDisplayName('Unimax P 2000 SW НЕАКТУАЛЬНО');
    expect(r.clean).toBe('Unimax P 2000 SW');
    expect(r.status).toMatch(/производства/);
  });
  it('обычное имя не меняется', async () => {
    const { parseDisplayName } = await import('../src/engine/displayName');
    const r = parseDisplayName('Unimax P 1500 CE');
    expect(r.clean).toBe('Unimax P 1500 CE');
    expect(r.status).toBeNull();
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
