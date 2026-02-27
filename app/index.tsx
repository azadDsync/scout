import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

type ScoutMode = "DESTINATION" | "FREE_WALK";

function readEnv() {
  return {
    GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    GEMINI_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_API_KEY,
    DEEPGRAM_API_KEY: process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY,
    CARTESIA_API_KEY: process.env.EXPO_PUBLIC_CARTESIA_API_KEY,
    STREAM_API_KEY: process.env.EXPO_PUBLIC_STREAM_API_KEY,
    SCOUT_SERVER_URL: process.env.EXPO_PUBLIC_SCOUT_SERVER_URL,
  };
}

function normalizeBaseUrl(url: string | undefined) {
  if (!url) return undefined;
  let u = url.replace(/\/+$/, '');
  if (Platform.OS === 'android') {
    if (u.startsWith('http://localhost')) {
      u = u.replace('http://localhost', 'http://10.0.2.2');
    } else if (u.startsWith('http://127.0.0.1')) {
      u = u.replace('http://127.0.0.1', 'http://10.0.2.2');
    }
  }
  return u;
}

export default function ScoutHomeScreen() {
  const env = readEnv();
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [loading, setLoading] = useState(false);

  const speak = (text: string) => {
    Speech.speak(text, {
      language: 'en-US',
      rate: 1.0,
    });
  };

  const ensureLocationPermission = async () => {
    setRequestingPermission(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        speak('Location permission denied. Scout needs GPS to assist you.');
        return false;
      }
      return true;
    } finally {
      setRequestingPermission(false);
    }
  };

  const startSession = async (mode: ScoutMode, destinationText?: string) => {
    console.log('Starting session:', { mode, destinationText });
    
    const baseUrl = normalizeBaseUrl(env.SCOUT_SERVER_URL);
    console.log('Server URL:', baseUrl);
    
    if (!baseUrl) {
      console.log('Missing server URL');
      speak('Missing Scout server URL. Please check configuration.');
      return;
    }
    if (!env.STREAM_API_KEY) {
      console.log('Missing Stream API key');
      speak('Missing Stream configuration. Please check app settings.');
      return;
    }

    const userId = `mobile-${Date.now()}`;
    const callId = `scout-${userId}`;
    console.log('Generated IDs:', { userId, callId });

    setLoading(true);
    try {
      console.log('Making request to:', `${baseUrl}/sessions/start`);
      
      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const requestBody = {
        user_id: userId,
        mode,
        destination_text: destinationText || "",  // Use empty string instead of null
        call_type: 'default',
        call_id: callId,
      };
      
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      const res = await fetch(`${baseUrl}/sessions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);

      if (!res.ok) {
        const errorText = await res.text();
        console.log('Session start failed');
        console.log('Error response:', errorText);
        console.log('Status code:', res.status);
        speak('Unable to start Scout session. Please try again.');
        return;
      }

      console.log('Navigating to scout screen');
      console.log('Navigating to pathname: /scout');
      
      // Force navigation with timeout
      setTimeout(() => {
        router.replace('/scout');
      }, 100);
      
      console.log('Navigation command sent');
    } catch (error) {
      console.error('Failed to start Scout session', error);
      
      // Better error handling
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          speak('Server connection timed out. Please check your network.');
        } else if (error.message.includes('Network request failed')) {
          speak('Cannot reach Scout server. Please ensure server is running.');
        } else {
          speak('Network error. Please check your connection and try again.');
        }
      } else {
        speak('Unable to reach Scout server. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartMode = async (mode: ScoutMode) => {
    const hasPermission = await ensureLocationPermission();
    if (!hasPermission) return;

    const destTrimmed = destination.trim();
    if (mode === 'DESTINATION' && !destTrimmed) {
      speak('Please provide a destination or switch to free walk mode.');
      return;
    }

    if (mode === 'DESTINATION') {
      speak(`Starting destination mode towards ${destTrimmed}.`);
    } else {
      speak('Starting free walk mode. I will describe your surroundings.');
    }

    await startSession(mode, destTrimmed || undefined);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scout</Text>
      <Text style={styles.subtitle}>
        Assistive navigation for blind and low-vision users.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Destination mode</Text>
        <TextInput
          style={styles.input}
          placeholder="Where do you want to go?"
          placeholderTextColor="#777"
          value={destination}
          onChangeText={setDestination}
        />
        <Pressable
          onPress={() => handleStartMode('DESTINATION')}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Starting...' : 'Start Destination Mode'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Free walk mode</Text>
        <Pressable
          onPress={() => handleStartMode('FREE_WALK')}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Starting...' : 'Start Free Walk'}
          </Text>
        </Pressable>
      </View>

      {requestingPermission && (
        <Text style={styles.statusText}>Requesting location permission…</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#16a34a',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    marginTop: 16,
    color: '#aaa',
    fontSize: 14,
  },
});
