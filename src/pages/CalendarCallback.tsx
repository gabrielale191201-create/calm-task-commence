import { useEffect } from 'react';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function CalendarCallback() {
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_SUPABASE_URL;
    const query = window.location.search || '';

    if (!backendUrl || !query) {
      window.location.replace('/?calendar=error&reason=callback');
      return;
    }

    window.location.replace(`${backendUrl}/functions/v1/google-calendar-callback${query}`);
  }, []);

  return <LoadingScreen message="Conectando Google Calendar..." />;
}