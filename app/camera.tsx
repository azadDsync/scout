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

export default function CameraScreen() {
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
  const [streamClient, setStreamClient] = useState<any>(null);
  const [streamCall, setStreamCall] = useState<any>(null);
  const [StreamVideoComponent, setStreamVideoComponent] = useState<any>(null);
  const cameraRef = useRef<any>(null);
  const gpsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    const baseUrl = normalizeBaseUrl(env.SCOUT_SERVER_URL);
    if (!env.STREAM_API_KEY || !baseUrl) {
      setInitializing(false);
      return;
    }

    let isCancelled = false;
    let clientRef: any = null;
    let callRef: any = null;

    const setupStream = async () => {
      try {
        const { StreamVideoClient, StreamVideo } = await import(
          '@stream-io/video-react-native-sdk'
        );
        setStreamVideoComponent(() => StreamVideo);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const tokenRes = await fetch(
          `${baseUrl}/stream/token?user_id=${encodeURIComponent(session.userId)}`,
          { signal: controller.signal },
        );
        clearTimeout(timer);
        if (!tokenRes.ok) {
          throw new Error(await tokenRes.text());
        }
        const { token } = (await tokenRes.json()) as { token: string };

        if (isCancelled) return;

        const streamClientInstance = new StreamVideoClient({
          apiKey: env.STREAM_API_KEY!,
          user: { id: session.userId },
          token,
        });

        const streamCallInstance = streamClientInstance.call('default', session.callId);
        await streamCallInstance.join({ create: true });

        // Try to start local media (may fail in Expo Go)
        try {
          const c: any = streamCallInstance as any;
          if (c?.camera?.start) await c.camera.start();
          if (c?.microphone?.start) await c.microphone.start();
        } catch (e) {
          console.warn('Failed to start local media on call:', e);
        }

        if (isCancelled) {
          await streamCallInstance.leave();
          await streamClientInstance.disconnect();
          return;
        }

        clientRef = streamClientInstance;
        callRef = streamCallInstance;
        setStreamClient(streamClientInstance);
        setStreamCall(streamCallInstance);
      } catch (error) {
        console.warn('Stream SDK unavailable:', error);
        Speech.speak(
          'Scout is using camera and location. For voice agent, use a development build.',
          { rate: 0.9 },
        );
      } finally {
        if (!isCancelled) {
          setInitializing(false);
        }
      }
    };

    setupStream();

    return () => {
      isCancelled = true;
      (async () => {
        if (callRef) {
          const c: any = callRef as any;
          try {
            if (c?.camera?.stop) await c.camera.stop();
            if (c?.microphone?.stop) await c.microphone.stop();
          } catch (e) {
            // ignore
          }
        }
        if (callRef && typeof callRef.leave === 'function') {
          await callRef.leave();
        }
        if (clientRef && typeof (clientRef as any).disconnect === 'function') {
          await (clientRef as any).disconnect();
        }
      })();
    };
  }, [env.SCOUT_SERVER_URL, env.STREAM_API_KEY, session.callId, session.userId]);

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
      {StreamVideoComponent && streamClient && streamCall && (
        <StreamVideoComponent client={streamClient} />
      )}
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
    marginBottom: 12,
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

