import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  getParticipantBySlug,
  getTodayEvents,
  logEvent,
  softDeleteEvent,
  updateCharityName,
  getEvents,
  calculateStats,
} from '@/lib/queries';
import { getTodayLocal, getNowLocalTime, isBeforeStart, isAfterEnd } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Trash2, Pencil, Check, Leaf, Candy } from 'lucide-react';

export default function ParticipantPage() {
  const { slug } = useParams<{ slug: string }>();
  const [participant, setParticipant] = useState<any>(null);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editingCharity, setEditingCharity] = useState(false);
  const [charityInput, setCharityInput] = useState('');
  const [freeDayUsedToday, setFreeDayUsedToday] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const refresh = useCallback(async () => {
    if (!participant) return;
    const [today, allEvents] = await Promise.all([
      getTodayEvents(participant.id),
      getEvents(),
    ]);
    setTodayEvents(today);
    const todayLocal = getTodayLocal();
    setStats(calculateStats(allEvents, participant.id, todayLocal));
    setFreeDayUsedToday(
      today.some((e: any) => e.type === 'FREE_DAY')
    );
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

  const handleLog = async (type: 'SUGAR' | 'FREE_DAY') => {
    if (type === 'FREE_DAY' && freeDayUsedToday) {
      toast.info('Free Day already used today.');
      return;
    }
    if (type === 'FREE_DAY' && stats && stats.freeDaysRemaining <= 0) {
      toast.info('No Free Days remaining.');
      return;
    }
    try {
      const event = await logEvent(participant.id, type);
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

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="pt-4">
        <h1 className="text-2xl font-bold">{participant.display_name}</h1>
        <div className="flex items-center gap-2 mt-1">
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
              Charity: <span className="font-medium text-foreground">{participant.charity_name}</span>
              <button
                onClick={() => setEditingCharity(true)}
                className="ml-2 inline-flex text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </p>
          )}
        </div>
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

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => handleLog('FREE_DAY')}
          disabled={disabled}
          className="h-20 text-base font-semibold bg-success hover:bg-success/90 text-success-foreground flex flex-col gap-1"
        >
          <Leaf className="h-6 w-6" />
          Report Free Day
        </Button>
        <Button
          onClick={() => handleLog('SUGAR')}
          disabled={disabled}
          variant="destructive"
          className="h-20 text-base font-semibold flex flex-col gap-1"
        >
          <Candy className="h-6 w-6" />
          Report Sugar Item
        </Button>
      </div>

      {/* Quick stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{stats.freeDaysRemaining}</p>
              <p className="text-xs text-muted-foreground mt-1">Free Days Left</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{stats.streak}</p>
              <p className="text-xs text-muted-foreground mt-1">Day Streak 🔥</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-destructive">${stats.donationsOwed}</p>
              <p className="text-xs text-muted-foreground mt-1">Owed to Charity</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">
                {stats.daysSinceLastSugar !== null ? stats.daysSinceLastSugar : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Days Since Sugar</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Today's log */}
      <div>
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
          Today's Log
        </h2>
        {todayEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries today.</p>
        ) : (
          <div className="space-y-2">
            {todayEvents.map((e: any) => (
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
