import React, {useEffect, useCallback, useMemo} from 'react';
import {Dimensions, StyleSheet} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const MAX_SCALE = 5;

interface ZoomableViewProps {
  children: React.ReactNode;
  /** Single-tap callback. Also enables double-tap-to-zoom. Omit for videos so native controls receive taps. */
  onTap?: () => void;
  onZoomChange?: (zoomed: boolean) => void;
  /** When false, zoom resets to 1x (e.g. when navigating to another page). */
  isActive?: boolean;
}

export function ZoomableView({
  children,
  onTap,
  onZoomChange,
  isActive = true,
}: ZoomableViewProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const focalXStart = useSharedValue(0);
  const focalYStart = useSharedValue(0);

  const notifyZoom = useCallback(
    (zoomed: boolean) => {
      if (onZoomChange) onZoomChange(zoomed);
    },
    [onZoomChange],
  );

  // Reset zoom when becoming inactive (navigated to another page)
  useEffect(() => {
    if (!isActive && scale.value !== 1) {
      scale.value = withTiming(1, {duration: 200});
      translateX.value = withTiming(0, {duration: 200});
      translateY.value = withTiming(0, {duration: 200});
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      notifyZoom(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(event => {
          'worklet';
          savedScale.value = scale.value;
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
          focalXStart.value = event.focalX - SCREEN_WIDTH / 2;
          focalYStart.value = event.focalY - SCREEN_HEIGHT / 2;
          runOnJS(notifyZoom)(true);
        })
        .onUpdate(event => {
          'worklet';
          const newScale = savedScale.value * event.scale;
          scale.value = Math.min(Math.max(newScale, 0.5), MAX_SCALE);
          // Keep pinch focal point fixed in screen space
          translateX.value =
            savedTranslateX.value +
            focalXStart.value * (1 - event.scale);
          translateY.value =
            savedTranslateY.value +
            focalYStart.value * (1 - event.scale);
        })
        .onEnd(() => {
          'worklet';
          if (scale.value < 1) {
            scale.value = withTiming(1);
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
            savedScale.value = 1;
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
            runOnJS(notifyZoom)(false);
          } else {
            savedScale.value = scale.value;
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
            runOnJS(notifyZoom)(scale.value > 1.05);
          }
        }),
    [notifyZoom],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .manualActivation(true)
        .onTouchesDown((_event, state) => {
          'worklet';
          // Fail immediately when not zoomed so FlatList handles the swipe
          if (scale.value <= 1.05) {
            state.fail();
          }
        })
        .onTouchesMove((event, state) => {
          'worklet';
          if (scale.value > 1.05 && event.allTouches.length === 1) {
            state.activate();
          }
        })
        .onStart(() => {
          'worklet';
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        })
        .onUpdate(event => {
          'worklet';
          translateX.value = savedTranslateX.value + event.translationX;
          translateY.value = savedTranslateY.value + event.translationY;
        })
        .onEnd(() => {
          'worklet';
          // Clamp to bounds
          const maxX = (SCREEN_WIDTH * (scale.value - 1)) / 2;
          const maxY = (SCREEN_HEIGHT * (scale.value - 1)) / 2;

          let clampedX = translateX.value;
          let clampedY = translateY.value;
          if (clampedX > maxX) clampedX = maxX;
          if (clampedX < -maxX) clampedX = -maxX;
          if (clampedY > maxY) clampedY = maxY;
          if (clampedY < -maxY) clampedY = -maxY;

          if (clampedX !== translateX.value)
            translateX.value = withTiming(clampedX);
          if (clampedY !== translateY.value)
            translateY.value = withTiming(clampedY);

          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        }),
    [],
  );

  const gesture = useMemo(() => {
    const zoomPan = Gesture.Simultaneous(pinchGesture, panGesture);

    if (onTap) {
      const doubleTap = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(event => {
          'worklet';
          if (scale.value > 1.05) {
            // Zoom out
            scale.value = withTiming(1);
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
            savedScale.value = 1;
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
            runOnJS(notifyZoom)(false);
          } else {
            // Zoom in centered on tap point
            const targetScale = 2.5;
            const fx = event.x - SCREEN_WIDTH / 2;
            const fy = event.y - SCREEN_HEIGHT / 2;
            // Center the tapped point on screen
            let tx = -(fx * targetScale);
            let ty = -(fy * targetScale);
            // Clamp
            const maxTx = (SCREEN_WIDTH * (targetScale - 1)) / 2;
            const maxTy = (SCREEN_HEIGHT * (targetScale - 1)) / 2;
            tx = Math.max(-maxTx, Math.min(maxTx, tx));
            ty = Math.max(-maxTy, Math.min(maxTy, ty));

            scale.value = withTiming(targetScale);
            translateX.value = withTiming(tx);
            translateY.value = withTiming(ty);
            savedScale.value = targetScale;
            savedTranslateX.value = tx;
            savedTranslateY.value = ty;
            runOnJS(notifyZoom)(true);
          }
        });

      const singleTap = Gesture.Tap()
        .numberOfTaps(1)
        .onEnd(() => {
          'worklet';
          if (onTap) runOnJS(onTap)();
        });

      const taps = Gesture.Exclusive(doubleTap, singleTap);
      return Gesture.Simultaneous(taps, zoomPan);
    }

    return zoomPan;
  }, [pinchGesture, panGesture, onTap, notifyZoom]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: translateX.value},
      {translateY: translateY.value},
      {scale: scale.value},
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
