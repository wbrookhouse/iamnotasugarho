import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAppConfig, getParticipants, getEvents, calculateStats } from '@/lib/queries';
import { getTodayLocal, getDaysLeftInYear, START_DATE, END_DATE } from '@/lib/dates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Heatmap from '@/components/Heatmap';

export default function Dashboard() {
  const { slug } = useParams<{ slug: string }>();
  const [participants, setParticipants] = useState<any[]>([]);
  const [allStats, setAllStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const config = await getAppConfig();
      if (!config || config.dashboard_slug !== slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const [parts, events] = await Promise.all([getParticipants(), getEvents()]);
      setParticipants(parts);
      const todayLocal = getTodayLocal();
      const statsMap: Record<string, any> = {};
      for (const p of parts) {
        statsMap[p.id] = calculateStats(events, p.id, todayLocal);
      }
      setAllStats(statsMap);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (notFound) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Page not found</div>;

  const daysLeft = getDaysLeftInYear();
  // Find who owes whom
  const kelsey = participants.find((p: any) => p.display_name === 'Kelsey');
  const sharon = participants.find((p: any) => p.display_name === 'Sharon');

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto space-y-6 pb-20">
      <div className="pt-4 text-center">
        <h1 className="text-2xl font-bold">🍬 Sugar-Free Challenge</h1>
        <p className="text-sm text-muted-foreground mt-1">Dashboard</p>
      </div>

      {/* Global cards */}
      <div className="grid grid-cols-2 gap-3">
        {kelsey && sharon && allStats[kelsey.id] && allStats[sharon.id] && (
          <>
            <Card className="border-destructive/20">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-destructive">${allStats[kelsey.id].donationsOwed}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Kelsey owes<br />{sharon.charity_name}
                </p>
              </CardContent>
            </Card>
            <Card className="border-destructive/20">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-destructive">${allStats[sharon.id].donationsOwed}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sharon owes<br />{kelsey.charity_name}
                </p>
              </CardContent>
            </Card>
          </>
        )}
        <Card className="col-span-2">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{daysLeft}</p>
            <p className="text-xs text-muted-foreground mt-1">Days left in 2026</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-participant sections */}
      {participants.map((p: any) => {
        const s = allStats[p.id];
        if (!s) return null;
        return (
          <div key={p.id} className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              {p.display_name}
              <span className="text-sm font-normal text-muted-foreground">({p.charity_name})</span>
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{s.freeDaysRemaining}</p>
                  <p className="text-xs text-muted-foreground">Free Days Left</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">{s.freeDaysUsed}</p>
                  <p className="text-xs text-muted-foreground">Free Days Used</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">{s.streak}</p>
                  <p className="text-xs text-muted-foreground">Streak 🔥</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">
                    {s.daysSinceLastSugar !== null ? s.daysSinceLastSugar : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Days Since Sugar</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Heatmap</p>
                <Heatmap data={s.heatmapData} startDate={START_DATE} endDate={END_DATE} />
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
