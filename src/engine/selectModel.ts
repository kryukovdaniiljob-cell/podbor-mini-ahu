// §3 Автоматический выбор модели (имя листа B26 = Q30/R30)
import type { SelectorInput } from './types';

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
