// ============================================================
// VoteCapsule -- Validator Login Screen
// apps/validator-mobile/src/screens/LoginScreen.tsx
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Email and password are required.');
      return;
    }
    clearError();
    await login(email.trim(), password);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Branding */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>V</Text>
          </View>
          <Text style={styles.logo}>VoteCapsule</Text>
          <Text style={styles.tagline}>Validator Portal</Text>
          <Text style={styles.subtitle}>Integrity Verified</Text>
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
            placeholder="validator@iebc.or.ke"
            placeholderTextColor="#9ca3af"
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
            placeholder="Enter your password"
            placeholderTextColor="#9ca3af"
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
          Authorised validators only. All decisions are permanently recorded.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B3C6D' },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 32 },
  header: { alignItems: 'center', marginBottom: 48 },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0B3C6D',
  },
  logo: { fontSize: 28, fontWeight: '700', color: '#ffffff', letterSpacing: 0.5 },
  tagline: { fontSize: 16, color: '#93c5fd', marginTop: 4, fontWeight: '500' },
  subtitle: { fontSize: 12, color: '#60a5fa', marginTop: 8, letterSpacing: 2, textTransform: 'uppercase' },
  errorBanner: { backgroundColor: '#7f1d1d', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { color: '#fca5a5', fontSize: 13 },
  form: { gap: 4 },
  label: { color: '#bfdbfe', fontSize: 13, marginBottom: 4, fontWeight: '500' },
  input: {
    backgroundColor: '#1e3a5f',
    borderRadius: 10,
    color: '#f8fafc',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2563eb33',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { color: '#60a5fa', fontSize: 11, textAlign: 'center', marginTop: 40, opacity: 0.7 },
});
