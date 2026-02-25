import { useMemo, useState } from 'react';
import { parseISO, addDays, format, getMonth, getDaysInMonth } from 'date-fns';

interface DayData {
  date: string;
  sugarCount: number;
  hasFreDay: boolean;
  owedToday: number;
}

interface SunburstWheelProps {
  name: string;
  todayLocal: string;
  endDate: string;
  dayMap: Record<string, DayData>;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function SunburstWheel({ name, todayLocal, endDate, dayMap }: SunburstWheelProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const innerR = 30;
  const outerR = 140;
  const ringWidth = (outerR - innerR) / 12;

  const slices = useMemo(() => {
    const result: Array<{
      date: string;
      month: number;
      dayOfMonth: number;
      daysInMonth: number;
      color: string;
      isToday: boolean;
      data: DayData;
    }> = [];

    let d = parseISO(todayLocal);
    const end = parseISO(endDate);

    while (d <= end) {
      const ds = format(d, 'yyyy-MM-dd');
      const month = getMonth(d);
      const dayOfMonth = d.getDate();
      const daysInM = getDaysInMonth(d);
      
      const data = dayMap[ds] || { date: ds, sugarCount: 0, hasFreDay: false, owedToday: 0 };
      
      let color: string;
      if (data.hasFreDay) {
        color = 'hsl(45, 93%, 47%)'; // warning/yellow
      } else if (data.sugarCount > 0) {
        color = 'hsl(0, 72%, 51%)'; // destructive/red
      } else {
        color = 'hsl(142, 71%, 35%)'; // success/green
      }

      result.push({
        date: ds,
        month,
        dayOfMonth,
        daysInMonth: daysInM,
        color,
        isToday: ds === todayLocal,
        data,
      });

      d = addDays(d, 1);
    }

    return result;
  }, [todayLocal, endDate, dayMap]);

  const describeArc = (
    cxv: number, cyv: number,
    rInner: number, rOuter: number,
    startAngle: number, endAngle: number
  ) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const cos = Math.cos;
    const sin = Math.sin;

    const sA = toRad(startAngle - 90);
    const eA = toRad(endAngle - 90);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    const x1o = cxv + rOuter * cos(sA);
    const y1o = cyv + rOuter * sin(sA);
    const x2o = cxv + rOuter * cos(eA);
    const y2o = cyv + rOuter * sin(eA);
    const x1i = cxv + rInner * cos(eA);
    const y1i = cyv + rInner * sin(eA);
    const x2i = cxv + rInner * cos(sA);
    const y2i = cyv + rInner * sin(sA);

    return `M ${x1o} ${y1o} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x2i} ${y2i} Z`;
  };

  // Quarter ticks + month labels
  const monthLabels = useMemo(() => {
    const labels: Array<{ x: number; y: number; label: string }> = [];
    for (let m = 0; m < 12; m++) {
      const midAngle = (m * 30 + 15) - 90;
      const rad = (midAngle * Math.PI) / 180;
      const r = outerR + 12;
      labels.push({
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
        label: MONTH_NAMES[m],
      });
    }
    return labels;
  }, [cx, cy]);

  const quarterTicks = [0, 90, 180, 270].map((angle) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x1: cx + (innerR - 3) * Math.cos(rad),
      y1: cy + (innerR - 3) * Math.sin(rad),
      x2: cx + (outerR + 3) * Math.cos(rad),
      y2: cy + (outerR + 3) * Math.sin(rad),
    };
  });

  const handleSliceHover = (
    e: React.MouseEvent<SVGPathElement>,
    data: DayData
  ) => {
    const rect = (e.target as SVGPathElement).ownerSVGElement?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
      content: `${data.date} • Sugar items: ${data.sugarCount} • Free Day: ${data.hasFreDay ? 'Yes' : 'No'} • Owed today: $${data.owedToday}`,
    });
  };

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm font-semibold text-foreground mb-2">{name}</p>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`${name}'s sugar-free challenge sunburst wheel`}
        >
          {/* Quarter tick marks */}
          {quarterTicks.map((t, i) => (
            <line
              key={`qt-${i}`}
              x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={0.5}
              opacity={0.4}
            />
          ))}

          {/* Month labels */}
          {monthLabels.map((ml, i) => (
            <text
              key={`ml-${i}`}
              x={ml.x}
              y={ml.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="hsl(var(--muted-foreground))"
              fontSize={7}
            >
              {ml.label}
            </text>
          ))}

          {/* Day slices */}
          {slices.map((s) => {
            const monthAngleStart = s.month * 30;
            const dayAngle = 30 / s.daysInMonth;
            const startAngle = monthAngleStart + (s.dayOfMonth - 1) * dayAngle;
            const endAngle = startAngle + dayAngle;
            const rInner = innerR + s.month * ringWidth;
            const rOuter = rInner + ringWidth;

            return (
              <path
                key={s.date}
                d={describeArc(cx, cy, rInner, rOuter, startAngle, endAngle)}
                fill={s.color}
                stroke={s.isToday ? 'hsl(var(--foreground))' : 'hsl(var(--background))'}
                strokeWidth={s.isToday ? 1.5 : 0.3}
                opacity={0.85}
                aria-label={`${s.date}: ${s.data.hasFreDay ? 'Free Day' : s.data.sugarCount > 0 ? `${s.data.sugarCount} sugar items` : 'Sugar-free'}`}
                tabIndex={0}
                onMouseEnter={(e) => handleSliceHover(e, s.data)}
                onMouseLeave={() => setTooltip(null)}
                onFocus={(e) => {
                  const rect = (e.target as SVGPathElement).ownerSVGElement?.getBoundingClientRect();
                  if (rect) {
                    setTooltip({
                      x: size / 2,
                      y: size / 2 - 20,
                      content: `${s.data.date} • Sugar items: ${s.data.sugarCount} • Free Day: ${s.data.hasFreDay ? 'Yes' : 'No'} • Owed today: $${s.data.owedToday}`,
                    });
                  }
                }}
                onBlur={() => setTooltip(null)}
                className="outline-none focus:brightness-110 cursor-pointer"
              />
            );
          })}

          {/* Center label */}
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="hsl(var(--foreground))"
            fontSize={10}
            fontWeight="bold"
          >
            2026
          </text>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md border border-border z-50 max-w-[200px]"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
          >
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
}
