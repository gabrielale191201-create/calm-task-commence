import { useLocalStorage } from './useLocalStorage';

export function useGuestMode() {
  const [isGuest, setIsGuest] = useLocalStorage<boolean>('focuson-guest-mode', false);
  const [guestBannerDismissed, setGuestBannerDismissed] = useLocalStorage<boolean>('focuson-guest-banner-dismissed', false);

  const enterGuestMode = () => {
    setIsGuest(true);
  };

  const exitGuestMode = () => {
    setIsGuest(false);
  };

  const dismissGuestBanner = () => {
    setGuestBannerDismissed(true);
  };

  return {
    isGuest,
    enterGuestMode,
    exitGuestMode,
    guestBannerDismissed,
    dismissGuestBanner,
  };
}
