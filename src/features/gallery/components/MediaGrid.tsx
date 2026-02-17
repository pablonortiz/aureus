import React from 'react';
import {StyleSheet, FlatList, useWindowDimensions, View, Text} from 'react-native';
import {colors, fontFamily} from '../../../core/theme';
import {Icon} from '../../../core/components';
import {MediaThumbnail} from './MediaThumbnail';
import type {GalleryMedia} from '../../../core/types';

interface MediaGridProps {
  media: GalleryMedia[];
  selectedIds: number[];
  selectionMode: boolean;
  onPress: (item: GalleryMedia) => void;
  onLongPress: (item: GalleryMedia) => void;
}

const NUM_COLUMNS = 3;
const GRID_GAP = 3;

export function MediaGrid({
  media,
  selectedIds,
  selectionMode,
  onPress,
  onLongPress,
}: MediaGridProps) {
  const {width} = useWindowDimensions();
  const itemSize = (width - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  if (media.length === 0) {
    return (
      <View style={styles.empty}>
        <Icon name="photo-library" size={48} color={colors.textMuted} />
        <Text style={styles.emptyText}>Sin archivos</Text>
        <Text style={styles.emptySubtext}>
          Importá fotos o videos para empezar
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={media}
      numColumns={NUM_COLUMNS}
      keyExtractor={item => item.id.toString()}
      contentContainerStyle={styles.grid}
      columnWrapperStyle={styles.row}
      showsVerticalScrollIndicator={false}
      renderItem={({item}) => (
        <MediaThumbnail
          item={item}
          selected={selectedIds.includes(item.id)}
          selectionMode={selectionMode}
          onPress={() => onPress(item)}
          onLongPress={() => onLongPress(item)}
          size={itemSize}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  grid: {
    paddingBottom: 120,
  },
  row: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
});
