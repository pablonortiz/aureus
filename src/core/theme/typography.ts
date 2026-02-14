import {TextStyle} from 'react-native';

export const fontFamily = {
  light: 'Manrope-Light',
  regular: 'Manrope-Regular',
  medium: 'Manrope-Medium',
  semiBold: 'Manrope-SemiBold',
  bold: 'Manrope-Bold',
  extraBold: 'Manrope-ExtraBold',
} as const;

export const typography: Record<string, TextStyle> = {
  appTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 20,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
  },
  bodyMedium: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
  },
  bodySemiBold: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
  },
  bodyBold: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  caption: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  captionSmall: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  small: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
  },
  smallBold: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  tabLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
};
