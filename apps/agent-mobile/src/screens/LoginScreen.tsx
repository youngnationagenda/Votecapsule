// ============================================================
// VoteCapsule™ — Login Screen
// apps/agent-mobile/src/screens/LoginScreen.tsx
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Email and password are required.');
      return;
    }
    clearError();
    await login(email.trim(), password);
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      navigation.replace('Home');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Logo / Brand */}
        <View style={styles.header}>
          <Text style={styles.logo}>VoteCapsule™</Text>
          <Text style={styles.tagline}>Field Agent Portal</Text>
        </View>

        {/* Error banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="agent@iebc.or.ke"
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#888"
            secureTextEntry
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Authorised users only. All submissions are cryptographically sealed.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0a1628' },
  inner:      { flexGrow: 1, justifyContent: 'center', padding: 32 },
  header:     { alignItems: 'center', marginBottom: 40 },
  logo:       { fontSize: 28, fontWeight: '700', color: '#3b82f6', letterSpacing: 1 },
  tagline:    { fontSize: 14, color: '#94a3b8', marginTop: 6 },
  errorBanner:{ backgroundColor: '#7f1d1d', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText:  { color: '#fca5a5', fontSize: 13 },
  form:       { gap: 8 },
  label:      { color: '#cbd5e1', fontSize: 13, marginBottom: 4 },
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
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer:   { color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 40 },
});
