// Разбор служебных пометок, вшитых в наименования типоразмеров в исходном Excel.
// «НЕДОСТУПНА» / «НЕАКТУАЛЬНО» — это статус из первоисточника, а не часть имени.
// Для отображения имя очищается, а статус показывается отдельной плашкой.

export interface ParsedName {
  clean: string;             // наименование без служебных слов
  status: string | null;     // человекочитаемый статус или null
}

const STATUS_MAP: Record<string, string> = {
  НЕДОСТУПНА: 'Архивная позиция (нет в актуальном прайсе)',
  НЕАКТУАЛЬНО: 'Снято с производства',
};

const STATUS_RE = /\s*(НЕДОСТУПНА|НЕАКТУАЛЬНО)\s*/gi;

export function parseDisplayName(raw: string): ParsedName {
  if (!raw) return { clean: raw, status: null };
  let status: string | null = null;
  const clean = raw
    .replace(STATUS_RE, (_m, word: string) => {
      const key = word.toUpperCase();
      if (STATUS_MAP[key]) status = STATUS_MAP[key];
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
  return { clean, status };
}
