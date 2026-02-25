import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { getParticipants, getEvents, logEvent, hardDeleteEvent, calculateStats } from '@/lib/queries';
import { getTodayLocal, START_DATE, isBeforeStart, isAfterEnd, getDaysLeftInYear } from '@/lib/dates';
import { Card, CardContent } from '@/components/ui/card';

import ParticipantPanel from '@/components/ParticipantPanel';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Participant {
  id: string;
  display_name: string;
  charity_name: string;
  secret_slug: string;
  created_at: string;
}

interface Event {
  id: string;
  participant_id: string;
  type: string;
  date_local: string;
  ts_utc: string;
  deleted_at: string | null;
}

function computeYtdPcts(
  events: Event[],
  participantId: string,
  startDate: string,
  todayLocal: string
) {
  const pEvents = events.filter(
    (e) => e.participant_id === participantId && !e.deleted_at
  );

  // Build per-day classification
  const freeDayDates = new Set(
    pEvents.filter((e) => e.type === 'FREE_DAY').map((e) => e.date_local)
  );
  const sugarDates = new Set(
    pEvents.filter((e) => e.type === 'SUGAR').map((e) => e.date_local)
  );

  // Count days in window
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(todayLocal + 'T00:00:00');
  let totalDays = 0;
  let greenDays = 0;
  let redDays = 0;
  let yellowDays = 0;

  const d = new Date(start);
  while (d <= end) {
    const ds = d.toISOString().slice(0, 10);
    totalDays++;
    if (freeDayDates.has(ds)) {
      yellowDays++;
    } else if (sugarDates.has(ds)) {
      redDays++;
    } else {
      greenDays++;
    }
    d.setDate(d.getDate() + 1);
  }

  if (totalDays === 0) return { sugarFree: 100, sugar: 0, freeDay: 0 };

  return {
    sugarFree: (greenDays / totalDays) * 100,
    sugar: (redDays / totalDays) * 100,
    freeDay: (yellowDays / totalDays) * 100,
  };
}


const Index = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const todayLocal = getTodayLocal();
  const beforeStart = isBeforeStart();
  const afterEnd = isAfterEnd();
  const daysLeft = getDaysLeftInYear();

  const refresh = useCallback(async () => {
    try {
      const [evts, parts] = await Promise.all([getEvents(), getParticipants()]);
      setParticipants(parts);
      setAllEvents(evts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('events-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => { refresh(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  const handleLog = useCallback(async (participantId: string, type: 'SUGAR' | 'FREE_DAY') => {
    const name = participants.find((p) => p.id === participantId)?.display_name;
    try {
      // Check free day constraints
      if (type === 'FREE_DAY') {
        const todayFreeDays = allEvents.filter(
          (e) => e.participant_id === participantId && e.date_local === todayLocal && e.type === 'FREE_DAY' && !e.deleted_at
        );
        if (todayFreeDays.length > 0) {
          toast.error('Free Day already used today.');
          return;
        }
        const stats = calculateStats(allEvents, participantId, todayLocal);
        if (stats.freeDaysRemaining <= 0) {
          toast.error(`${name} has no free days remaining`);
          return;
        }
      }

      const newEvent = await logEvent(participantId, type);
      const label = type === 'SUGAR' ? 'Sugar Item' : 'Free Day';
      
      // Show undo toast
      const toastId = toast.success(`Logged ${label} for ${name}`, {
        duration: 10000,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await hardDeleteEvent(newEvent.id);
              toast.dismiss(toastId);
              toast.info('Event undone');
              await refresh();
            } catch {
              toast.error('Failed to undo');
            }
          },
        },
      });

      await refresh();
    } catch (err) {
      toast.error('Failed to log event');
    }
  }, [participants, allEvents, todayLocal, refresh]);

  // Derived data
  const p1 = participants[0];
  const p2 = participants[1];

  const stats1 = useMemo(() => p1 ? calculateStats(allEvents, p1.id, todayLocal) : null, [allEvents, p1, todayLocal]);
  const stats2 = useMemo(() => p2 ? calculateStats(allEvents, p2.id, todayLocal) : null, [allEvents, p2, todayLocal]);

  const pcts1 = useMemo(() => p1 ? computeYtdPcts(allEvents, p1.id, START_DATE, todayLocal) : { sugarFree: 100, sugar: 0, freeDay: 0 }, [allEvents, p1, todayLocal]);
  const pcts2 = useMemo(() => p2 ? computeYtdPcts(allEvents, p2.id, START_DATE, todayLocal) : { sugarFree: 100, sugar: 0, freeDay: 0 }, [allEvents, p2, todayLocal]);


  const freeDayUsedToday1 = useMemo(() => p1 ? allEvents.some((e) => e.participant_id === p1.id && e.date_local === todayLocal && e.type === 'FREE_DAY' && !e.deleted_at) : false, [allEvents, p1, todayLocal]);
  const freeDayUsedToday2 = useMemo(() => p2 ? allEvents.some((e) => e.participant_id === p2.id && e.date_local === todayLocal && e.type === 'FREE_DAY' && !e.deleted_at) : false, [allEvents, p2, todayLocal]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const disabledMsg = beforeStart
    ? 'Tracking begins on Feb 24, 2026'
    : afterEnd
      ? 'Year complete'
      : '';
  const buttonsDisabled = beforeStart || afterEnd;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <h1 className="text-2xl md:text-3xl font-bold text-center text-foreground">
        🍬 Sugar-Free Challenge 2026
      </h1>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-success" /> Sugar-free
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-destructive" /> Sugar
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-warning" /> Free Day
        </span>
      </div>

      {/* Summary Cards */}
      {p1 && p2 && stats1 && stats2 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground">{p1.display_name} owes {p2.charity_name}</p>
              <p className="text-2xl font-bold text-foreground">${stats1.donationsOwed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground">{p2.display_name} owes {p1.charity_name}</p>
              <p className="text-2xl font-bold text-foreground">${stats2.donationsOwed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground">Days left in 2026</p>
              <p className="text-2xl font-bold text-foreground">{daysLeft}</p>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Participant Panels */}
      {p1 && p2 && stats1 && stats2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ParticipantPanel
            name={p1.display_name}
            charity={p1.charity_name}
            participantId={p1.id}
            otherName={p2.display_name}
            ownPcts={pcts1}
            otherPcts={pcts2}
            freeDayUsedToday={freeDayUsedToday1}
            freeDaysRemaining={stats1.freeDaysRemaining}
            disabled={buttonsDisabled}
            disabledMessage={disabledMsg}
            onLog={handleLog}
          />
          <ParticipantPanel
            name={p2.display_name}
            charity={p2.charity_name}
            participantId={p2.id}
            otherName={p1.display_name}
            ownPcts={pcts2}
            otherPcts={pcts1}
            freeDayUsedToday={freeDayUsedToday2}
            freeDaysRemaining={stats2.freeDaysRemaining}
            disabled={buttonsDisabled}
            disabledMessage={disabledMsg}
            onLog={handleLog}
          />
        </div>
      )}
    </div>
  );
};

export default Index;
