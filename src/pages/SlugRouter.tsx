import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAppConfig, getParticipantBySlug } from '@/lib/queries';
import ParticipantPage from './ParticipantPage';
import Dashboard from './Dashboard';

export default function SlugRouter() {
  const { slug } = useParams<{ slug: string }>();
  const [mode, setMode] = useState<'loading' | 'participant' | 'dashboard' | 'notfound'>('loading');

  useEffect(() => {
    (async () => {
      if (!slug) {
        setMode('notfound');
        return;
      }

      // Check if it's the dashboard slug
      const config = await getAppConfig();
      if (config?.dashboard_slug === slug) {
        setMode('dashboard');
        return;
      }

      // Check if it's a participant slug
      const p = await getParticipantBySlug(slug);
      if (p) {
        setMode('participant');
        return;
      }

      setMode('notfound');
    })();
  }, [slug]);

  if (mode === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (mode === 'participant') return <ParticipantPage />;
  if (mode === 'dashboard') return <Dashboard />;

  return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Page not found</div>;
}
