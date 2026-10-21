import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from './ui';

// Keep review actions reachable above the keyboard and in short iPad windows.
export function ReviewSheet({ visible, onClose, children, maxWidth = 780 }: {
  visible: boolean; onClose: () => void; children: React.ReactNode; maxWidth?: number;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'portrait-upside-down', 'landscape-left', 'landscape-right']}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#18131F99', paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' }}>
        <Card accessibilityViewIsModal style={{ width: '100%', maxWidth, maxHeight: Math.max(100, height - Math.max(insets.top, 16) - Math.max(insets.bottom, 16)), flexShrink: 1 }}>
          <ScrollView pinchGestureEnabled={false} maximumZoomScale={1} minimumZoomScale={1} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, gap: 18 }}>{children}</ScrollView>
        </Card>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
