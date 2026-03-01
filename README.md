# Scout Blind Navigation System - Client

A React Native mobile application that provides real-time navigation assistance for visually impaired users using AI-powered object detection and voice guidance.

## 🌟 Features

- **Real-time Camera Navigation**: Live camera feed with AI-powered hazard detection
- **Voice Guidance**: Audio feedback for navigation and obstacle warnings
- **GPS Tracking**: Location-based navigation support
- **Two Navigation Modes**:
  - **Free Walk**: General navigation assistance
  - **Destination**: Turn-by-turn navigation to specific locations
- **Hazard Detection**: Real-time obstacle and danger warnings
- **Voice Interaction**: Hands-free operation with speech feedback

## 📱 Supported Platforms

- **Android** (Primary)
- **iOS** (Planned)
- **Expo Go** (Development)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Physical Android device or emulator

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/azadDsync/scout.git
   cd scout
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device**
   - **Android**: Press `a` in terminal or use Expo Go app
   - **iOS**: Press `i` in terminal (requires iOS simulator)

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
EXPO_PUBLIC_SCOUT_SERVER_URL=http://YOUR_SERVER_IP:8000

# API Keys
EXPO_PUBLIC_DEEPGRAM_API_KEY=your_deepgram_key
EXPO_PUBLIC_CARTESIA_API_KEY=your_cartesia_key
EXPO_PUBLIC_STREAM_API_KEY=your_stream_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
EXPO_PUBLIC_GOOGLE_API_KEY=your_gemini_key
```

### Getting API Keys

1. **Deepgram**: [Sign up](https://deepgram.com) → Dashboard → API Keys
2. **Cartesia**: [Sign up](https://cartesia.ai) → Dashboard → API Keys  
3. **Stream**: [Sign up](https://getstream.io) → Dashboard → API Keys
4. **Google Maps**: [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
5. **Google Gemini**: [AI Studio](https://aistudio.google.com) → Get API Key

## 🏗️ Project Structure

```
scout/
├── app/
│   ├── _layout.tsx          # Root navigation layout
│   ├── index.tsx            # Home screen with mode selection
│   ├── scout.tsx            # Main navigation screen (simple version)
│   └── camera.tsx           # Advanced camera with Stream SDK
├── components/              # Reusable UI components
├── hooks/                  # Custom React hooks
├── utils/                  # Utility functions
├── .env                   # Environment variables
├── app.json               # Expo configuration
├── package.json           # Dependencies and scripts
└── README_CLIENT.md       # This file
```

## 🎯 Usage

### Starting Navigation

1. **Open the app** → Home screen
2. **Choose navigation mode**:
   - **Free Walk**: For general navigation assistance
   - **Destination**: Enter destination for guided navigation
3. **Grant permissions**:
   - Camera access (required for object detection)
   - Location access (required for GPS tracking)
4. **Tap "Start Free Walk"** or "Start Navigation"
5. **Follow voice guidance** and camera-based alerts

### Navigation Interface

- **Camera View**: Live camera feed showing your path
- **Voice Guidance**: Audio instructions and warnings
- **Status Display**: Current mode and destination
- **End Session**: Stop navigation and return to home

### Voice Commands

The app provides hands-free operation with:
- **Navigation Instructions**: "Walk straight", "Turn left", etc.
- **Hazard Warnings**: "STOP! Car right 2m", "Person ahead"
- **Status Updates**: "Path is clear", "Safe to proceed"

## 🔧 Development

### Available Scripts

```bash
npm start          # Start Expo development server
npm run android    # Run on Android device/emulator
npm run ios        # Run on iOS simulator
npm run web        # Run in web browser (limited functionality)
```

### Building for Production

```bash
# Android APK
npx expo build:android

# iOS IPA (requires Apple Developer account)
npx expo build:ios
```

## 🐛 Troubleshooting

### Common Issues

**Camera not working:**
- Ensure camera permissions are granted
- Check if camera is being used by another app
- Restart the app

**No voice guidance:**
- Check device volume is not muted
- Ensure speech permissions are granted
- Verify API keys are correct

**GPS not working:**
- Enable location services on device
- Grant location permissions to the app
- For emulator: GPS errors are expected

**Server connection issues:**
- Verify server is running on correct IP
- Check network connectivity
- Ensure firewall allows connection

### Expo Go Limitations

Some features may not work in Expo Go:
- WebRTC video streaming (requires development build)
- Advanced camera features
- Background location tracking

For full functionality, create a development build:

```bash
npx expo install expo-dev-client
npx expo run:android
```

## 🤝 Contributing

1. **Fork the repository**
   ```bash
   # Fork https://github.com/azadDsync/scout.git
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/azadDsync/scout.git
   cd scout
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature-name
   ```

4. **Make changes and test thoroughly**

5. **Commit changes**
   ```bash
   git commit -m "Add feature"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature-name
   ```

7. **Submit a pull request** to the main repository

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Expo** - React Native development platform
- **Vision Agents** - AI vision processing framework
- **Deepgram** - Speech-to-text services
- **Cartesia** - Text-to-speech services
- **Stream** - Real-time video streaming
- **Google Maps** - Mapping and navigation services

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review the API documentation for each service

## 🔗 Repository Links

- **Client Repository**: https://github.com/azadDsync/scout
- **Server Repository**: https://github.com/azadDsync/scout-server

---

**Scout: Empowering independent navigation for visually impaired** 🧭
