import { useEffect, useState, useCallback } from 'react';
import { getParticipants, getEvents, logEvent, softDeleteEvent, updateCharityName, calculateStats, type ParticipantStats } from '@/lib/queries';
import { getTodayLocal } from '@/lib/dates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Heatmap from '@/components/Heatmap';
import { toast } from 'sonner';
import { Pencil, Check, X, Trash2 } from 'lucide-react';

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

const Index = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allStats, setAllStats] = useState<Record<string, ParticipantStats>>({});
  const [allTodayEvents, setAllTodayEvents] = useState<Event[]>([]);
  const [freeDayUsedTodayMap, setFreeDayUsedTodayMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [editingCharity, setEditingCharity] = useState<string | null>(null);
  const [charityInput, setCharityInput] = useState('');

  const todayLocal = getTodayLocal();

  const refresh = useCallback(async () => {
    try {
      const [allEvents, parts] = await Promise.all([getEvents(), getParticipants()]);
      setParticipants(parts);

      const statsMap: Record<string, ParticipantStats> = {};
      const freeDayMap: Record<string, boolean> = {};

      for (const p of parts) {
        statsMap[p.id] = calculateStats(allEvents, p.id, todayLocal);
        const todayEvents = allEvents.filter(
          (e) => e.participant_id === p.id && e.date_local === todayLocal && !e.deleted_at
        );
        freeDayMap[p.id] = todayEvents.some((e) => e.type === 'FREE_DAY');
      }

      setAllStats(statsMap);
      setFreeDayUsedTodayMap(freeDayMap);
      setAllTodayEvents(
        allEvents.filter((e) => e.date_local === todayLocal && !e.deleted_at)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [todayLocal]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleLog = async (participantId: string, type: 'SUGAR' | 'FREE_DAY') => {
    try {
      const name = participants.find((p) => p.id === participantId)?.display_name;
      if (type === 'FREE_DAY' && freeDayUsedTodayMap[participantId]) {
        toast.error(`${name} already used a free day today`);
        return;
      }
      const stats = allStats[participantId];
      if (type === 'FREE_DAY' && stats && stats.freeDaysRemaining <= 0) {
        toast.error(`${name} has no free days remaining`);
        return;
      }
      await logEvent(participantId, type);
      toast.success(`Logged ${type === 'SUGAR' ? 'sugar item' : 'free day'} for ${name}`);
      await refresh();
    } catch (err) {
      toast.error('Failed to log event');
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      await softDeleteEvent(eventId);
      toast.success('Event deleted');
      await refresh();
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };

  const handleSaveCharity = async (participantId: string) => {
    try {
      await updateCharityName(participantId, charityInput);
      toast.success('Charity updated');
      setEditingCharity(null);
      await refresh();
    } catch (err) {
      toast.error('Failed to update charity');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Calculate who owes whom
  const p1 = participants[0];
  const p2 = participants[1];
  const s1 = p1 ? allStats[p1.id] : null;
  const s2 = p2 ? allStats[p2.id] : null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-center">🍬 Sugar-Free Challenge</h1>

      {/* Logging Controls */}
      {participants.map((p) => (
        <Card key={p.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{p.display_name}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => handleLog(p.id, 'FREE_DAY')}
              disabled={freeDayUsedTodayMap[p.id]}
            >
              🟢 Report Free Day
            </Button>
            <Button
              variant="outline"
              onClick={() => handleLog(p.id, 'SUGAR')}
            >
              🔴 Report Sugar Item
            </Button>
          </CardContent>
        </Card>
      ))}

      {/* Today's Log */}
      {allTodayEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Today's Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {allTodayEvents.map((e) => {
              const name = participants.find((p) => p.id === e.participant_id)?.display_name;
              return (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <span>
                    {e.type === 'SUGAR' ? '🔴' : '🟢'} {name} — {e.type === 'SUGAR' ? 'Sugar' : 'Free Day'}{' '}
                    <span className="text-muted-foreground">
                      {new Date(e.ts_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(e.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Global Owe Card */}
      {p1 && p2 && s1 && s2 && (
        <Card>
          <CardContent className="pt-6 text-center text-lg font-semibold">
            {s1.donationsOwed > 0 && (
              <p>{p1.display_name} owes ${s1.donationsOwed} to {p1.charity_name}</p>
            )}
            {s2.donationsOwed > 0 && (
              <p>{p2.display_name} owes ${s2.donationsOwed} to {p2.charity_name}</p>
            )}
            {s1.donationsOwed === 0 && s2.donationsOwed === 0 && (
              <p className="text-muted-foreground">Nobody owes anything yet! 🎉</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Individual Stats */}
      {participants.map((p) => {
        const stats = allStats[p.id];
        if (!stats) return null;
        return (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{p.display_name}'s Progress</CardTitle>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  {editingCharity === p.id ? (
                    <>
                      <Input
                        value={charityInput}
                        onChange={(e) => setCharityInput(e.target.value)}
                        className="h-7 w-40 text-xs"
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSaveCharity(p.id)}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingCharity(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span>Charity: {p.charity_name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => { setEditingCharity(p.id); setCharityInput(p.charity_name); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="bg-muted rounded p-2 text-center">
                  <div className="font-bold text-xl">{stats.streak}</div>
                  <div className="text-muted-foreground">Day Streak</div>
                </div>
                <div className="bg-muted rounded p-2 text-center">
                  <div className="font-bold text-xl">{stats.freeDaysUsed}/10</div>
                  <div className="text-muted-foreground">Free Days Used</div>
                </div>
                <div className="bg-muted rounded p-2 text-center">
                  <div className="font-bold text-xl">${stats.donationsOwed}</div>
                  <div className="text-muted-foreground">Donations Owed</div>
                </div>
                <div className="bg-muted rounded p-2 text-center">
                  <div className="font-bold text-xl">{stats.daysSinceLastSugar ?? '—'}</div>
                  <div className="text-muted-foreground">Days Since Sugar</div>
                </div>
              </div>
              <Heatmap data={stats.heatmapData} startDate="2026-02-24" endDate="2026-05-25" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default Index;
