interface VsRowsProps {
  ownName: string;
  otherName: string;
  ownPcts: { sugarFree: number; sugar: number };
  otherPcts: { sugarFree: number; sugar: number };
}

function DeltaPill({ delta, winnerIsHigher, ownName, category }: { delta: number; winnerIsHigher: boolean; ownName: string; category: string }) {
  const isPositive = delta > 0;
  const isWinning = winnerIsHigher ? isPositive : !isPositive;
  const color = delta === 0
    ? 'bg-muted text-muted-foreground'
    : isWinning
      ? 'bg-success text-success-foreground'
      : 'bg-destructive text-destructive-foreground';
  const sign = delta > 0 ? '+' : '';

  const absDelta = Math.abs(delta);
  const ariaLabel = delta === 0
    ? `${ownName} tied on ${category}`
    : isWinning
      ? `${ownName} leads ${category} by ${absDelta} percentage point${absDelta !== 1 ? 's' : ''}`
      : `${ownName} trails on ${category} by ${absDelta} percentage point${absDelta !== 1 ? 's' : ''}`;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}
      aria-label={ariaLabel}
    >
      {sign}{delta}%
    </span>
  );
}

export default function VsRows({ ownName, otherName, ownPcts, otherPcts }: VsRowsProps) {
  const sfDelta = Math.round(ownPcts.sugarFree - otherPcts.sugarFree);
  const sugarDelta = Math.round(ownPcts.sugar - otherPcts.sugar);

  const rows = [
    {
      label: 'Sugar-Free',
      own: Math.round(ownPcts.sugarFree),
      other: Math.round(otherPcts.sugarFree),
      delta: sfDelta,
      higherIsWinner: true,
      ariaContext: 'sugar-free',
    },
    {
      label: 'Sugar',
      own: Math.round(ownPcts.sugar),
      other: Math.round(otherPcts.sugar),
      delta: sugarDelta,
      higherIsWinner: false,
      ariaContext: 'sugar',
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
          <DeltaPill delta={r.delta} winnerIsHigher={r.higherIsWinner} ownName={ownName} category={r.ariaContext} />
        </div>
      ))}
    </div>
  );
}
