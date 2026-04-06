import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { getParticipants, getEvents, logEvent, hardDeleteEvent, calculateStats } from '@/lib/queries';
import { getTodayLocal, START_DATE, OVERALL_START_DATE, isBeforeStart, isAfterEnd, getDaysLeftInYear } from '@/lib/dates';

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
  const sugarDates = new Set(
    events.filter(
      (e) => e.participant_id === participantId && !e.deleted_at && e.type === 'SUGAR'
    ).map((e) => e.date_local)
  );

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(todayLocal + 'T00:00:00');
  let totalDays = 0;
  let greenDays = 0;
  let redDays = 0;

  const d = new Date(start);
  while (d <= end) {
    const ds = d.toISOString().slice(0, 10);
    totalDays++;
    if (sugarDates.has(ds)) {
      redDays++;
    } else {
      greenDays++;
    }
    d.setDate(d.getDate() + 1);
  }

  if (totalDays === 0) return { sugarFree: 100, sugar: 0 };

  return {
    sugarFree: (greenDays / totalDays) * 100,
    sugar: (redDays / totalDays) * 100,
  };
}

/** Consecutive sugar-free days walking back from today, stopping at floorDate */
function computeStreak(
  events: Event[],
  participantId: string,
  floorDate: string,
  todayLocal: string
): number {
  const sugarDates = new Set(
    events.filter(
      (e) => e.participant_id === participantId && !e.deleted_at && e.type === 'SUGAR'
    ).map((e) => e.date_local)
  );

  let streak = 0;
  const today = new Date(todayLocal + 'T00:00:00');
  for (let i = 0; ; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (ds < floorDate) break;
    if (sugarDates.has(ds)) break;
    streak++;
  }
  return streak;
}

/** Best consecutive sugar-free run from startDate to today */
function computeBestStreak(
  events: Event[],
  participantId: string,
  startDate: string,
  todayLocal: string
): number {
  const sugarDates = new Set(
    events.filter(
      (e) => e.participant_id === participantId && !e.deleted_at && e.type === 'SUGAR'
    ).map((e) => e.date_local)
  );

  let best = 0;
  let current = 0;
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(todayLocal + 'T00:00:00');
  const d = new Date(start);
  while (d <= end) {
    const ds = d.toISOString().slice(0, 10);
    if (!sugarDates.has(ds)) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
    d.setDate(d.getDate() + 1);
  }
  return best;
}


const Index = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleLog = useCallback(async (participantId: string, type: 'SUGAR') => {
    const name = participants.find((p) => p.id === participantId)?.display_name;
    try {
      const newEvent = await logEvent(participantId, type);
      
      const toastId = toast.success(`Logged Sugar Item for ${name}`, {
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
  }, [participants, todayLocal, refresh]);

  // Derived data
  const p1 = participants[0];
  const p2 = participants[1];

  const stats1 = useMemo(() => p1 ? calculateStats(allEvents, p1.id, todayLocal) : null, [allEvents, p1, todayLocal]);
  const stats2 = useMemo(() => p2 ? calculateStats(allEvents, p2.id, todayLocal) : null, [allEvents, p2, todayLocal]);

  const pcts1 = useMemo(() => p1 ? computeYtdPcts(allEvents, p1.id, START_DATE, todayLocal) : { sugarFree: 100, sugar: 0 }, [allEvents, p1, todayLocal]);
  const pcts2 = useMemo(() => p2 ? computeYtdPcts(allEvents, p2.id, START_DATE, todayLocal) : { sugarFree: 100, sugar: 0 }, [allEvents, p2, todayLocal]);

  // Q2 streak (capped at Q2 start)
  const q2Streak1 = useMemo(() => p1 ? computeStreak(allEvents, p1.id, START_DATE, todayLocal) : 0, [allEvents, p1, todayLocal]);
  const q2Streak2 = useMemo(() => p2 ? computeStreak(allEvents, p2.id, START_DATE, todayLocal) : 0, [allEvents, p2, todayLocal]);

  // Total streak (can span back into Q1)
  const totalStreak1 = useMemo(() => p1 ? computeStreak(allEvents, p1.id, OVERALL_START_DATE, todayLocal) : 0, [allEvents, p1, todayLocal]);
  const totalStreak2 = useMemo(() => p2 ? computeStreak(allEvents, p2.id, OVERALL_START_DATE, todayLocal) : 0, [allEvents, p2, todayLocal]);

  // Best streak ever (since overall start)
  const best1 = useMemo(() => p1 ? computeBestStreak(allEvents, p1.id, OVERALL_START_DATE, todayLocal) : 0, [allEvents, p1, todayLocal]);
  const best2 = useMemo(() => p2 ? computeBestStreak(allEvents, p2.id, OVERALL_START_DATE, todayLocal) : 0, [allEvents, p2, todayLocal]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const disabledMsg = beforeStart
    ? 'Tracking begins on April 1, 2026'
    : afterEnd
      ? 'Quarter complete'
      : '';
  const buttonsDisabled = beforeStart || afterEnd;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <h1 className="text-2xl md:text-3xl font-bold text-center text-foreground">
        🍬 Sugar-Free Challenge 2026 — Q2
      </h1>

      {/* Q1 Winner Banner */}
      <div className="rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-4 py-2 text-center text-sm">
        🏆 <strong>Q1 Winner: Kelsey!</strong> <span className="text-muted-foreground">Congrats on a great first quarter.</span>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-success" /> Sugar-free
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-destructive" /> Sugar
        </span>
      </div>

      {/* Summary Bar */}
      {p1 && p2 && stats1 && stats2 && (
        <div className="flex items-center justify-center gap-4 flex-wrap text-sm text-foreground">
          <span>{p1.display_name} owes {p2.charity_name}: <strong>${stats1.donationsOwed}</strong></span>
          <span className="text-muted-foreground">•</span>
          <span>{p2.display_name} owes {p1.charity_name}: <strong>${stats2.donationsOwed}</strong></span>
          <span className="text-muted-foreground">•</span>
          <span><strong>{daysLeft}</strong> days left</span>
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
            quarterStreak={q2Streak1}
            totalStreak={totalStreak1}
            bestStreak={best1}
            otherQuarterStreak={q2Streak2}
            initial="K"
            sugarItemsThisPeriod={stats1.sugarItemsThisPeriod}
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
            quarterStreak={q2Streak2}
            totalStreak={totalStreak2}
            bestStreak={best2}
            otherQuarterStreak={q2Streak1}
            initial="S"
            sugarItemsThisPeriod={stats2.sugarItemsThisPeriod}
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
