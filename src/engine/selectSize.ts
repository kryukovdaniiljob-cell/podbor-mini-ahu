// §4 Выбор типоразмера: M60 (аэродинамика) и M61 (комплектация)
import type { ModelData, SizeData } from './types';
import { fanPressure } from './fan';

export interface QualifyInfo {
  size: SizeData;
  index: number;
  pFanAtReq: number;
  qualifies: boolean;
}

/** §4.1 Фильтр пригодности по кривой вентилятора в точке запроса. */
export function qualifySizes(model: ModelData, Qreq: number, Hreq: number): QualifyInfo[] {
  return model.sizes.map((size, index) => {
    const pFanAtReq = fanPressure(size, Qreq);
    return { size, index, pFanAtReq, qualifies: pFanAtReq - Hreq >= 0 };
  });
}

export interface SizeSelection {
  m60Index: number | null;
  m60: SizeData | null;
  error: string | null;
}

/** §4.2 M60 — типоразмер по аэродинамике. */
export function selectM60(
  model: ModelData,
  Qreq: number,
  Hreq: number,
  manual: boolean,
  manualSizeNo?: number,
): SizeSelection {
  if (manual) {
    const idx = (manualSizeNo ?? 1) - 1;
    if (idx < 0 || idx >= model.sizes.length) {
      return { m60Index: null, m60: null, error: 'Слишком большой номер типоразмера для выбранной модели!' };
    }
    return { m60Index: idx, m60: model.sizes[idx], error: null };
  }

  const qual = qualifySizes(model, Qreq, Hreq).filter((q) => q.qualifies);
  if (qual.length === 0) {
    return { m60Index: null, m60: null, error: 'Слишком большой расход/напор!' };
  }
  // минимальный score_O среди прошедших; при равенстве — первый по порядку
  let best = qual[0];
  for (const q of qual) {
    if (q.size.score_O < best.size.score_O) best = q;
  }
  return { m60Index: best.index, m60: best.size, error: null };
}

/** §4.3 M61 — типоразмер полной комплектации (подбор нагревателя). */
export function selectM61(
  model: ModelData,
  m60: SizeData,
  m60Index: number,
  requiredHeaterKW: number,
  heaterless: boolean,
  manual: boolean,
  manualSizeNo?: number,
): { m61Index: number; m61: SizeData } {
  if (manual) {
    const idx = (manualSizeNo ?? 1) - 1;
    return { m61Index: idx, m61: model.sizes[idx] };
  }
  if (heaterless) {
    return { m61Index: m60Index, m61: m60 };
  }

  // кандидаты с тем же score_O, что и M60
  const candidates = model.sizes
    .map((size, index) => ({ size, index }))
    .filter((c) => c.size.score_O === m60.score_O);

  const reqUp = Math.ceil(requiredHeaterKW); // ROUNDUP до целого
  // вариант с минимальным неотрицательным избытком
  let withCover: { size: SizeData; index: number; surplus: number } | null = null;
  let nearest: { size: SizeData; index: number; absSurplus: number } | null = null;

  for (const c of candidates) {
    const surplus = c.size.heater_power_kW - reqUp;
    if (surplus >= 0) {
      if (!withCover || surplus < withCover.surplus) withCover = { ...c, surplus };
    }
    const abs = Math.abs(c.size.heater_power_kW - requiredHeaterKW);
    if (!nearest || abs < nearest.absSurplus) nearest = { ...c, absSurplus: abs };
  }

  if (withCover) return { m61Index: withCover.index, m61: withCover.size };
  if (nearest) return { m61Index: nearest.index, m61: nearest.size };
  return { m61Index: m60Index, m61: m60 };
}
