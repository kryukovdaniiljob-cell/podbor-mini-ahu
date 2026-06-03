// Оркестратор: вход → полный результат подбора
import database from '../data/models_data.json';
import type {
  ModelsDatabase,
  SelectorInput,
  SelectorResult,
  SizeData,
} from './types';
import { moistureContent, enthalpy } from './psychro';
import { workingPoint, buildChart, fanPressure } from './fan';
import { selectModelName } from './selectModel';
import { selectM60, selectM61, qualifySizes } from './selectSize';
import { computeRecup } from './recuperator';
import {
  requiredHeaterKW,
  tAfterElectricHeater,
  waterFlow,
  selectMst,
} from './heater';

const db = database as unknown as ModelsDatabase;

export function getDatabase(): ModelsDatabase {
  return db;
}

export function supplyModelNames(): string[] {
  return Object.keys(db.models).filter((m) => db.models[m].type === 'supply');
}
export function supplyExhaustModelNames(): string[] {
  return Object.keys(db.models).filter((m) => db.models[m].type === 'supply_exhaust');
}

const CAU_AIRTUBE = new Set(['CAU_F', 'CAU_W', 'Airtube']);

export function runSelection(inp: SelectorInput): SelectorResult {
  const warnings: string[] = [];
  const isSE = inp.installation_type === 'приточно-вытяжная';
  const manual = inp.selection_mode === 'вручную';
  const heaterless = inp.heater_type === 'без нагревателя';

  const Qreq = inp.flow;
  const Hreq = inp.head;
  const k = Qreq > 0 ? Hreq / Qreq ** 2 : 0;

  // психрометрия наружного / внутреннего
  const d_out = moistureContent(inp.t_outdoor, inp.rh_outdoor, db.air_properties);
  const h_out = enthalpy(inp.t_outdoor, d_out);
  const psy_outdoor = { d: d_out, h: h_out };
  let psy_indoor: { d: number; h: number } | undefined;
  if (isSE && inp.t_indoor != null && inp.rh_indoor != null) {
    const di = moistureContent(inp.t_indoor, inp.rh_indoor, db.air_properties);
    psy_indoor = { d: di, h: enthalpy(inp.t_indoor, di) };
  }

  const modelName = selectModelName(inp);
  const model = db.models[modelName];

  const emptyResult = (error: string): SelectorResult => ({
    ok: false,
    modelName,
    modelType: model ? model.type : isSE ? 'supply_exhaust' : 'supply',
    fullName: 'Не удалось подобрать установку!',
    title: `Компактная ${inp.installation_type} установка`,
    m60: null,
    m61: null,
    k,
    Q_op: 0,
    actual_flow: 0,
    actual_head: 0,
    chart: [],
    psy_outdoor,
    psy_indoor,
    required_heater_kW: 0,
    nominal_heater_kW: 0,
    t_after_heater: 0,
    warnings,
    error,
  });

  if (!model) return emptyResult(`Модель «${modelName}» не найдена в базе.`);

  // ---- M60 ----
  const sel60 = selectM60(model, Qreq, Hreq, manual, inp.manual_size_no);
  if (sel60.error || !sel60.m60) {
    return emptyResult(sel60.error || 'Не удалось подобрать типоразмер.');
  }
  const m60 = sel60.m60;
  const m60Index = sel60.m60Index!;

  // ---- аэродинамика ----
  const Q_op = workingPoint(m60, k);
  const useQopAsFlow = !isSE && CAU_AIRTUBE.has(modelName);
  const actual_flow = useQopAsFlow ? Q_op : Math.min(Qreq, Q_op);
  const actual_head = actual_flow ** 2 * k;
  const qMax = Math.max(Qreq, Q_op) * 1.3 + 500;
  const chart = buildChart(m60, k, qMax);

  // ---- рекуператор (П-В) ----
  let recup;
  let tIntoHeater = inp.t_outdoor; // вход нагревателя
  if (isSE && inp.t_indoor != null && inp.rh_indoor != null) {
    recup = computeRecup(
      m60,
      {
        t_outdoor: inp.t_outdoor,
        rh_outdoor: inp.rh_outdoor,
        t_indoor: inp.t_indoor,
        rh_indoor: inp.rh_indoor,
        t_supply: inp.t_supply,
        flow: inp.flow,
      },
      db.air_properties,
    );
    tIntoHeater = recup.t_supply_out; // J33
  }

  // ---- требуемая мощность нагревателя R28 ----
  const required_heater_kW = heaterless
    ? 0
    : requiredHeaterKW(actual_flow, inp.t_supply, tIntoHeater);

  // ---- M61 ----
  const sel61 = selectM61(
    model,
    m60,
    m60Index,
    required_heater_kW,
    heaterless,
    manual,
    inp.manual_size_no,
  );
  const m61: SizeData = sel61.m61;

  // ---- номинальная мощность R29 ----
  let nominal_heater_kW = 0;
  if (inp.heater_type === 'электрический') nominal_heater_kW = m61.heater_power_kW || 0;
  else if (inp.heater_type === 'водяной') nominal_heater_kW = m61.heater_power_kW || required_heater_kW;

  // ---- t после нагревателя R31 ----
  let t_after_heater = inp.t_supply;
  if (inp.heater_type === 'электрический') {
    t_after_heater = tAfterElectricHeater(
      m61.heater_power_kW || 0,
      inp.t_supply,
      actual_flow,
      tIntoHeater,
    );
  }

  // ---- водяной узел MST ----
  let water;
  if (inp.heater_type === 'водяной' && inp.t_water_in != null && inp.t_water_out != null) {
    const usedPower = Math.min(nominal_heater_kW || required_heater_kW, required_heater_kW || nominal_heater_kW);
    const fw = waterFlow(usedPower || required_heater_kW, inp.t_water_in, inp.t_water_out);
    // потери давления по воде: приближение из колонок калорифера (если нет — оценка)
    const dpWater = 0.5 * fw ** 2; // кПа (заглушка коэффициента при отсутствии данных)
    water = selectMst(db.mst_units, fw, dpWater);
  }

  // ---- предупреждения §9 ----
  if (required_heater_kW > nominal_heater_kW + 1e-6 && !heaterless) {
    warnings.push('Недостаточная мощность нагревателя!');
  }
  if (inp.t_supply - inp.t_outdoor < 1) {
    warnings.push('Слишком низкая температура приточного воздуха!');
  }
  if (isSE && inp.t_indoor != null && inp.t_indoor - inp.t_outdoor < 10) {
    warnings.push('Слишком маленькая температура вытяжного воздуха!');
  }
  if (!isSE && inp.heater_type === 'водяной' && inp.t_outdoor < -30) {
    warnings.push('Необходимо предусмотреть преднагрев!');
  }
  if (isSE && tIntoHeater < -30) {
    warnings.push('Необходимо предусмотреть внешний преднагрев!');
  }
  if (heaterless) {
    const limit = modelName === 'CAU_F' ? 11 : 3;
    if (m61.size_no > limit) {
      warnings.push('Режим «без нагревателя» недоступен для крупных типоразмеров.');
    }
  }

  return {
    ok: true,
    modelName,
    modelType: model.type,
    fullName: m61.name,
    title: `Компактная ${inp.installation_type} установка`,
    m60,
    m61,
    k,
    Q_op,
    actual_flow,
    actual_head,
    chart,
    psy_outdoor,
    psy_indoor,
    required_heater_kW,
    nominal_heater_kW,
    t_after_heater,
    recup,
    water,
    warnings,
    error: null,
  };
}

export { fanPressure };
