// §3 Автоматический выбор модели (имя листа B26 = Q30/R30)
import type { RecupType, SelectorInput } from './types';

// ---- Синхронизация «Тип рекуператора» ↔ модель Unimax (ручной режим) ----
// Имя Unimax кодирует тип рекуператора: P = пластинчатый, R = роторный.
// Формат: Unimax_<P|R>_<S|V|C><W|E>[_EC]
//   S — вбок-напольная, V — вверх, C — вбок-подвесная; W — водяной, E — электр.;
//   суффикс _EC — EC-двигатель (только у пластинчатых).
const UNIMAX_RE = /^Unimax_(P|R)_([SVC])([WE])(_EC)?$/;

/** Тип рекуператора, зашитый в имени модели; null — если модель не Unimax (напр. Nova). */
export function recupTypeOfModel(modelName: string): RecupType | null {
  const m = UNIMAX_RE.exec(modelName);
  if (!m) return null;
  return m[1] === 'P' ? 'пластинчатый' : 'роторный';
}

/**
 * Подобрать парную модель Unimax для другого типа рекуператора, сохраняя по
 * возможности направление выброса (S/V/C), нагрев (W/E) и EC.
 * Если точного варианта нет (у роторных нет C-исполнения и нет _EC) — берётся
 * ближайший существующий. modelExists — проверка наличия модели в базе.
 */
export function modelForRecupType(
  modelName: string,
  target: RecupType,
  modelExists: (name: string) => boolean,
): string {
  const m = UNIMAX_RE.exec(modelName);
  if (!m) return modelName; // не Unimax (например Nova) — не трогаем
  const targetKind = target === 'пластинчатый' ? 'P' : 'R';
  if (m[1] === targetKind) return modelName; // уже нужный тип

  let orient = m[2];
  let ec = m[4] ?? '';
  if (targetKind === 'R') {
    // у роторных нет вбок-подвесного (C) и нет EC-исполнения
    if (orient === 'C') orient = 'S';
    ec = '';
  }
  const heater = m[3];

  const candidates = [
    `Unimax_${targetKind}_${orient}${heater}${ec}`,
    `Unimax_${targetKind}_${orient}${heater}`,
    `Unimax_${targetKind}_S${heater}${ec}`,
    `Unimax_${targetKind}_S${heater}`,
    `Unimax_${targetKind}_V${heater}`,
  ];
  for (const c of candidates) if (modelExists(c)) return c;
  return modelName; // на крайний случай не падаем
}

export function selectModelName(inp: SelectorInput): string {
  if (inp.installation_type === 'приточная') return selectSupply(inp);
  return selectSupplyExhaust(inp);
}

function selectSupply(inp: SelectorInput): string {
  if (inp.selection_mode === 'вручную') return inp.manual_model_supply || 'CAU_F';

  if (inp.heater_type === 'водяной') {
    return inp.automation === 'встроенная' ? 'ECO_Slim_W' : 'CAU_W';
  }
  if (inp.heater_type === 'без нагревателя') return 'CAU_F';

  if (inp.case_type === 'изолированный') {
    if (inp.automation === 'встроенная') {
      if (inp.motor_type === 'ЕС') return 'Swift';
      return inp.wall_thickness === 'стандартная' ? 'ECO_A' : 'ECO_Slim';
    }
    return 'CAU_F';
  }
  // не изолированный
  return 'Airtube';
}

function selectSupplyExhaust(inp: SelectorInput): string {
  if (inp.selection_mode === 'вручную') return inp.manual_model_se || 'Nova';
  if (inp.heater_type === 'без нагревателя') return 'Nova';

  let p = 'Unimax_';
  p += inp.recup_type === 'пластинчатый' ? 'P_' : 'R_';

  if (inp.recup_type === 'пластинчатый') {
    if (inp.air_outlet === 'вбок') p += inp.mounting === 'напольная' ? 'S' : 'C';
    else p += 'V';
  } else {
    p += inp.air_outlet === 'вбок' ? 'S' : 'V';
  }

  p += inp.heater_type === 'водяной' ? 'W' : 'E';
  if (inp.recup_type === 'пластинчатый' && inp.motor_type === 'ЕС') p += '_EC';
  return p;
}
