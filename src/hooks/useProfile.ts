import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { useGuestMode } from '@/hooks/useGuestMode';

export interface Profile {
  name: string;
  area?: string;
  obstacle?: string;
}

export function useProfile() {
  const { isAuthenticated } = useAuthState();
  const { isGuest } = useGuestMode();
  const [profile, setProfile] = useState<Profile>({ name: '' });
  const [loading, setLoading] = useState(true);

  // Load profile from Supabase (or localStorage for guests)
  useEffect(() => {
    if (isGuest) {
      try {
        const stored = localStorage.getItem('focuson-user-name');
        const name = stored ? JSON.parse(stored) : '';
        const area = localStorage.getItem('focuson-user-area');
        const obstacle = localStorage.getItem('focuson-user-obstacle');
        setProfile({
          name: typeof name === 'string' ? name : '',
          area: area ? JSON.parse(area) : undefined,
          obstacle: obstacle ? JSON.parse(obstacle) : undefined,
        });
      } catch {}
      setLoading(false);
      return;
    }

    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data } = await supabase
          .from('profiles')
          .select('display_name, area, obstacle')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setProfile({
            name: (data as any).display_name || '',
            area: (data as any).area || undefined,
            obstacle: (data as any).obstacle || undefined,
          });
        }
      } catch {}
      setLoading(false);
    })();
  }, [isAuthenticated, isGuest]);

  // Upsert profile to Supabase
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile); // Optimistic

    if (isGuest) {
      if (updates.name !== undefined) localStorage.setItem('focuson-user-name', JSON.stringify(updates.name));
      if (updates.area !== undefined) localStorage.setItem('focuson-user-area', JSON.stringify(updates.area));
      if (updates.obstacle !== undefined) localStorage.setItem('focuson-user-obstacle', JSON.stringify(updates.obstacle));
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('profiles').update({
        display_name: newProfile.name || null,
        area: newProfile.area || null,
        obstacle: newProfile.obstacle || null,
      } as any).eq('user_id', user.id);
    } catch {}
  }, [profile, isGuest]);

  return { profile, updateProfile, loading };
}
