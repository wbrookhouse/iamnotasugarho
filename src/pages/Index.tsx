import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAppConfig } from '@/lib/queries';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const config = await getAppConfig();
      if (!config?.setup_complete) {
        navigate('/setup', { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">🍬 Sugar-Free Challenge</h1>
        <p className="text-muted-foreground">Use your secret link to access your page.</p>
      </div>
    </div>
  );
};

export default Index;
