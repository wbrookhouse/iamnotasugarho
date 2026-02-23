import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  getParticipantBySlug,
  getParticipants,
  logEvent,
  softDeleteEvent,
  updateCharityName,
  getEvents,
  calculateStats,
} from '@/lib/queries';
import { getTodayLocal, getNowLocalTime, isBeforeStart, isAfterEnd, getDaysLeftInYear, START_DATE, END_DATE } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Heatmap from '@/components/Heatmap';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Trash2, Pencil, Check, Leaf, Candy } from 'lucide-react';

export default function ParticipantPage() {
  const { slug } = useParams<{ slug: string }>();
  const [participant, setParticipant] = useState<any>(null);
  const [allParticipants, setAllParticipants] = useState<any[]>([]);
  
  const [allStats, setAllStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editingCharity, setEditingCharity] = useState(false);
  const [charityInput, setCharityInput] = useState('');
  const [freeDayUsedTodayMap, setFreeDayUsedTodayMap] = useState<Record<string, boolean>>({});
  const [allTodayEvents, setAllTodayEvents] = useState<any[]>([]);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const refresh = useCallback(async () => {
    if (!participant) return;
    const [allEvents, parts] = await Promise.all([
      getEvents(),
      getParticipants(),
    ]);
    setAllParticipants(parts);
    const todayLocal = getTodayLocal();
    const statsMap: Record<string, any> = {};
    for (const p of parts) {
      statsMap[p.id] = calculateStats(allEvents, p.id, todayLocal);
    }
    setAllStats(statsMap);

    // Fetch today events for all participants
    const todayEventsAll = allEvents.filter(
      (e: any) => e.date_local === todayLocal && !e.deleted_at
    );
    setAllTodayEvents(todayEventsAll);

    const fdMap: Record<string, boolean> = {};
    for (const p of parts) {
      fdMap[p.id] = todayEventsAll.some(
        (e: any) => e.participant_id === p.id && e.type === 'FREE_DAY'
      );
    }
    setFreeDayUsedTodayMap(fdMap);
  }, [participant]);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      const p = await getParticipantBySlug(slug);
      if (!p) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setParticipant(p);
      setCharityInput(p.charity_name);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (participant) refresh();
  }, [participant, refresh]);

  const handleLog = async (targetId: string, type: 'SUGAR' | 'FREE_DAY') => {
    if (type === 'FREE_DAY' && freeDayUsedTodayMap[targetId]) {
      toast.info('Free Day already used today.');
      return;
    }
    const stats = allStats[targetId];
    if (type === 'FREE_DAY' && stats && stats.freeDaysRemaining <= 0) {
      toast.info('No Free Days remaining.');
      return;
    }
    try {
      const event = await logEvent(targetId, type);
      await refresh();

      const toastId = toast('Logged. Undo?', {
        duration: 10000,
        action: {
          label: 'Undo',
          onClick: async () => {
            await softDeleteEvent(event.id);
            await refresh();
            toast.dismiss(toastId);
          },
        },
      });
    } catch (err: any) {
      if (err?.code === '23505') {
        toast.info('Free Day already used today.');
      } else {
        toast.error('Failed to log event');
      }
    }
  };

  const handleDelete = async (eventId: string) => {
    await softDeleteEvent(eventId);
    await refresh();
    toast.success('Deleted');
  };

  const handleSaveCharity = async () => {
    if (charityInput.trim()) {
      await updateCharityName(participant.id, charityInput.trim());
      setParticipant({ ...participant, charity_name: charityInput.trim() });
    }
    setEditingCharity(false);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (notFound) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Page not found</div>;

  const beforeStart = isBeforeStart();
  const afterEnd = isAfterEnd();
  const disabled = beforeStart || afterEnd;

  const orderedParticipants = [
    participant,
    ...allParticipants.filter((p: any) => p.id !== participant.id),
  ];

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="pt-4 text-center">
        <h1 className="text-2xl font-bold">🍬 Sugar-Free Challenge</h1>
      </div>

      {/* Status banner */}
      {beforeStart && (
        <div className="bg-muted p-3 rounded-lg text-center text-sm text-muted-foreground">
          Tracking begins on Feb 24, 2026
        </div>
      )}
      {afterEnd && (
        <div className="bg-muted p-3 rounded-lg text-center text-sm text-muted-foreground">
          🎉 Year complete! Logging is closed.
        </div>
      )}

      {/* Action buttons for BOTH participants */}
      {orderedParticipants.map((p: any) => (
        <div key={p.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">{p.display_name}</h2>
            {p.id === participant.id && (
              <span className="text-xs text-muted-foreground">(you)</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleLog(p.id, 'FREE_DAY')}
              disabled={disabled}
              className="h-16 text-sm font-semibold bg-success hover:bg-success/90 text-success-foreground flex flex-col gap-1"
            >
              <Leaf className="h-5 w-5" />
              Report Free Day
            </Button>
            <Button
              onClick={() => handleLog(p.id, 'SUGAR')}
              disabled={disabled}
              variant="destructive"
              className="h-16 text-sm font-semibold flex flex-col gap-1"
            >
              <Candy className="h-5 w-5" />
              Report Sugar Item
            </Button>
          </div>
        </div>
      ))}

      {/* Charity edit for page owner */}
      <div className="flex items-center gap-2">
        {editingCharity ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={charityInput}
              onChange={(e) => setCharityInput(e.target.value)}
              placeholder="Enter your charity name…"
              className="h-8 text-sm"
            />
            <Button variant="ghost" size="sm" onClick={handleSaveCharity}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Your charity: <span className="font-medium text-foreground">{participant.charity_name}</span>
            <button
              onClick={() => setEditingCharity(true)}
              className="ml-2 inline-flex text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </p>
        )}
      </div>

      {/* Dashboard stats */}
      {allParticipants.length > 0 && Object.keys(allStats).length > 0 && (() => {
        const daysLeft = getDaysLeftInYear();
        const otherParticipant = allParticipants.find((p: any) => p.id !== participant.id);

        return (
          <div className="space-y-6">
            {/* Global cards */}
            <div className="grid grid-cols-2 gap-3">
              {otherParticipant && allStats[participant.id] && allStats[otherParticipant.id] && (
                <>
                  <Card className="border-destructive/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-destructive">${allStats[participant.id].donationsOwed}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {participant.display_name} owes<br />{otherParticipant.charity_name}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-destructive/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-destructive">${allStats[otherParticipant.id].donationsOwed}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {otherParticipant.display_name} owes<br />{participant.charity_name}
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
            {orderedParticipants.map((p: any) => {
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
      })()}

      {/* Today's log - all participants */}
      <div>
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
          Today's Log
        </h2>
        {allTodayEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries today.</p>
        ) : (
          <div className="space-y-2">
            {allTodayEvents.map((e: any) => {
              const owner = allParticipants.find((p: any) => p.id === e.participant_id);
              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between bg-card p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        e.type === 'FREE_DAY' ? 'bg-success' : 'bg-destructive'
                      }`}
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      {owner?.display_name}
                    </span>
                    <span className="text-sm font-medium">
                      {e.type === 'FREE_DAY' ? 'Free Day' : 'Sugar Item'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.ts_utc).toLocaleTimeString('en-US', {
                        timeZone: 'America/Halifax',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
