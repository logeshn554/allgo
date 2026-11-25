/**
 * AllGo Design System Theme Tokens
 * base-maia style with neutral baseColor & subtle accent (preset bbVKEbY)
 */

export const allgoTheme = {
  colors: {
    // Brand & Theme Neutral Palette
    brand: {
      primary: '#171717', // Neutral 900
      hover: '#262626', // Neutral 800
      light: '#F5F5F5', // Neutral 100
      ring: '#737373', // Neutral 500
    },
    background: {
      default: '#0A0A0A', // Dark Neutral
      card: '#141414', // Card background
      subtle: '#1C1C1C', // Elevated / Subtle
      sidebar: '#0F0F0F', // Sidebar dark
    },
    text: {
      primary: '#FAFAFA', // Neutral 50
      secondary: '#A3A3A3', // Neutral 400
      muted: '#737373', // Neutral 500
      inverse: '#171717', // Neutral 900
    },
    border: {
      default: 'rgba(255, 255, 255, 0.1)',
      subtle: 'rgba(255, 255, 255, 0.06)',
      focus: '#737373',
    },
    // Multi-Vertical Accent Tokens
    verticals: {
      food: '#F59E0B', // Amber 500
      grocery: '#10B981', // Emerald 500
      mobility: '#6366F1', // Indigo 500
      parcel: '#EC4899', // Pink 500
      courier: '#8B5CF6', // Purple 500
    },
    // Status State Tokens
    status: {
      active: {
        bg: 'oklch(0.25 0.08 145)',
        text: 'oklch(0.85 0.15 145)',
        border: 'oklch(0.35 0.12 145)',
      },
      pending: {
        bg: 'oklch(0.25 0.08 75)',
        text: 'oklch(0.85 0.15 75)',
        border: 'oklch(0.35 0.12 75)',
      },
      suspended: {
        bg: 'oklch(0.25 0.08 25)',
        text: 'oklch(0.85 0.15 25)',
        border: 'oklch(0.35 0.12 25)',
      },
      blocked: {
        bg: 'oklch(0.20 0.08 25)',
        text: 'oklch(0.80 0.15 25)',
        border: 'oklch(0.30 0.12 25)',
      },
      info: {
        bg: 'oklch(0.25 0.08 250)',
        text: 'oklch(0.85 0.15 250)',
        border: 'oklch(0.35 0.12 250)',
      },
    },
  },
} as const;

export type AllGoTheme = typeof allgoTheme;
