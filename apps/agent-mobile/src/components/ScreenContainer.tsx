// ============================================================
// VoteCapsule™ — ScreenContainer
// Full-screen safe-area-aware scroll container.
// Replaces the raw ScrollView + paddingTop: 56 hack used
// in most screens (which was compensating for the missing
// SafeAreaView).
// ============================================================
import React from 'react';
import {
  ScrollView, View, StyleSheet, ViewStyle,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Pad content horizontally (default: 24) */
  padding?: number;
  /** Scroll (default: true). Set false for FlatList screens. */
  scroll?: boolean;
  /** Extra style override for the inner content view */
  contentStyle?: ViewStyle;
  /** Avoid keyboard (default: false) */
  avoidKeyboard?: boolean;
}

export function ScreenContainer({
  children,
  padding = 24,
  scroll = true,
  contentStyle,
  avoidKeyboard = false,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  const content = (
    <View
      style={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, paddingHorizontal: padding },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  if (!scroll) {
    return (
      <View style={styles.container}>
        {avoidKeyboard ? (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {content}
          </KeyboardAvoidingView>
        ) : (
          content
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled={avoidKeyboard}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: padding,
          },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
  flex:      { flex: 1 },
  content:   { flex: 1 },
});
