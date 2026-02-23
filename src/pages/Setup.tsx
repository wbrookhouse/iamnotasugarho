import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAppConfig, getParticipants, generateSlugs, markSetupComplete } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Copy, Check, ExternalLink } from 'lucide-react';

export default function Setup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [links, setLinks] = useState<{ name: string; slug: string }[] | null>(null);
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const config = await getAppConfig();
      if (config?.setup_complete) {
        navigate('/not-found', { replace: true });
        return;
      }
      setLoading(false);
    })();
  }, [navigate]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { dashboardSlug } = await generateSlugs();
      const participants = await getParticipants();
      const result = participants.map((p: any) => ({
        name: p.display_name,
        slug: p.secret_slug,
      }));
      result.push({ name: 'Dashboard', slug: dashboardSlug });
      setLinks(result);
    } catch (err) {
      toast.error('Failed to generate links');
    }
    setGenerating(false);
  };

  const handleCopy = (slug: string) => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied((prev) => ({ ...prev, [slug]: true }));
    setTimeout(() => setCopied((prev) => ({ ...prev, [slug]: false })), 2000);
  };

  const handleComplete = async () => {
    await markSetupComplete();
    toast.success('Setup complete! Save your links.');
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center">🍬 Sugar-Free Challenge</CardTitle>
          <p className="text-center text-muted-foreground text-sm">One-time setup — generate your secret links</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!links ? (
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full h-14 text-lg"
            >
              {generating ? 'Generating…' : 'Generate Secret Links'}
            </Button>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center">
                ⚠️ Save these links now — they won't be shown again!
              </p>
              <div className="space-y-3">
                {links.map((link) => (
                  <div
                    key={link.slug}
                    className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{link.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        /{link.slug}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(link.slug)}
                      className="shrink-0"
                    >
                      {copied[link.slug] ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleComplete}
                variant="outline"
                className="w-full h-12 mt-4"
              >
                Mark Setup Complete
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
