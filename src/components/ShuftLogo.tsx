// Логотип SHUFT HVAC TECHNOLOGIES — фирменный вордмарк.
// Реализован как самодостаточный SVG-локап (без внешних картинок), белая
// версия для тёмной шапки. При наличии официального файла логотипа его
// можно подставить вместо этого компонента.

interface Props {
  className?: string;
  color?: string;
}

export default function ShuftLogo({ className, color = '#ffffff' }: Props) {
  return (
    <div className={className} aria-label="SHUFT HVAC Technologies">
      <div className="flex items-baseline gap-[0.12em] leading-none">
        <span
          className="font-wordmark font-bold uppercase tracking-[0.04em]"
          style={{ color, fontSize: '1.75rem', letterSpacing: '0.02em' }}
        >
          Shuft
        </span>
        <span style={{ color, fontSize: '0.7rem', transform: 'translateY(-0.7em)' }}>®</span>
      </div>
      <div
        className="font-wordmark uppercase"
        style={{
          color,
          opacity: 0.72,
          fontSize: '0.6rem',
          letterSpacing: '0.34em',
          marginTop: '0.1rem',
          fontWeight: 500,
        }}
      >
        HVAC Technologies
      </div>
    </div>
  );
}
