import {
  ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from 'recharts';
import type { SelectorResult, SelectorInput } from '../engine/types';

interface Props {
  result: SelectorResult;
  input: SelectorInput;
}

export default function AeroChart({ result, input }: Props) {
  if (!result.ok || result.chart.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-sand text-stone text-sm">
        График недоступен — установка не подобрана.
      </div>
    );
  }

  const xMax = Math.max(result.actual_flow, input.flow, result.Q_op) * 1.25;
  const data = result.chart.filter((p) => p.Q <= xMax);

  return (
    <div>
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={data} margin={{ top: 16, right: 24, bottom: 30, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="Q" type="number" domain={[0, Math.round(xMax)]}
            label={{ value: 'Расход, м³/ч', position: 'insideBottom', offset: -12, fill: '#0f172a' }}
            tick={{ fontSize: 11, fill: '#0f172a' }} stroke="#94a3b8"
          />
          <YAxis
            label={{ value: 'Напор, Па', angle: -90, position: 'insideLeft', fill: '#0f172a' }}
            tick={{ fontSize: 11, fill: '#0f172a' }} stroke="#94a3b8"
          />
          <Tooltip
            formatter={(val: number, name: string) => [`${val} Па`, name]}
            labelFormatter={(l) => `Расход: ${l} м³/ч`}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}
          />
          <Legend verticalAlign="top" height={28} wrapperStyle={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 }} />

          <Line type="monotone" dataKey="fan" name="Хар-ка установки" stroke="#2f6fb5"
            strokeWidth={2.5} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="sys" name="Хар-ка сети" stroke="#e8742c"
            strokeWidth={2} dot={false} isAnimationActive={false} />

          {/* выноски от рабочей точки к осям */}
          <ReferenceLine segment={[
            { x: result.actual_flow, y: 0 },
            { x: result.actual_flow, y: result.actual_head },
          ]} stroke="#94a3b8" strokeDasharray="4 4" />
          <ReferenceLine segment={[
            { x: 0, y: result.actual_head },
            { x: result.actual_flow, y: result.actual_head },
          ]} stroke="#94a3b8" strokeDasharray="4 4" />

          {/* рабочая точка */}
          <ReferenceDot x={result.actual_flow} y={result.actual_head} r={6}
            fill="#2f9e44" stroke="#fff" strokeWidth={2}
            label={{ value: `Рабочая точка (${Math.round(result.actual_flow)}; ${Math.round(result.actual_head)})`, position: 'top', fontSize: 11, fill: '#2f9e44' }} />

          {/* данные запроса */}
          <ReferenceDot x={input.flow} y={input.head} r={5}
            fill="#0f172a" stroke="#fff" strokeWidth={2}
            label={{ value: 'Запрос', position: 'bottom', fontSize: 11, fill: '#475569' }} />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-stone mt-1">
        Пересечение кривых (рабочий расход Q<sub>op</sub>) ≈ {result.Q_op.toFixed(0)} м³/ч.
        Фактический расход {result.actual_flow.toFixed(0)} м³/ч, напор {result.actual_head.toFixed(0)} Па.
      </p>
    </div>
  );
}
