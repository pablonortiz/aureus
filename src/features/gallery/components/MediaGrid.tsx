import React, {useState, useRef, useCallback} from 'react';
import {
  StyleSheet,
  FlatList,
  useWindowDimensions,
  View,
  Text,
  type GestureResponderEvent,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type LayoutChangeEvent,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
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
  onDragSelect?: (id: number) => void;
}

const NUM_COLUMNS = 3;
const GRID_GAP = 3;

export function MediaGrid({
  media,
  selectedIds,
  selectionMode,
  onPress,
  onLongPress,
  onDragSelect,
}: MediaGridProps) {
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const itemSize = (width - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
  const rowHeight = itemSize + GRID_GAP;

  const [dragSelecting, setDragSelecting] = useState(false);

  // Refs for drag tracking
  const isDragSelectingRef = useRef(false);
  const scrollOffsetRef = useRef(0);
  const gridPageYRef = useRef(0);
  const lastSelectedIndexRef = useRef(-1);
  const flatListRef = useRef<FlatList>(null);
  const wrapperRef = useRef<View>(null);

  const getItemIndexAtPosition = useCallback(
    (pageX: number, pageY: number): number => {
      const relY = pageY - gridPageYRef.current + scrollOffsetRef.current;
      const relX = pageX;

      if (relY < 0 || relX < 0) return -1;

      const col = Math.floor(relX / (itemSize + GRID_GAP));
      const row = Math.floor(relY / rowHeight);

      if (col >= NUM_COLUMNS) return -1;

      const index = row * NUM_COLUMNS + col;
      if (index >= media.length) return -1;

      return index;
    },
    [itemSize, rowHeight, media.length],
  );

  const handleLongPress = useCallback(
    (item: GalleryMedia) => {
      onLongPress(item);
      if (onDragSelect) {
        isDragSelectingRef.current = true;
        setDragSelecting(true);
        const idx = media.findIndex(m => m.id === item.id);
        lastSelectedIndexRef.current = idx;
      }
    },
    [onLongPress, onDragSelect, media],
  );

  const handleTouchMove = useCallback(
    (e: GestureResponderEvent) => {
      if (!isDragSelectingRef.current || !onDragSelect) return;

      const {pageX, pageY} = e.nativeEvent;
      const index = getItemIndexAtPosition(pageX, pageY);

      if (index >= 0 && index !== lastSelectedIndexRef.current) {
        const item = media[index];
        if (item && !selectedIds.includes(item.id)) {
          onDragSelect(item.id);
        }
        lastSelectedIndexRef.current = index;
      }
    },
    [getItemIndexAtPosition, media, selectedIds, onDragSelect],
  );

  const handleTouchEnd = useCallback(() => {
    if (isDragSelectingRef.current) {
      isDragSelectingRef.current = false;
      setDragSelecting(false);
      lastSelectedIndexRef.current = -1;
    }
  }, []);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
    },
    [],
  );

  const handleLayout = useCallback((_e: LayoutChangeEvent) => {
    // Measure grid's position on the page
    wrapperRef.current?.measure((_x, _y, _w, _h, _px, pageY) => {
      gridPageYRef.current = pageY;
    });
  }, []);

  // Reset drag state when selection mode is cleared
  React.useEffect(() => {
    if (!selectionMode) {
      isDragSelectingRef.current = false;
      setDragSelecting(false);
      lastSelectedIndexRef.current = -1;
    }
  }, [selectionMode]);

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
    <View
      ref={wrapperRef}
      style={styles.wrapper}
      onLayout={handleLayout}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}>
      <FlatList
        ref={flatListRef}
        data={media}
        numColumns={NUM_COLUMNS}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={[styles.grid, {paddingBottom: 120 + insets.bottom}]}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!dragSelecting}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({item}) => (
          <MediaThumbnail
            item={item}
            selected={selectedIds.includes(item.id)}
            selectionMode={selectionMode}
            onPress={() => onPress(item)}
            onLongPress={() => handleLongPress(item)}
            size={itemSize}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  grid: {},
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
