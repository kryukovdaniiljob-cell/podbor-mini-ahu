interface Props {
  error: string | null;
  warnings: string[];
}

export default function Warnings({ error, warnings }: Props) {
  if (!error && warnings.length === 0) return null;
  return (
    <div className="space-y-2 mb-4">
      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          <span className="font-semibold">Ошибка: </span>{error}
        </div>
      )}
      {warnings.map((w, i) => (
        <div key={i} className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ⚠ {w}
        </div>
      ))}
    </div>
  );
}
