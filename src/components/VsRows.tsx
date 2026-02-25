interface VsRowsProps {
  ownName: string;
  otherName: string;
  ownPcts: { sugarFree: number; sugar: number; freeDay: number };
  otherPcts: { sugarFree: number; sugar: number; freeDay: number };
}

function DeltaPill({ delta, winnerIsHigher }: { delta: number; winnerIsHigher: boolean }) {
  const isPositive = delta > 0;
  // For sugar-free: higher is better, so positive = green
  // For sugar/free-day: lower is better, so negative = green (inverted by caller)
  const isWinning = winnerIsHigher ? isPositive : !isPositive;
  const color = delta === 0
    ? 'bg-muted text-muted-foreground'
    : isWinning
      ? 'bg-success text-success-foreground'
      : 'bg-destructive text-destructive-foreground';
  const sign = delta > 0 ? '+' : '';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}
      aria-label={`${sign}${delta}% difference`}
    >
      {sign}{delta}%
    </span>
  );
}

export default function VsRows({ ownName, otherName, ownPcts, otherPcts }: VsRowsProps) {
  const sfDelta = Math.round(ownPcts.sugarFree - otherPcts.sugarFree);
  const sugarDelta = Math.round(ownPcts.sugar - otherPcts.sugar);
  const fdDelta = Math.round(ownPcts.freeDay - otherPcts.freeDay);

  const rows = [
    {
      label: 'Sugar-Free',
      own: Math.round(ownPcts.sugarFree),
      other: Math.round(otherPcts.sugarFree),
      delta: sfDelta,
      higherIsWinner: true, // higher sugar-free % = better
      ariaContext: 'sugar-free',
    },
    {
      label: 'Sugar',
      own: Math.round(ownPcts.sugar),
      other: Math.round(otherPcts.sugar),
      delta: sugarDelta,
      higherIsWinner: false, // lower sugar % = better
      ariaContext: 'sugar',
    },
    {
      label: 'Free Days',
      own: Math.round(ownPcts.freeDay),
      other: Math.round(otherPcts.freeDay),
      delta: fdDelta,
      higherIsWinner: false, // lower free-day % = better
      ariaContext: 'free days',
    },
  ];

  return (
    <div className="space-y-1.5 text-sm">
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-center justify-between gap-2"
          aria-label={`${ownName} ${r.own}% ${r.ariaContext}, ${otherName} ${r.other}%. Difference: ${r.delta > 0 ? 'plus' : r.delta < 0 ? 'minus' : ''}${Math.abs(r.delta)} percentage points`}
        >
          <span className="text-foreground">
            <strong>{r.own}%</strong> {r.label}{' '}
            <span className="text-muted-foreground">
              ({otherName} {r.other}%)
            </span>
          </span>
          <DeltaPill delta={r.delta} winnerIsHigher={r.higherIsWinner} />
        </div>
      ))}
    </div>
  );
}
