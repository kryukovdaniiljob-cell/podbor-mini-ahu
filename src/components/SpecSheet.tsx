import type { SelectorResult, SelectorInput } from '../engine/types';
import { parseDisplayName } from '../engine/displayName';

interface Props {
  result: SelectorResult;
  input: SelectorInput;
}

const fmt = (x: number | string | undefined, dec = 2): string => {
  if (x === undefined || x === null || x === '-' || x === '') return '—';
  if (typeof x === 'string') return x;
  return Number.isInteger(x) ? String(x) : x.toFixed(dec);
};

function Row({ label, value, unit }: { label: string; value: React.ReactNode; unit?: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-sand/70 text-sm">
      <span className="text-ink/60">{label}</span>
      <span className="font-heading font-medium text-ink text-right tabular-nums">
        {value}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="font-heading text-xs font-semibold uppercase tracking-wide text-accent-dark mb-2 flex items-center gap-2">
        <span className="h-1 w-1 rounded-full bg-accent" />
        {title}
      </h4>
      <div>{children}</div>
    </div>
  );
}

const DIM_KEYS = ['W','W1','W2','W3','H','H1','H2','H3','H4','L','L1','L2','L3','L4','D','d'] as const;

export default function SpecSheet({ result, input }: Props) {
  if (!result.ok || !result.m61) {
    return (
      <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 font-heading font-medium text-accent-dark">
        {result.fullName}
      </div>
    );
  }
  const s = result.m61;
  const isSE = result.modelType === 'supply_exhaust';
  const r = result.recup;

  return (
    <div className="text-ink">
      <div className="mb-5 border-b border-sand pb-4">
        <h2 className="font-heading text-xl font-semibold text-ink">{result.title}</h2>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <p className="font-heading text-lg font-medium text-accent-dark">
            {parseDisplayName(result.fullName).clean}
          </p>
          {parseDisplayName(result.fullName).status && (
            <span
              title={parseDisplayName(result.fullName).status!}
              className="rounded-md bg-stone/20 px-2 py-0.5 text-xs font-heading text-ink/60"
            >
              {parseDisplayName(result.fullName).status}
            </span>
          )}
        </div>
        <p className="text-xs text-stone mt-1">Модель: {result.modelName} · типоразмер №{s.size_no}</p>

        {result.stock && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-ink/5 px-2.5 py-1 text-sm">
              <span className="font-heading text-ink/60">НС-код:</span>
              <span className="font-heading font-semibold text-ink tabular-nums">
                {result.stock.code !== '—' ? result.stock.code : 'не найден'}
              </span>
            </span>
            <span
              className={
                'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-heading font-semibold ' +
                (result.stock.qty > 0
                  ? 'bg-green/15 text-green'
                  : 'bg-stone/20 text-ink/60')
              }
            >
              {result.stock.qty > 0 ? `● На складе: ${result.stock.qty} шт.` : '○ Нет на складе (0 шт.)'}
            </span>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-x-8">
        <div>
          <Block title="Данные запроса">
            <Row label="Расход воздуха" value={fmt(input.flow, 0)} unit="м³/ч" />
            <Row label="Напор (сеть)" value={fmt(input.head, 0)} unit="Па" />
            <Row label="t наружного воздуха" value={fmt(input.t_outdoor)} unit="°C" />
            <Row label="φ наружного воздуха" value={fmt(input.rh_outdoor)} unit="%" />
            <Row label="t приточного воздуха" value={fmt(input.t_supply)} unit="°C" />
            {isSE && <Row label="t внутреннего воздуха" value={fmt(input.t_indoor)} unit="°C" />}
            {isSE && <Row label="φ внутреннего воздуха" value={fmt(input.rh_indoor)} unit="%" />}
          </Block>

          <Block title="Параметры установки">
            <Row label="Фактический расход (E25)" value={fmt(result.actual_flow, 0)} unit="м³/ч" />
            <Row label="Фактический напор (E26)" value={fmt(result.actual_head, 0)} unit="Па" />
            <Row label="Рабочий расход Q_op" value={fmt(result.Q_op, 0)} unit="м³/ч" />
            <Row label="Фильтр приток" value={fmt(s.filter_supply)} />
            {isSE && <Row label="Фильтр вытяжка" value={fmt(s.filter_exhaust)} />}
            <Row label="Потребляемая мощность" value={fmt(s.power_kW)} unit="кВт" />
            <Row label="Рабочий ток" value={fmt(s.current_A)} unit="А" />
            <Row label="Напряжение вентилятора" value={fmt(s.voltage_fan)} unit="В" />
            <Row label="Частота вращения" value={fmt(s.rpm, 0)} unit="об/мин" />
          </Block>

          <Block title="Нагреватель">
            <Row label="Тип нагревателя" value={input.heater_type} />
            <Row label="Требуемая мощность (R28)" value={fmt(result.required_heater_kW)} unit="кВт" />
            <Row label="Номинальная мощность (R29)" value={fmt(result.nominal_heater_kW)} unit="кВт" />
            <Row label="Напряжение нагревателя" value={fmt(s.voltage_heater)} unit="В" />
            <Row label="t воздуха на входе" value={fmt(isSE && r ? r.t_supply_out : input.t_outdoor)} unit="°C" />
            <Row label="t воздуха на выходе (R31)" value={fmt(result.t_after_heater)} unit="°C" />
            {input.heater_type === 'водяной' && result.water && (
              <>
                <Row label="t воды вход/выход" value={`${fmt(input.t_water_in)} / ${fmt(input.t_water_out)}`} unit="°C" />
                <Row label="Расход воды" value={fmt(result.water.flow_water_m3h)} unit="м³/ч" />
                <Row label="Потери давления (вода)" value={fmt(result.water.dp_water_kPa)} unit="кПа" />
                <Row label="Смесительный узел MST" value={result.water.mst_mark} />
                <Row label="Авторитет клапана" value={fmt(result.water.valve_authority)} />
              </>
            )}
          </Block>
        </div>

        <div>
          {isSE && r && (
            <Block title="Рекуператор">
              <Row label="t приток вход" value={fmt(r.t_supply_in)} unit="°C" />
              <Row label="t приток после рекуператора" value={fmt(r.t_supply_out)} unit="°C" />
              <Row label="φ приток вход" value={fmt(r.rh_supply_in)} unit="%" />
              <Row label="Влагосодержание приток" value={fmt(r.d_supply_in)} unit="г/кг" />
              <Row label="Энтальпия приток" value={fmt(r.h_supply_in)} unit="кДж/кг" />
              <Row label="t вытяжка вход" value={fmt(r.t_exhaust_in)} unit="°C" />
              <Row label="t вытяжка выход" value={fmt(r.t_exhaust_out)} unit="°C" />
              <Row label="Преднагрев" value={fmt(r.preheat_kW)} unit="кВт" />
              <Row label="Эффективность по температуре" value={fmt(r.eff_T_pct, 1)} unit="%" />
              <Row label="Эффективность по энтальпии" value={fmt(r.eff_H_pct, 1)} unit="%" />
            </Block>
          )}

          <Block title="Массогабаритные характеристики, мм">
            <div className="grid grid-cols-2 gap-x-6">
              {DIM_KEYS.map((kk) => (
                <Row key={kk} label={kk} value={fmt(s.dims?.[kk])} />
              ))}
            </div>
            <Row label="Вес" value={fmt(s.dims?.weight_kg, 0)} unit="кг" />
          </Block>

          {s.accessories && (
            <Block title="Комплектация / автоматика">
              {Object.entries(s.accessories).map(([key, val]) => {
                const label = key.includes(':') ? key.split(':').slice(1).join(':') : key;
                return <Row key={key} label={label} value={fmt(val as any)} />;
              })}
            </Block>
          )}
        </div>
      </div>
    </div>
  );
}
