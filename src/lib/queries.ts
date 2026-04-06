import { supabase } from '@/integrations/supabase/client';
import { getTodayLocal, get14DayPeriod, START_DATE } from './dates';

export async function getAppConfig() {
  const { data, error } = await supabase
    .from('app_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getParticipants() {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .order('display_name');
  if (error) throw error;
  return data || [];
}

export async function getParticipantBySlug(slug: string) {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('secret_slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getEvents(participantId?: string) {
  let query = supabase
    .from('events')
    .select('*')
    .is('deleted_at', null)
    .order('ts_utc', { ascending: false });

  if (participantId) {
    query = query.eq('participant_id', participantId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getTodayEvents(participantId: string) {
  const today = getTodayLocal();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('participant_id', participantId)
    .eq('date_local', today)
    .is('deleted_at', null)
    .order('ts_utc', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function logEvent(participantId: string, type: 'SUGAR' | 'FREE_DAY') {
  const today = getTodayLocal();
  const { data, error } = await supabase
    .from('events')
    .insert({
      participant_id: participantId,
      type,
      date_local: today,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function softDeleteEvent(eventId: string) {
  const { error } = await supabase
    .from('events')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', eventId);
  if (error) throw error;
}

export async function hardDeleteEvent(eventId: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);
  if (error) throw error;
}

export async function updateCharityName(participantId: string, charityName: string) {
  const { error } = await supabase
    .from('participants')
    .update({ charity_name: charityName })
    .eq('id', participantId);
  if (error) throw error;
}

export async function generateSlugs() {
  const randomSlug = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const participants = await getParticipants();
  const dashboardSlug = randomSlug();

  for (const p of participants) {
    const slug = randomSlug();
    await supabase
      .from('participants')
      .update({ secret_slug: slug })
      .eq('id', p.id);
  }

  await supabase
    .from('app_config')
    .update({ dashboard_slug: dashboardSlug })
    .eq('id', 1);

  return { dashboardSlug };
}

export async function markSetupComplete() {
  await supabase
    .from('app_config')
    .update({ setup_complete: true })
    .eq('id', 1);
}

// Calculations
export interface ParticipantStats {
  freeDaysUsed: number;
  freeDaysRemaining: number;
  donationsOwed: number;
  streak: number;
  daysSinceLastSugar: number | null;
  heatmapData: Record<string, 'green' | 'red'>;
}

export function calculateStats(
  events: any[],
  participantId: string,
  todayLocal: string
): ParticipantStats {
  const pEvents = events.filter(
    (e: any) => e.participant_id === participantId && !e.deleted_at
  );

  // Free day dates
  const freeDayDates = new Set(
    pEvents.filter((e: any) => e.type === 'FREE_DAY').map((e: any) => e.date_local)
  );

  // Sugar dates
  const sugarDates = new Set(
    pEvents.filter((e: any) => e.type === 'SUGAR').map((e: any) => e.date_local)
  );

  const freeDaysUsed = freeDayDates.size;
  const freeDaysRemaining = Math.max(0, 10 - freeDaysUsed);

  // Sugar items on non-free days
  const sugarOnNonFreeDays = pEvents.filter(
    (e: any) => e.type === 'SUGAR' && !freeDayDates.has(e.date_local)
  ).length;
  const donationsOwed = sugarOnNonFreeDays * 5;

  // Streak: consecutive days with no sugar at all, ending today
  let streak = 0;
  const today = new Date(todayLocal + 'T00:00:00');
  for (let i = 0; ; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (ds < '2026-02-24') break;
    if (sugarDates.has(ds)) break;
    streak++;
  }

  // Days since last sugar
  let daysSinceLastSugar: number | null = null;
  const sugarDatesSorted = Array.from(sugarDates).sort().reverse();
  if (sugarDatesSorted.length > 0) {
    const lastSugar = sugarDatesSorted[0];
    const diff = Math.floor(
      (new Date(todayLocal + 'T00:00:00').getTime() - new Date(lastSugar + 'T00:00:00').getTime()) /
        (1000 * 60 * 60 * 24)
    );
    daysSinceLastSugar = diff;
  }

  // Heatmap
  const heatmapData: Record<string, 'green' | 'red'> = {};
  for (const d of freeDayDates) {
    heatmapData[d] = 'green';
  }
  for (const d of sugarDates) {
    if (!freeDayDates.has(d)) {
      heatmapData[d] = 'red';
    }
  }

  return { freeDaysUsed, freeDaysRemaining, donationsOwed, streak, daysSinceLastSugar, heatmapData };
}
