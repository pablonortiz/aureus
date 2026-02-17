import React from 'react';
import {StyleSheet, View, Image, Pressable, Text} from 'react-native';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import {vaultService} from '../services/vaultService';
import type {GalleryMedia} from '../../../core/types';

interface MediaThumbnailProps {
  item: GalleryMedia;
  selected: boolean;
  selectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
  size: number;
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function MediaThumbnail({
  item,
  selected,
  selectionMode,
  onPress,
  onLongPress,
  size,
}: MediaThumbnailProps) {
  const uri =
    item.media_type === 'video'
      ? vaultService.getThumbnailUri(item.filename)
      : vaultService.getFileUri(item.vault_path);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.container, {width: size, height: size}]}>
      <Image
        source={{uri}}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Video duration badge */}
      {item.media_type === 'video' && item.duration != null && (
        <View style={styles.videoBadge}>
          <Icon name="play-arrow" size={12} color="#fff" />
          <Text style={styles.durationText}>
            {formatDuration(item.duration)}
          </Text>
        </View>
      )}

      {/* Favorite heart */}
      {item.is_favorite && (
        <View style={styles.favoriteBadge}>
          <Icon name="favorite" size={14} color="#ef4444" />
        </View>
      )}

      {/* Selection checkbox */}
      {selectionMode && (
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <Icon name="check" size={14} color={colors.backgroundDark} />}
        </View>
      )}

      {/* Selected overlay */}
      {selected && <View style={styles.selectedOverlay} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceDark,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  durationText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    color: '#fff',
  },
  favoriteBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  checkbox: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(232, 186, 48, 0.2)',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
});
