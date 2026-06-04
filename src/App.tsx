import { useMemo, useState } from 'react';
import type { SelectorInput, SelectorResult } from './engine/types';
import { runSelection, findAnalog } from './engine/engine';
import InputForm from './components/InputForm';
import Warnings from './components/Warnings';
import AeroChart from './components/AeroChart';
import SpecSheet from './components/SpecSheet';
import AnalogModal from './components/AnalogModal';
import ShuftLogo from './components/ShuftLogo';

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

  const [analogOpen, setAnalogOpen] = useState(false);
  const [analog, setAnalog] = useState<SelectorResult | null>(null);

  const handleAnalog = () => {
    const { best } = findAnalog(input, result);
    setAnalog(best);
    setAnalogOpen(true);
  };

  return (
    <div className="min-h-full bg-paper">
      {/* Тёмная корпоративная шапка с логотипом */}
      <header className="bg-shaft text-white no-print">
        <div className="mx-auto max-w-7xl px-6 h-[72px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <ShuftLogo />
            <span className="hidden md:block h-9 w-px bg-white/15" />
            <span className="hidden md:block text-sm font-medium text-white/85">
              Сервис подбора КПВУ
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-white/55">
            <span className="inline-flex h-2 w-2 rounded-full bg-green" />
            Онлайн-подбор с остатками по складу
          </div>
        </div>
      </header>

      {/* Полоса заголовка раздела */}
      <div className="border-b border-sand bg-white no-print">
        <div className="mx-auto max-w-7xl px-6 py-3">
          <h1 className="text-lg font-semibold tracking-tight text-ink">
            Подбор компактных приточных и приточно-вытяжных установок
          </h1>
          <p className="text-xs text-stone mt-0.5">
            Расчёт характеристик, аэродинамика и наличие на складе
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl p-4 sm:p-6 grid lg:grid-cols-[360px_1fr] gap-6">
        <aside className="bg-white rounded-xl border border-sand shadow-card p-5 no-print self-start lg:sticky lg:top-6">
          <InputForm value={input} onChange={setInput} />
        </aside>

        <main className="space-y-5 print-full">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sand bg-white px-5 py-3 shadow-card no-print">
            <div className="text-sm">
              {result.ok ? (
                <span className="text-stone">
                  Подобрана модель{' '}
                  <b className="font-semibold text-ink">{result.modelName}</b>
                  , типоразмер №{result.m61?.size_no}
                </span>
              ) : (
                <span className="font-medium text-accent-dark">Подбор не выполнен</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {result.ok && (
                <button
                  onClick={handleAnalog}
                  className="rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent-dark transition hover:bg-accent/5"
                >
                  Подобрать аналог
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white shadow-card transition hover:bg-accent-dark"
              >
                Печать / PDF
              </button>
            </div>
          </div>

          <Warnings error={result.error} warnings={result.warnings} />

          <section className="bg-white rounded-xl border border-sand shadow-card p-5 sm:p-6">
            <h2 className="text-base font-semibold text-ink mb-3">
              Аэродинамические характеристики
            </h2>
            <AeroChart result={result} input={input} />
          </section>

          <section className="bg-white rounded-xl border border-sand shadow-card p-5 sm:p-6">
            <SpecSheet result={result} input={input} />
          </section>
        </main>
      </div>

      <footer className="no-print border-t border-sand bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4 text-xs text-stone flex flex-wrap items-center justify-between gap-2">
          <span>SHUFT HVAC Technologies · Сервис подбора КПВУ</span>
          <span>Расчёт воспроизводит движок калькулятора MiniAHU</span>
        </div>
      </footer>

      <AnalogModal
        open={analogOpen}
        onClose={() => setAnalogOpen(false)}
        primary={result}
        analog={analog}
        input={input}
      />
    </div>
  );
}
