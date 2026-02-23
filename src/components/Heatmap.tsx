import { useMemo } from 'react';
import { parseISO, addDays, getDay, format } from 'date-fns';

interface HeatmapProps {
  data: Record<string, 'green' | 'red'>;
  startDate: string;
  endDate: string;
}

export default function Heatmap({ data, startDate, endDate }: HeatmapProps) {
  const weeks = useMemo(() => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const result: { date: string; color: string }[][] = [];
    let currentWeek: { date: string; color: string }[] = [];

    // Pad first week
    const startDow = getDay(start); // 0=Sun
    for (let i = 0; i < startDow; i++) {
      currentWeek.push({ date: '', color: 'transparent' });
    }

    let d = start;
    while (d <= end) {
      const ds = format(d, 'yyyy-MM-dd');
      const color = data[ds] === 'green'
        ? 'hsl(142 71% 35%)'
        : data[ds] === 'red'
          ? 'hsl(0 72% 51%)'
          : 'hsl(var(--muted))';
      currentWeek.push({ date: ds, color });
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
      d = addDays(d, 1);
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', color: 'transparent' });
      }
      result.push(currentWeek);
    }
    return result;
  }, [data, startDate, endDate]);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[2px]" style={{ minWidth: 'max-content' }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[2px]">
            {week.map((day, di) => (
              <div
                key={di}
                className="rounded-sm"
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: day.color,
                }}
                title={day.date || undefined}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(142 71% 35%)' }} /> Free Day
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(0 72% 51%)' }} /> Sugar
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-muted" /> No Activity
        </span>
      </div>
    </div>
  );
}
