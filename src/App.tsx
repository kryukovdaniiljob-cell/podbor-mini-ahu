import { useMemo, useState } from 'react';
import type { SelectorInput } from './engine/types';
import { runSelection } from './engine/engine';
import InputForm from './components/InputForm';
import Warnings from './components/Warnings';
import AeroChart from './components/AeroChart';
import SpecSheet from './components/SpecSheet';

const DEFAULT_INPUT: SelectorInput = {
  installation_type: 'приточно-вытяжная',
  selection_mode: 'вручную',
  manual_model_se: 'Unimax_P_CE',
  manual_size_no: 4,
  flow: 500,
  head: 150,
  t_outdoor: -30,
  rh_outdoor: 80,
  t_supply: 21,
  t_indoor: 18,
  rh_indoor: 40,
  recup_type: 'пластинчатый',
  heater_type: 'электрический',
  case_type: 'изолированный',
  automation: 'встроенная',
  motor_type: 'асинхронный',
  wall_thickness: 'стандартная',
  air_outlet: 'вбок',
  mounting: 'подвесная',
};

export default function App() {
  const [input, setInput] = useState<SelectorInput>(DEFAULT_INPUT);
  const result = useMemo(() => runSelection(input), [input]);

  return (
    <div className="min-h-full">
      <header className="bg-brand-dark text-white px-5 py-3 no-print">
        <h1 className="text-xl font-bold">Сервис подбора КПВУ</h1>
        <p className="text-xs text-cyan-100">Компактные приточные и приточно-вытяжные установки</p>
      </header>

      <div className="mx-auto max-w-7xl p-4 grid lg:grid-cols-[340px_1fr] gap-4">
        <aside className="bg-white rounded-lg shadow-sm p-4 no-print self-start">
          <InputForm value={input} onChange={setInput} />
        </aside>

        <main className="space-y-4 print-full">
          <div className="flex items-center justify-between no-print">
            <div className="text-sm text-slate-600">
              {result.ok ? (
                <span>Подобрана модель <b className="text-brand-dark">{result.modelName}</b>, типоразмер №{result.m61?.size_no}</span>
              ) : (
                <span className="text-red-600">Подбор не выполнен</span>
              )}
            </div>
            <button
              onClick={() => window.print()}
              className="rounded bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
            >
              🖨 Печать / PDF
            </button>
          </div>

          <Warnings error={result.error} warnings={result.warnings} />

          <section className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-sm font-semibold text-brand-dark mb-2 no-print">
              Аэродинамические характеристики
            </h2>
            <AeroChart result={result} input={input} />
          </section>

          <section className="bg-white rounded-lg shadow-sm p-4">
            <SpecSheet result={result} input={input} />
          </section>
        </main>
      </div>
    </div>
  );
}
