import React, { useCallback } from 'react';
import {
  View, Image, Text, StyleSheet, TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { AppText }      from '../../../shared/components/AppText';
import { Colors }       from '../../../shared/theme/colors';
import { BoardElement } from '../types';

const { width: SCREEN_W } = Dimensions.get('window');
export const CANVAS_W     = SCREEN_W;
export const CANVAS_H     = SCREEN_W * 1.41; // A4 ratio

interface ElementProps {
  element:    BoardElement;
  isSelected: boolean;
  onSelect:   (id: string) => void;
  onMove:     (id: string, x: number, y: number) => void;
  onResize:   (id: string, w: number, h: number) => void;
  onRotate:   (id: string, r: number) => void;
}

function CanvasElement({
  element, isSelected, onSelect, onMove, onResize, onRotate,
}: ElementProps) {
  const startX = useSharedValue(element.x);
  const startY = useSharedValue(element.y);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const dragGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = element.x;
      startY.value = element.y;
      runOnJS(onSelect)(element.id);
    })
    .onUpdate(e => {
      const nx = Math.max(0, Math.min(CANVAS_W - element.width,  startX.value + e.translationX));
      const ny = Math.max(0, Math.min(CANVAS_H - element.height, startY.value + e.translationY));
      offsetX.value = nx - element.x;
      offsetY.value = ny - element.y;
    })
    .onEnd(e => {
      const nx = Math.max(0, Math.min(CANVAS_W - element.width,  startX.value + e.translationX));
      const ny = Math.max(0, Math.min(CANVAS_H - element.height, startY.value + e.translationY));
      runOnJS(onMove)(element.id, nx, ny);
      offsetX.value = 0;
      offsetY.value = 0;
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => { runOnJS(onSelect)(element.id); });

  const composed = Gesture.Simultaneous(dragGesture, tapGesture);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
    ],
  }));

  const renderContent = () => {
    switch (element.type) {
      case 'image':
        return element.imageUri ? (
          <Image
            source={{ uri: element.imageUri }}
            style={{ width: element.width, height: element.height, borderRadius: 4 }}
            resizeMode="cover"
          />
        ) : (
          <View style={[s.imagePlaceholder, { width: element.width, height: element.height }]}>
            <Text style={{ fontSize: 32 }}>🖼️</Text>
          </View>
        );

      case 'text':
        return (
          <View
            style={[
              s.textEl,
              {
                width:           element.width,
                minHeight:       element.height,
                backgroundColor: element.bgColor === 'transparent' ? 'transparent' : element.bgColor,
              },
            ]}
          >
            <Text
              style={{
                fontSize:   element.fontSize   ?? 20,
                fontFamily: element.fontFamily ?? 'DMSans-Bold',
                color:      element.color      ?? '#111111',
                opacity:    element.opacity    ?? 1,
              }}
            >
              {element.text}
            </Text>
          </View>
        );

      case 'sticker':
        return (
          <Text style={{ fontSize: element.width * 0.8, lineHeight: element.height }}>
            {element.emoji}
          </Text>
        );

      case 'shape':
        return (
          <View
            style={{
              width:           element.width,
              height:          element.height,
              backgroundColor: element.bgColor ?? '#2979FF',
              borderRadius:    8,
              opacity:         element.opacity ?? 1,
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Animated.View
      style={[
        s.element,
        {
          left:      element.x,
          top:       element.y,
          zIndex:    element.zIndex,
          opacity:   element.opacity ?? 1,
          transform: [{ rotate: `${element.rotation}deg` }],
        },
        animStyle,
      ]}
    >
      <GestureDetector gesture={composed}>
        <Animated.View>
          {renderContent()}
          {/* Selection border */}
          {isSelected && (
            <View
              style={[
                s.selectionBorder,
                { width: element.width, height: element.height },
              ]}
            />
          )}
        </Animated.View>
      </GestureDetector>

      {/* Resize handle (bottom-right) */}
      {isSelected && (
        <TouchableOpacity
          style={s.resizeHandle}
          onPress={() => {}}
        >
          <Text style={{ fontSize: 10, color: Colors.white }}>⤡</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ── BoardCanvas ───────────────────────────────────────────────────────────────
interface CanvasProps {
  elements:   BoardElement[];
  bgColor:    string;
  selected:   string | null;
  onSelect:   (id: string | null) => void;
  onMove:     (id: string, x: number, y: number) => void;
  onResize:   (id: string, w: number, h: number) => void;
  onRotate:   (id: string, r: number) => void;
}

export function BoardCanvas({
  elements, bgColor, selected, onSelect, onMove, onResize, onRotate,
}: CanvasProps) {
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <TouchableOpacity
      style={[s.canvas, { backgroundColor: bgColor }]}
      onPress={() => onSelect(null)}
      activeOpacity={1}
    >
      {sorted.map(el => (
        <CanvasElement
          key={el.id}
          element={el}
          isSelected={selected === el.id}
          onSelect={onSelect}
          onMove={onMove}
          onResize={onResize}
          onRotate={onRotate}
        />
      ))}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  canvas: {
    width:    CANVAS_W,
    height:   CANVAS_H,
    position: 'relative',
    overflow: 'hidden',
  },
  element: {
    position: 'absolute',
  },
  imagePlaceholder: {
    backgroundColor: Colors.bgInput,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textEl: {
    padding: 4,
  },
  selectionBorder: {
    position:     'absolute',
    top: 0, left: 0,
    borderWidth:  2,
    borderColor:  Colors.primary,
    borderRadius: 4,
    borderStyle:  'dashed',
  },
  resizeHandle: {
    position:        'absolute',
    bottom:          -12,
    right:           -12,
    width:           24,
    height:          24,
    borderRadius:    12,
    backgroundColor: Colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
});
