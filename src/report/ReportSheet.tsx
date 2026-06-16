// Презентационный макет PDF-отчёта (A4, ширина ~794px). Рендерится офскрин и
// захватывается html2canvas → jsPDF. Кириллица и шрифты рендерятся браузером.
import type { SelectorResult, SelectorInput } from '../engine/types';
import { parseDisplayName } from '../engine/displayName';
import { imagesForModel, imageUrl } from '../data/modelImages';
import ShuftLogo from '../components/ShuftLogo';

interface Props {
  result: SelectorResult;
  input: SelectorInput;
  chartPng: string;
  reportNo: string;
  dateStr: string;
}

const fmt = (x: number | string | undefined, dec = 2): string => {
  if (x === undefined || x === null || x === '-' || x === '') return '—';
  if (typeof x === 'string') return x;
  return Number.isInteger(x) ? String(x) : x.toFixed(dec);
};
const money = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

const C = {
  ink: '#0f172a', stone: '#64748b', sand: '#e2e8f0', accent: '#2f6fb5',
  accentDark: '#24578f', shaft: '#0d1117', green: '#2f9e44',
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '3px 0', borderBottom: `1px solid ${C.sand}`, fontSize: 12 }}>
      <span style={{ color: C.stone }}>{label}</span>
      <span style={{ color: C.ink, fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function BlockTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: C.accentDark, margin: '14px 0 6px' }}>
      {children}
    </div>
  );
}

const DIM_KEYS = ['W','W1','W2','W3','H','H1','H2','H3','H4','L','L1','L2','L3','L4','D','d'] as const;

export default function ReportSheet({ result, input, chartPng, reportNo, dateStr }: Props) {
  const s = result.m61;
  const isSE = result.modelType === 'supply_exhaust';
  const r = result.recup;
  const name = parseDisplayName(result.fullName);
  const imgs = imagesForModel(result.modelName);

  return (
    <div style={{ width: 794, background: '#fff', color: C.ink, fontFamily: 'Inter, Arial, sans-serif', boxSizing: 'border-box' }}>
      {/* Шапка */}
      <div data-block style={{ background: C.shaft, color: '#fff', padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ShuftLogo color="#ffffff" className="h-9 w-auto" />
        <div style={{ textAlign: 'right', fontSize: 11, opacity: 0.85 }}>
          <div style={{ fontSize: 15, fontWeight: 600, opacity: 1 }}>Подбор КПВУ</div>
          <div>Отчёт № {reportNo}</div>
          <div>от {dateStr}</div>
        </div>
      </div>

      <div style={{ padding: '18px 28px 24px' }}>
        <div data-block>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{result.title}</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.accentDark, marginTop: 2 }}>
            {name.clean}{name.status ? ` (${name.status})` : ''}
          </div>
          <div style={{ fontSize: 11, color: C.stone, marginTop: 2 }}>
            Модель: {result.modelName} · типоразмер №{s?.size_no}
          </div>

          {/* Карточка изделия: фото + наличие/цена/ссылка */}
          <div style={{ display: 'flex', gap: 16, marginTop: 14, alignItems: 'flex-start' }}>
          {imgs && (
            <img src={imageUrl(imgs.photo)} crossOrigin="anonymous"
              style={{ width: 260, height: 'auto', border: `1px solid ${C.sand}`, borderRadius: 8, padding: 6, background: '#fff' }} />
          )}
          <div style={{ flex: 1, fontSize: 12 }}>
            {result.catalog && (
              <div style={{ fontSize: 20, fontWeight: 700, color: C.accentDark }}>{money(result.catalog.price)}</div>
            )}
            <div style={{ marginTop: 6 }}>
              <Row label="НС-код" value={result.stock?.code && result.stock.code !== '—' ? result.stock.code : '—'} />
              <Row label="Наличие на складе" value={result.stock && result.stock.qty > 0 ? `${result.stock.qty} шт.` : 'нет (0 шт.)'} />
              {result.catalog?.url && <Row label="Карточка товара" value={<span style={{ color: C.accent }}>{result.catalog.url}</span>} />}
            </div>
          </div>
        </div>
        </div>

        {/* Две колонки: запрос+установка слева, нагреватель/рекуператор справа */}
        <div data-block style={{ display: 'flex', gap: 24, marginTop: 6 }}>
          <div style={{ flex: 1 }}>
            <BlockTitle>Данные запроса</BlockTitle>
            <Row label="Расход воздуха" value={`${fmt(input.flow, 0)} м³/ч`} />
            <Row label="Напор (сеть)" value={`${fmt(input.head, 0)} Па`} />
            <Row label="t наружного воздуха" value={`${fmt(input.t_outdoor)} °C`} />
            <Row label="φ наружного воздуха" value={`${fmt(input.rh_outdoor)} %`} />
            <Row label="t приточного воздуха" value={`${fmt(input.t_supply)} °C`} />
            {isSE && <Row label="t внутреннего воздуха" value={`${fmt(input.t_indoor)} °C`} />}
            {isSE && <Row label="φ внутреннего воздуха" value={`${fmt(input.rh_indoor)} %`} />}

            <BlockTitle>Параметры установки</BlockTitle>
            <Row label="Фактический расход" value={`${fmt(result.actual_flow, 0)} м³/ч`} />
            <Row label="Фактический напор" value={`${fmt(result.actual_head, 0)} Па`} />
            <Row label="Рабочий расход Q_op" value={`${fmt(result.Q_op, 0)} м³/ч`} />
            <Row label="Фильтр приток" value={fmt(s?.filter_supply)} />
            {isSE && <Row label="Фильтр вытяжка" value={fmt(s?.filter_exhaust)} />}
            <Row label="Потребляемая мощность" value={`${fmt(s?.power_kW)} кВт`} />
            <Row label="Рабочий ток" value={`${fmt(s?.current_A)} А`} />
            <Row label="Напряжение вентилятора" value={`${fmt(s?.voltage_fan)} В`} />
            <Row label="Частота вращения" value={`${fmt(s?.rpm, 0)} об/мин`} />
          </div>

          <div style={{ flex: 1 }}>
            <BlockTitle>Нагреватель</BlockTitle>
            <Row label="Тип нагревателя" value={input.heater_type} />
            <Row label="Требуемая мощность" value={`${fmt(result.required_heater_kW)} кВт`} />
            <Row label="Номинальная мощность" value={`${fmt(result.nominal_heater_kW)} кВт`} />
            <Row label="Напряжение нагревателя" value={`${fmt(s?.voltage_heater)} В`} />
            <Row label="t воздуха на выходе" value={`${fmt(result.t_after_heater)} °C`} />
            {input.heater_type === 'водяной' && result.water && (
              <>
                <Row label="Расход воды" value={`${fmt(result.water.flow_water_m3h)} м³/ч`} />
                <Row label="Узел MST" value={result.water.mst_mark} />
              </>
            )}

            {isSE && r && (
              <>
                <BlockTitle>Рекуператор</BlockTitle>
                <Row label="Тип рекуператора" value={r.recup_kind} />
                <Row label="t приток вход / выход" value={`${fmt(r.t_supply_in)} / ${fmt(r.t_supply_out)} °C`} />
                <Row label="t вытяжка вход / выход" value={`${fmt(r.t_exhaust_in)} / ${fmt(r.t_exhaust_out)} °C`} />
                <Row label="Эффективность по t" value={`${fmt(r.eff_T_pct, 1)} %`} />
                <Row label="Эффективность по h" value={`${fmt(r.eff_H_pct, 1)} %`} />
              </>
            )}
          </div>
        </div>

        {/* График */}
        <div data-block>
          <BlockTitle>Аэродинамические характеристики</BlockTitle>
          <img src={chartPng} style={{ width: '100%', height: 'auto', border: `1px solid ${C.sand}`, borderRadius: 8 }} />
        </div>

        {/* Массогабаритные + чертежи */}
        <div data-block>
          <BlockTitle>Массогабаритные характеристики, мм</BlockTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', columnGap: 20 }}>
            {DIM_KEYS.map((k) => (
              <Row key={k} label={k} value={fmt(s?.dims?.[k])} />
            ))}
            <Row label="Вес" value={`${fmt(s?.dims?.weight_kg, 0)} кг`} />
          </div>
        </div>

        <div data-block style={{ marginTop: 18, paddingTop: 10, borderTop: `1px solid ${C.sand}`, fontSize: 10, color: C.stone, display: 'flex', justifyContent: 'space-between' }}>
          <span>SHUFT HVAC Technologies · Сервис подбора КПВУ</span>
          <span>Расчёт носит справочный характер</span>
        </div>
      </div>
    </div>
  );
}
