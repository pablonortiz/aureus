export const colors = {
  primary: '#e8ba30',
  primaryLight: 'rgba(232, 186, 48, 0.1)',
  primaryMuted: 'rgba(232, 186, 48, 0.3)',
  primaryGlow: 'rgba(232, 186, 48, 0.4)',
  primaryDark: '#b88d0d',

  backgroundDark: '#1a1812',
  surfaceDark: '#26241c',
  cardDark: '#1e1e1e',
  neutralDark: '#2a2a2a',
  navBarDark: '#1a170d',

  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textDanger: '#ef4444',

  borderSubtle: 'rgba(255, 255, 255, 0.05)',
  borderGold: 'rgba(232, 186, 48, 0.3)',
  borderGoldLight: 'rgba(232, 186, 48, 0.1)',

  successGreen: '#22c55e',
  dangerRed: '#ef4444',
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;
