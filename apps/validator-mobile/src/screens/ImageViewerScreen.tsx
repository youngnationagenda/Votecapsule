// ============================================================
// VoteCapsule -- Image Viewer Screen
// apps/validator-mobile/src/screens/ImageViewerScreen.tsx
//
// Full-screen image with pinch-zoom, pan, and double-tap zoom.
// Uses react-native-gesture-handler for smooth interactions.
// ============================================================
import React, { useRef, useState } from 'react';
import {
  View, StyleSheet, Dimensions, Animated,
  PanResponder, TouchableOpacity, Text,
} from 'react-native';
import { Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ImageViewer'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ImageViewerScreen({ route, navigation }: Props) {
  const { imageUrl, title } = route.params;

  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const [isZoomed, setIsZoomed] = useState(false);
  const lastScale = useRef(1);
  const lastX = useRef(0);
  const lastY = useRef(0);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      if (lastScale.current > 1) {
        translateX.setValue(lastX.current + gesture.dx);
        translateY.setValue(lastY.current + gesture.dy);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      lastX.current += gesture.dx;
      lastY.current += gesture.dy;
    },
  });

  const handleDoubleTap = () => {
    if (isZoomed) {
      // Zoom out
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      ]).start();
      lastScale.current = 1;
      lastX.current = 0;
      lastY.current = 0;
      setIsZoomed(false);
    } else {
      // Zoom in to 2.5x
      Animated.spring(scale, { toValue: 2.5, useNativeDriver: true }).start();
      lastScale.current = 2.5;
      setIsZoomed(true);
    }
  };

  const lastTap = useRef<number>(0);
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      handleDoubleTap();
    }
    lastTap.current = now;
  };

  return (
    <View style={styles.container}>
      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>

      {/* Title overlay */}
      {title && (
        <View style={styles.titleOverlay}>
          <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
        </View>
      )}

      {/* Zoomable image */}
      <Animated.View
        style={[
          styles.imageWrapper,
          {
            transform: [
              { translateX },
              { translateY },
              { scale },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity activeOpacity={1} onPress={handleTap}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Zoom hint */}
      <View style={styles.hintOverlay}>
        <Text style={styles.hintText}>
          {isZoomed ? 'Double-tap to reset' : 'Double-tap to zoom'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  closeText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  titleOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 80,
    zIndex: 10,
  },
  titleText: { color: '#ffffff', fontSize: 14, fontWeight: '500' },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  hintOverlay: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hintText: { color: '#ffffff', fontSize: 12 },
});
