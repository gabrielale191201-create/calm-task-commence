import { useAuthState } from './useAuthState';

export function useGuestMode() {
  const { isGuest, guestId, enterGuestMode, exitGuestMode } = useAuthState();
  
  // Get banner dismissed state from localStorage
  const getGuestBannerDismissed = (): boolean => {
    try {
      const stored = localStorage.getItem('focuson-guest-banner-dismissed');
      return stored ? JSON.parse(stored) === true : false;
    } catch {
      return false;
    }
  };

  const dismissGuestBanner = () => {
    try {
      localStorage.setItem('focuson-guest-banner-dismissed', 'true');
    } catch {
      console.error('Failed to dismiss banner');
    }
  };

  return {
    isGuest,
    guestId,
    enterGuestMode,
    exitGuestMode,
    guestBannerDismissed: getGuestBannerDismissed(),
    dismissGuestBanner,
  };
}
