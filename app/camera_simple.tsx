import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, Camera } from 'expo-camera';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';

type ScoutMode = "DESTINATION" | "FREE_WALK";
type LocationPoint = { latitude: number; longitude: number };

const GPS_POLL_INTERVAL_MS = 2000;

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

export default function SimpleCameraScreen() {
  const env = readEnv();
  const router = useRouter();
  const params = useLocalSearchParams<{
    callId: string;
    userId: string;
    mode: ScoutMode;
    destinationText?: string;
  }>();

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [initializing, setInitializing] = useState(true);
  const cameraRef = useRef<any>(null);
  const gpsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [detectionMessage, setDetectionMessage] = useState("");

  const session = {
    callId: params.callId,
    userId: params.userId,
    mode: params.mode,
    destinationText: params.destinationText || '',
  };

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    const startGps = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const baseUrl = normalizeBaseUrl(env.SCOUT_SERVER_URL);
      const sendLocation = async (coords: LocationPoint) => {
        if (!baseUrl) return;
        try {
          await fetch(`${baseUrl}/location/update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              call_id: session.callId,
              mode: session.mode,
              latitude: coords.latitude,
              longitude: coords.longitude,
            }),
          });
        } catch (error) {
          console.error('Failed to send location update', error);
        }
      };

      const initial = await Location.getCurrentPositionAsync({});
      await sendLocation({
        latitude: initial.coords.latitude,
        longitude: initial.coords.longitude,
      });

      gpsTimerRef.current = setInterval(async () => {
        try {
          const pos = await Location.getCurrentPositionAsync({});
          await sendLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        } catch (error) {
          console.error('GPS polling error', error);
        }
      }, GPS_POLL_INTERVAL_MS);
    };

    startGps();

    return () => {
      if (gpsTimerRef.current) {
        clearInterval(gpsTimerRef.current);
      }
    };
  }, [env.SCOUT_SERVER_URL, session.callId, session.mode]);

  useEffect(() => {
    // Simple mock hazard detection
    const detectionInterval = setInterval(() => {
      const messages = [
        "Walk straight. Clear ahead.",
        "Careful: Watch your step.",
        "Path is clear. Continue.",
        "Stay on the current path.",
        "No obstacles detected.",
      ];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      setDetectionMessage(randomMessage);
      
      // Speak the message
      Speech.speak(randomMessage, {
        language: 'en-US',
        rate: 1.0,
      });
    }, 5000); // Every 5 seconds

    return () => clearInterval(detectionInterval);
  }, []);

  const handleEnd = () => {
    Speech.speak('Ending Scout session.', { rate: 1.0 });
    router.back();
  };

  if (hasCameraPermission === null || initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Connecting Scout agent…</Text>
      </View>
    );
  }

  if (hasCameraPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>
          Camera permission is required for Scout to see.
        </Text>
        <Pressable
          onPress={handleEnd}
          style={({ pressed }) => [
            styles.endButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={'back'}
        ratio="16:9"
      />
      <View style={styles.overlay}>
        <Text style={styles.modeText}>
          {session.mode === 'DESTINATION' ? 'Destination mode' : 'Free walk mode'}
        </Text>
        {session.destinationText ? (
          <Text style={styles.destinationText} numberOfLines={1}>
            To: {session.destinationText}
          </Text>
        ) : null}
        <Text style={styles.detectionText}>{detectionMessage}</Text>
        <Pressable
          onPress={handleEnd}
          style={({ pressed }) => [
            styles.endButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>End Session</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    padding: 16,
  },
  modeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  destinationText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
  detectionText: {
    color: '#4ade80',
    fontSize: 14,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  endButton: {
    backgroundColor: '#dc2626',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
});
