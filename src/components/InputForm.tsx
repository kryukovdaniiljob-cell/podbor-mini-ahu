import type { RecupType, SelectorInput } from '../engine/types';
import { supplyModelNames, supplyExhaustModelNames } from '../engine/engine';
import { recupTypeOfModel, modelForRecupType } from '../engine/selectModel';

interface Props {
  value: SelectorInput;
  onChange: (v: SelectorInput) => void;
}

const fieldCls =
  'w-full rounded-lg border border-sand bg-paper px-2.5 py-1.5 text-sm text-ink transition focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30';
const labelCls = 'block text-xs font-heading font-medium text-ink/60 mb-1';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="font-heading text-xs font-semibold uppercase tracking-wide text-accent-dark mb-2.5 flex items-center gap-2">
        <span className="h-1 w-1 rounded-full bg-accent" />
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-2.5">{children}</div>
    </div>
  );
}

export default function InputForm({ value, onChange }: Props) {
  const v = value;
  const set = (patch: Partial<SelectorInput>) => onChange({ ...v, ...patch });
  const isSE = v.installation_type === 'приточно-вытяжная';
  const manual = v.selection_mode === 'вручную';

  const seModels = supplyExhaustModelNames();
  const seExists = (name: string) => seModels.includes(name);

  // Ручной режим: «Тип рекуператора» ↔ модель Unimax синхронизируются.
  // (Альтернатива по Excel — в ручном режиме скрыть селектор и показывать тип
  //  как read-only от модели; реализован основной вариант — рабочее переключение.)
  const onRecupTypeChange = (rt: RecupType) => {
    if (manual && v.manual_model_se && recupTypeOfModel(v.manual_model_se)) {
      set({ recup_type: rt, manual_model_se: modelForRecupType(v.manual_model_se, rt, seExists) });
    } else {
      set({ recup_type: rt });
    }
  };

  const onManualModelSeChange = (model: string) => {
    const rt = recupTypeOfModel(model); // синхронизируем селектор с моделью
    set(rt ? { manual_model_se: model, recup_type: rt } : { manual_model_se: model });
  };

  const num = (key: keyof SelectorInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = e.target.value === '' ? undefined : Number(e.target.value);
    set({ [key]: n } as Partial<SelectorInput>);
  };

  return (
    <div className="text-sm">
      <Section title="Тип и режим подбора">
        <div>
          <label className={labelCls}>Тип установки</label>
          <select className={fieldCls} value={v.installation_type}
            onChange={(e) => set({ installation_type: e.target.value as any })}>
            <option>приточная</option>
            <option>приточно-вытяжная</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Способ подбора</label>
          <select className={fieldCls} value={v.selection_mode}
            onChange={(e) => set({ selection_mode: e.target.value as any })}>
            <option>автоматический</option>
            <option>вручную</option>
          </select>
        </div>
        {manual && !isSE && (
          <div>
            <label className={labelCls}>Модель (приточная)</label>
            <select className={fieldCls} value={v.manual_model_supply || supplyModelNames()[0]}
              onChange={(e) => set({ manual_model_supply: e.target.value })}>
              {supplyModelNames().map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        )}
        {manual && isSE && (
          <div>
            <label className={labelCls}>Модель (приточно-вытяжная)</label>
            <select className={fieldCls} value={v.manual_model_se || seModels[0]}
              onChange={(e) => onManualModelSeChange(e.target.value)}>
              {seModels.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        )}
        {manual && (
          <div>
            <label className={labelCls}>№ типоразмера</label>
            <input type="number" min={1} className={fieldCls} value={v.manual_size_no ?? 1} onChange={num('manual_size_no')} />
          </div>
        )}
      </Section>

      <Section title="Воздушные параметры — приток">
        <div>
          <label className={labelCls}>Расход, м³/ч</label>
          <input type="number" min={1} className={fieldCls} value={v.flow} onChange={num('flow')} />
        </div>
        <div>
          <label className={labelCls}>Напор, Па (1…1100)</label>
          <input type="number" min={1} max={1100} className={fieldCls} value={v.head} onChange={num('head')} />
        </div>
        <div>
          <label className={labelCls}>t наружного, °C (−60…+30)</label>
          <input type="number" className={fieldCls} value={v.t_outdoor} onChange={num('t_outdoor')} />
        </div>
        <div>
          <label className={labelCls}>φ наружного, % (1…100)</label>
          <input type="number" min={1} max={100} className={fieldCls} value={v.rh_outdoor} onChange={num('rh_outdoor')} />
        </div>
        <div>
          <label className={labelCls}>t приточного, °C (0…+50)</label>
          <input type="number" className={fieldCls} value={v.t_supply} onChange={num('t_supply')} />
        </div>
      </Section>

      {isSE && (
        <Section title="Воздушные параметры — вытяжка">
          <div>
            <label className={labelCls}>t внутреннего, °C</label>
            <input type="number" className={fieldCls} value={v.t_indoor ?? 18} onChange={num('t_indoor')} />
          </div>
          <div>
            <label className={labelCls}>φ внутреннего, %</label>
            <input type="number" min={1} max={100} className={fieldCls} value={v.rh_indoor ?? 40} onChange={num('rh_indoor')} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Тип рекуператора</label>
            <select className={fieldCls} value={v.recup_type || 'пластинчатый'}
              onChange={(e) => onRecupTypeChange(e.target.value as RecupType)}>
              <option>пластинчатый</option>
              <option>роторный</option>
            </select>
          </div>
        </Section>
      )}

      <Section title="Нагреватель">
        <div className="col-span-2">
          <label className={labelCls}>Тип нагревателя</label>
          <select className={fieldCls} value={v.heater_type}
            onChange={(e) => set({ heater_type: e.target.value as any })}>
            <option>электрический</option>
            <option>водяной</option>
            <option>без нагревателя</option>
          </select>
        </div>
        {v.heater_type === 'водяной' && (
          <>
            <div>
              <label className={labelCls}>t воды вход, °C (40…90)</label>
              <input type="number" className={fieldCls} value={v.t_water_in ?? 80} onChange={num('t_water_in')} />
            </div>
            <div>
              <label className={labelCls}>t воды выход, °C</label>
              <input type="number" className={fieldCls} value={v.t_water_out ?? 60} onChange={num('t_water_out')} />
            </div>
          </>
        )}
      </Section>

      {!manual && (
        <Section title="Конструктив / опции (автоподбор)">
          {!isSE && (
            <>
              <div>
                <label className={labelCls}>Тип корпуса</label>
                <select className={fieldCls} value={v.case_type || 'изолированный'}
                  onChange={(e) => set({ case_type: e.target.value as any })}>
                  <option>изолированный</option>
                  <option>не изолированный</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Автоматика</label>
                <select className={fieldCls} value={v.automation || 'встроенная'}
                  onChange={(e) => set({ automation: e.target.value as any })}>
                  <option>встроенная</option>
                  <option>внешняя</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Толщина стенки</label>
                <select className={fieldCls} value={v.wall_thickness || 'стандартная'}
                  onChange={(e) => set({ wall_thickness: e.target.value as any })}>
                  <option>стандартная</option>
                  <option>уменьшенная</option>
                </select>
              </div>
            </>
          )}
          <div>
            <label className={labelCls}>Тип двигателя</label>
            <select className={fieldCls} value={v.motor_type || 'асинхронный'}
              onChange={(e) => set({ motor_type: e.target.value as any })}>
              <option>асинхронный</option>
              <option>ЕС</option>
            </select>
          </div>
          {isSE && (
            <>
              <div>
                <label className={labelCls}>Расположение выхода</label>
                <select className={fieldCls} value={v.air_outlet || 'вбок'}
                  onChange={(e) => set({ air_outlet: e.target.value as any })}>
                  <option>вбок</option>
                  <option>вверх</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Монтаж</label>
                <select className={fieldCls} value={v.mounting || 'подвесная'}
                  onChange={(e) => set({ mounting: e.target.value as any })}>
                  <option>подвесная</option>
                  <option>напольная</option>
                </select>
              </div>
            </>
          )}
        </Section>
      )}
    </div>
  );
}
