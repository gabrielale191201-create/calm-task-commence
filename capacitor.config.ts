import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ee67add7fb83488da1bbf6aa1acc5d65',
  appName: 'Focus On',
  webDir: 'dist',
  server: {
    // For development: load from Lovable preview
    // Comment this out for production builds
    url: 'https://ee67add7-fb83-488d-a1bb-f6aa1acc5d65.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      // Android: request exact alarm permission for precise scheduling
      // Required for Android 12+ (API 31+)
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#4aba82',
      sound: 'beep.wav'
    }
  }
};

export default config;
