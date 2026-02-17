import React from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import {useGalleryStore} from '../store/useGalleryStore';

export function ImportToast() {
  const insets = useSafeAreaInsets();
  const importToast = useGalleryStore(s => s.importToast);

  if (!importToast) return null;

  return (
    <View style={[styles.container, {top: insets.top + 60}]}>
      <Icon name="file-download" size={16} color={colors.primary} />
      <Text style={styles.text}>{importToast.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderGold,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  text: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
});
