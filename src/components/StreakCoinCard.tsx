interface StreakCoinCardProps {
  name: string;
  initial: string;
  currentStreak: number;
  bestStreak: number;
  otherStreak: number;
}

export default function StreakCoinCard({
  name,
  initial,
  currentStreak,
  bestStreak,
  otherStreak,
}: StreakCoinCardProps) {
  const isLeader = currentStreak > otherStreak;
  const isTied = currentStreak === otherStreak;
  const isSecond = currentStreak < otherStreak;

  const coinColor = isSecond
    ? 'bg-[#C0C0C0]'
    : 'bg-[#D4AF37]'; // gold for leader or tie

  const delta = Math.abs(currentStreak - otherStreak);

  let subline: string;
  let sublineClass: string;
  if (isTied) {
    subline = `Tied: ${currentStreak}d`;
    sublineClass = 'text-green-600 font-semibold';
  } else if (isLeader) {
    subline = `In the lead: ${currentStreak}d`;
    sublineClass = 'text-green-600 font-semibold';
  } else {
    subline = `In 2nd Place: ${currentStreak}d`;
    sublineClass = 'text-slate-500';
  }

  const ariaLabel = isTied
    ? `${name} current sugar-free streak ${currentStreak} days. Best ${bestStreak}. Tied at ${currentStreak} days.`
    : isLeader
      ? `${name} current sugar-free streak ${currentStreak} days. Best ${bestStreak}. In the lead by ${delta} day${delta !== 1 ? 's' : ''}.`
      : `${name} current sugar-free streak ${currentStreak} days. Best ${bestStreak}. In second place.`;

  return (
    <div
      className="rounded-lg border border-border bg-card shadow-sm px-4 py-3 flex items-center justify-between"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <div className="min-w-0">
        <p className="text-foreground">
          <span className={`font-semibold ${isLeader || isTied ? 'text-green-600' : ''}`}>
            {currentStreak}d
          </span>
          {' '}Streak{' '}
          <span className="text-muted-foreground text-sm">(Best: {bestStreak})</span>
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
