// Job: Deep-linking utility for turn-by-turn navigation in Google Maps, Waze, or Apple Maps.

export type NavigationProvider = 'google' | 'waze' | 'apple';

export interface NavigationTarget {
  latitude: number;
  longitude: number;
  label?: string;
}

export function buildNavigationUri(provider: NavigationProvider, target: NavigationTarget): string {
  const { latitude, longitude, label } = target;
  const encodedLabel = encodeURIComponent(label || 'Delivery Stop');

  switch (provider) {
    case 'google':
      // Google Maps Turn-by-Turn Intent (Android/iOS)
      return `google.navigation:q=${latitude},${longitude}&mode=d`;
    case 'waze':
      // Waze Navigation Deep Link
      return `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
    case 'apple':
      // Apple Maps Directions Deep Link
      return `maps://?daddr=${latitude},${longitude}&q=${encodedLabel}`;
    default:
      return `https://maps.google.com/?q=${latitude},${longitude}`;
  }
}

export function launchNavigation(
  provider: NavigationProvider,
  target: NavigationTarget,
  launcher?: (uri: string) => boolean
): { success: boolean; uri: string } {
  const uri = buildNavigationUri(provider, target);
  if (launcher) {
    const success = launcher(uri);
    return { success, uri };
  }
  return { success: true, uri };
}
