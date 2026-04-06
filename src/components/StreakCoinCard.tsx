interface StreakCoinCardProps {
  name: string;
  initial: string;
  quarterStreak: number;
  totalStreak: number;
  bestStreak: number;
  otherQuarterStreak: number;
}

export default function StreakCoinCard({
  name,
  initial,
  quarterStreak,
  totalStreak,
  bestStreak,
  otherQuarterStreak,
}: StreakCoinCardProps) {
  const isLeader = quarterStreak > otherQuarterStreak;
  const isTied = quarterStreak === otherQuarterStreak;
  const isSecond = quarterStreak < otherQuarterStreak;

  const coinColor = isSecond
    ? 'bg-[#C0C0C0]'
    : 'bg-[#D4AF37]';

  const delta = Math.abs(quarterStreak - otherQuarterStreak);

  let subline: string;
  let sublineClass: string;
  if (isTied) {
    subline = `Tied: ${quarterStreak}d`;
    sublineClass = 'text-green-600 font-semibold';
  } else if (isLeader) {
    subline = `In the lead: ${quarterStreak}d`;
    sublineClass = 'text-green-600 font-semibold';
  } else {
    subline = `In 2nd Place: ${quarterStreak}d`;
    sublineClass = 'text-slate-500';
  }

  const ariaLabel = isTied
    ? `${name} Q2 streak ${quarterStreak} days. Total streak ${totalStreak}. Best ${bestStreak}. Tied.`
    : isLeader
      ? `${name} Q2 streak ${quarterStreak} days. Total streak ${totalStreak}. Best ${bestStreak}. In the lead by ${delta} day${delta !== 1 ? 's' : ''}.`
      : `${name} Q2 streak ${quarterStreak} days. Total streak ${totalStreak}. Best ${bestStreak}. In second place.`;

  return (
    <div
      className="rounded-lg border border-border bg-card shadow-sm px-4 py-3 flex items-center justify-between"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-foreground">
          <span className={`font-semibold ${isLeader || isTied ? 'text-green-600' : ''}`}>
            {quarterStreak}d
          </span>
          {' '}Q2 Streak
        </p>
        <p className="text-sm text-muted-foreground">
          Total: {totalStreak}d · Best: {bestStreak}d
        </p>
        <p className={`text-sm ${sublineClass}`}>{subline}</p>
      </div>
      <div
        className={`flex-shrink-0 w-11 h-11 rounded-full ${coinColor} flex items-center justify-center shadow-inner`}
      >
        <span className="text-white font-bold text-lg">{initial}</span>
      </div>
    </div>
  );
}
