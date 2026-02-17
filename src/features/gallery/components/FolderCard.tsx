import React from 'react';
import {StyleSheet, View, Text, Pressable} from 'react-native';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import type {GalleryFolder} from '../../../core/types';

interface FolderCardProps {
  folder: GalleryFolder;
  onPress: () => void;
  onLongPress?: () => void;
}

export function FolderCard({folder, onPress, onLongPress}: FolderCardProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({pressed}) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.iconWrap}>
        <Icon name="folder" size={28} color={colors.primary} />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {folder.name}
      </Text>
      <Text style={styles.count}>
        {folder.media_count || 0} {folder.media_count === 1 ? 'archivo' : 'archivos'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 110,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardPressed: {
    borderColor: colors.borderGold,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  count: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
});
