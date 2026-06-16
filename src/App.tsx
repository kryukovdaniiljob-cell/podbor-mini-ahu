import { useMemo, useState } from 'react';
import type { SelectorInput, SelectorResult } from './engine/types';
import { runSelection, findAnalog } from './engine/engine';
import InputForm from './components/InputForm';
import Warnings from './components/Warnings';
import AeroChart from './components/AeroChart';
import SpecSheet from './components/SpecSheet';
import AnalogModal from './components/AnalogModal';
import ShuftLogo from './components/ShuftLogo';
import { generateReport } from './report/generateReport';

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

/** Сравнение черновика и зафиксированного входа по всем ключам. */
function sameInput(a: SelectorInput, b: SelectorInput): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof SelectorInput>;
  for (const k of keys) if (a[k] !== b[k]) return false;
  return true;
}

export default function App() {
  // form — редактируемый черновик; committed — вход, по которому считается результат.
  const [form, setForm] = useState<SelectorInput>(DEFAULT_INPUT);
  const [committed, setCommitted] = useState<SelectorInput>(DEFAULT_INPUT);
  const result = useMemo(() => runSelection(committed), [committed]);
  const dirty = !sameInput(form, committed);

  const [analogOpen, setAnalogOpen] = useState(false);
  const [analog, setAnalog] = useState<SelectorResult | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const handleDownloadPdf = async () => {
    if (pdfBusy || !result.ok) return;
    setPdfBusy(true);
    try {
      await generateReport(result, committed);
    } finally {
      setPdfBusy(false);
    }
  };

  const handleCalculate = () => {
    setCommitted(form);
    setAnalogOpen(false); // закрываем возможно устаревшее окно аналога
  };

  const handleAnalog = () => {
    if (dirty || !result.ok) return; // аналог только по актуальному результату
    const { best } = findAnalog(committed, result);
    setAnalog(best);
    setAnalogOpen(true);
  };

  // Enter в числовом поле запускает расчёт (без сабмита формы)
  const onFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
      handleCalculate();
    }
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
        <aside
          className="bg-white rounded-xl border border-sand shadow-card no-print self-start lg:sticky lg:top-6 overflow-hidden"
          onKeyDown={onFormKeyDown}
        >
          <div className="p-5">
            <InputForm value={form} onChange={setForm} />
          </div>
          {/* Кнопка расчёта — закреплена внизу панели формы */}
          <div className="sticky bottom-0 border-t border-sand bg-white/95 backdrop-blur px-5 py-3">
            <button
              onClick={handleCalculate}
              disabled={!dirty}
              className={
                'w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-card transition ' +
                (dirty ? 'bg-accent hover:bg-accent-dark' : 'bg-stone/60 cursor-default')
              }
            >
              {dirty ? 'Рассчитать' : 'Рассчитано'}
            </button>
            {dirty && (
              <p className="mt-1.5 text-center text-xs text-accent-dark">
                Параметры изменены — нажмите «Рассчитать»
              </p>
            )}
          </div>
        </aside>

        <main className="space-y-5 print-full">
          {/* Панель действий / статус */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sand bg-white px-5 py-3 shadow-card no-print">
            <div className="text-sm">
              {dirty ? (
                <span className="inline-flex items-center gap-2 font-medium text-accent-dark">
                  <span className="inline-flex h-2 w-2 rounded-full bg-accent" />
                  Параметры изменены — нажмите «Рассчитать»
                </span>
              ) : result.ok ? (
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
              {dirty && (
                <button
                  onClick={handleCalculate}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-accent-dark"
                >
                  Рассчитать
                </button>
              )}
              <button
                onClick={handleAnalog}
                disabled={dirty || !result.ok}
                className={
                  'rounded-md border px-4 py-2 text-sm font-medium transition ' +
                  (dirty || !result.ok
                    ? 'border-sand text-stone cursor-not-allowed'
                    : 'border-accent text-accent-dark hover:bg-accent/5')
                }
              >
                Подобрать аналог
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={pdfBusy || dirty || !result.ok}
                className={
                  'rounded-md px-4 py-2 text-sm font-medium text-white shadow-card transition ' +
                  (pdfBusy || dirty || !result.ok ? 'bg-stone/60 cursor-default' : 'bg-accent hover:bg-accent-dark')
                }
              >
                {pdfBusy ? 'Формирую PDF…' : 'Скачать PDF'}
              </button>
            </div>
          </div>

          {/* Результаты считаются по committed; при изменении формы — приглушаются */}
          <div className={'space-y-5 transition-opacity ' + (dirty ? 'opacity-50' : 'opacity-100')}>
            <Warnings error={result.error} warnings={result.warnings} />

            <section className="bg-white rounded-xl border border-sand shadow-card p-5 sm:p-6">
              <h2 className="text-base font-semibold text-ink mb-3">
                Аэродинамические характеристики
              </h2>
              <AeroChart result={result} input={committed} />
            </section>

            <section className="bg-white rounded-xl border border-sand shadow-card p-5 sm:p-6">
              <SpecSheet result={result} input={committed} />
            </section>
          </div>
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
        input={committed}
      />
    </div>
  );
}
