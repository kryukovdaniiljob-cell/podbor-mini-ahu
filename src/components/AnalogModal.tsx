import type { SelectorResult, SelectorInput } from '../engine/types';
import { parseDisplayName } from '../engine/displayName';
import AeroChart from './AeroChart';
import SpecSheet from './SpecSheet';

interface Props {
  open: boolean;
  onClose: () => void;
  primary: SelectorResult;
  analog: SelectorResult | null;
  input: SelectorInput;
}

export default function AnalogModal({ open, onClose, primary, analog, input }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:p-8">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between gap-3 rounded-t-2xl border-b border-sand bg-white px-6 py-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-ink">Подбор аналога</h2>
            <p className="text-xs text-stone">
              Ближайшая по характеристикам установка, доступная как альтернатива
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-sand px-3 py-1.5 text-sm font-heading text-ink/70 transition hover:bg-paper"
          >
            ✕ Закрыть
          </button>
        </div>

        <div className="p-6">
          {!analog ? (
            <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 font-heading text-accent-dark">
              Активного аналога под заданные параметры не найдено (подходящие позиции
              сняты с производства / в архиве).
            </div>
          ) : (
            <>
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <CompareCard
                  title="Исходный подбор"
                  result={primary}
                  accent={false}
                />
                <CompareCard title="Аналог" result={analog} accent />
              </div>

              <div className="mb-6 rounded-2xl border border-sand p-4">
                <h3 className="font-heading text-base font-semibold text-ink mb-3">
                  Аэродинамические характеристики аналога
                </h3>
                <AeroChart result={analog} input={input} />
              </div>

              <div className="rounded-2xl border border-sand p-4">
                <SpecSheet result={analog} input={input} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CompareCard({
  title,
  result,
  accent,
}: {
  title: string;
  result: SelectorResult;
  accent: boolean;
}) {
  return (
    <div
      className={
        'rounded-xl border p-4 ' +
        (accent ? 'border-accent/40 bg-accent/5' : 'border-sand bg-paper')
      }
    >
      <p className="font-heading text-xs font-semibold uppercase tracking-wide text-accent-dark mb-1">
        {title}
      </p>
      <p className="font-heading font-medium text-ink">{parseDisplayName(result.fullName).clean}</p>
      <p className="text-xs text-stone mb-2">{result.modelName}</p>
      <dl className="space-y-0.5 text-sm">
        <Line label="Расход" value={`${result.actual_flow.toFixed(0)} м³/ч`} />
        <Line label="Напор" value={`${result.actual_head.toFixed(0)} Па`} />
        <Line label="Раб. точка Q_op" value={`${result.Q_op.toFixed(0)} м³/ч`} />
        <Line label="Мощность нагрев." value={`${result.nominal_heater_kW.toFixed(1)} кВт`} />
        <Line
          label="Склад"
          value={
            result.stock
              ? `${result.stock.code} · ${result.stock.qty} шт.`
              : '—'
          }
        />
      </dl>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-sand/60 py-0.5">
      <span className="text-ink/60">{label}</span>
      <span className="font-heading font-medium text-ink tabular-nums">{value}</span>
    </div>
  );
}
