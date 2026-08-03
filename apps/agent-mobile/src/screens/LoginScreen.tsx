// ============================================================
// VoteCapsule™ — Login Screen
// apps/agent-mobile/src/screens/LoginScreen.tsx
//
// Fix: Navigation is now driven by the auth store state via
// AppNavigator's conditional stack — we do NOT call
// navigation.replace('Home') manually. Instead, once
// isAuthenticated flips to true the navigator re-renders
// and mounts Home automatically. This is the correct Zustand
// + React Navigation pattern.
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { ErrorBanner } from '../components/ErrorBanner';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [pwVisible, setPwVisible] = useState(false);

  const { login, isLoading, error, clearError } = useAuthStore();
  const insets = useSafeAreaInsets();

  // Clear stale errors when the user starts editing
  useEffect(() => {
    if (error) clearError();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  const handleLogin = async () => {
    if (!email.trim()) return;
    if (!password)     return;
    await login(email.trim().toLowerCase(), password);
    // Navigation is handled automatically by AppNavigator
    // when isAuthenticated becomes true — no manual navigate() needed.
  };

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.inner,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand header ───────────────────────────────── */}
        <View style={styles.header}>
          {/* Shield icon rendered with nested views */}
          <View style={styles.logoMark}>
            <View style={styles.logoShield}>
              <Text style={styles.logoCheck}>✓</Text>
            </View>
          </View>
          <Text style={styles.logoText}>VoteCapsule™</Text>
          <Text style={styles.tagline}>Field Agent Portal</Text>
          <Text style={styles.election}>Kenya General Election 2027</Text>
        </View>

        {/* ── Error banner ───────────────────────────────── */}
        {error ? (
          <ErrorBanner message={error} onDismiss={clearError} />
        ) : null}

        {/* ── Form ───────────────────────────────────────── */}
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="agent@iebc.or.ke"
            placeholderTextColor="#475569"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="next"
            editable={!isLoading}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#475569"
              secureTextEntry={!pwVisible}
              autoComplete="current-password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setPwVisible((v) => !v)}
              accessibilityLabel={pwVisible ? 'Hide password' : 'Show password'}
            >
              <Text style={styles.eyeIcon}>{pwVisible ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Footer ─────────────────────────────────────── */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerText}>
            Authorised field agents only.{'\n'}
            All evidence submissions are cryptographically sealed with SHA-256.
          </Text>
          <View style={styles.footerDivider} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#0a1628' },
  inner:        { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32 },

  // Brand
  header:       { alignItems: 'center', marginBottom: 40 },
  logoMark:     { marginBottom: 16 },
  logoShield: {
    width: 72,
    height: 80,
    backgroundColor: '#1e3a5f',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  logoCheck:    { fontSize: 32, color: '#22d3ee' },
  logoText:     { fontSize: 28, fontWeight: '700', color: '#3b82f6', letterSpacing: 1 },
  tagline:      { fontSize: 14, color: '#94a3b8', marginTop: 6 },
  election:     { fontSize: 12, color: '#475569', marginTop: 4 },

  // Form
  form:         { gap: 0 },
  label:        { color: '#cbd5e1', fontSize: 13, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    flex: 1,
  },
  passwordRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  passwordInput:{ marginBottom: 0, flex: 1 },
  eyeBtn:       { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 4 },
  eyeIcon:      { fontSize: 18 },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: '#1e3a5f', opacity: 0.7 },
  buttonText:   { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Footer
  footer:       { marginTop: 40, alignItems: 'center', gap: 12 },
  footerDivider:{ height: 1, width: '80%', backgroundColor: '#1e293b' },
  footerText:   { color: '#334155', fontSize: 11, textAlign: 'center', lineHeight: 17 },
});
