/** Design tokens shared across rider, driver, and admin. */

export const colors = {
  brand: '#1f6feb',
  brandDark: '#0a4ec9',
  surface: '#ffffff',
  surfaceMuted: '#f6f8fa',
  border: '#d0d7de',
  text: '#1f2328',
  textMuted: '#656d76',
  success: '#1a7f37',
  warning: '#bf8700',
  danger: '#cf222e',
  online: '#1a7f37',
  offline: '#656d76',
  onTrip: '#bf8700',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

export const typography = {
  family: { sans: 'System', mono: 'Menlo' },
  size: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28 },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
} as const;
