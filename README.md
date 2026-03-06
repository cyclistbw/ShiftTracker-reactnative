# Shift Tracker — React Native (Expo)

Expo SDK 55 · React Native · NativeWind v4 · Supabase

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 or 20 LTS |
| npm | 10+ |
| Expo CLI | `npm install -g expo-cli` |
| EAS CLI | `npm install -g eas-cli` |
| Xcode | 15+ (macOS, iOS builds) |
| Android Studio | Hedgehog or later |

---

## Local Development

```bash
# Install dependencies
npm install

# Start Metro bundler
npx expo start

# Open on device/simulator
# Press i → iOS simulator
# Press a → Android emulator
# Scan QR code with Expo Go app
```

---

## One-Time EAS Setup

```bash
# Log in to your Expo account
eas login

# Link this project to EAS (creates/updates extra.eas.projectId in app.json)
eas init

# Configure credentials for iOS and Android
eas credentials
```

After `eas init`, replace `"YOUR_EAS_PROJECT_ID"` in `app.json` → `extra.eas.projectId` with the generated ID,
and set `"owner"` to your Expo account username.

---

## Build Profiles

### Development build (with dev client — use instead of Expo Go for native modules)

```bash
# iOS simulator
eas build --profile development --platform ios

# Android APK
eas build --profile development --platform android

# Both platforms
eas build --profile development --platform all
```

Install the resulting `.app` / `.apk` on your simulator/device, then run:

```bash
npx expo start --dev-client
```

### Preview build (internal testing — TestFlight / direct APK install)

```bash
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

Share the build URL with testers. iOS preview builds are distributed via TestFlight ad-hoc.

### Production build (App Store / Play Store)

```bash
# Build
eas build --profile production --platform ios
eas build --profile production --platform android

# Submit automatically after build
eas build --profile production --platform ios --auto-submit
eas build --profile production --platform android --auto-submit
```

`autoIncrement: true` in `eas.json` automatically bumps `buildNumber` (iOS) and `versionCode` (Android) on each production build.

---

## Submitting to Stores

### App Store (iOS)

1. Fill in `submit.production.ios` in `eas.json`:
   - `appleId` — your Apple ID email
   - `ascAppId` — the numeric App ID from App Store Connect
   - `appleTeamId` — your 10-character team ID
2. Run:
   ```bash
   eas submit --platform ios --latest
   ```

### Google Play (Android)

1. Create a service account in Google Play Console → Setup → API access.
2. Download the JSON key and save as `google-play-service-account.json` in the project root.
   **Add this file to `.gitignore` — never commit credentials.**
3. Grant the service account "Release Manager" permissions in Play Console.
4. Run:
   ```bash
   eas submit --platform android --latest
   ```
   The `track: "internal"` setting submits to the Internal Testing track.
   Change to `"production"` when ready for public release.

---

## Bumping the App Version

Edit `app.json`:

```json
"version": "1.1.0"
```

For production builds, `autoIncrement: true` in `eas.json` handles `buildNumber` / `versionCode` automatically.
For manual control, update them directly:

```json
"ios": { "buildNumber": "5" }
"android": { "versionCode": 5 }
```

---

## Environment Variables / Secrets

Supabase credentials are currently baked in via `src/integrations/supabase/client.ts`.
For production:

1. Move them to EAS secrets:
   ```bash
   eas secret:create --scope project --name SUPABASE_URL --value "https://..."
   eas secret:create --scope project --name SUPABASE_ANON_KEY --value "eyJ..."
   ```
2. Reference via `process.env.SUPABASE_URL` in the client file.

---

## Asset Requirements

| File | Size | Notes |
|------|------|-------|
| `assets/icon.png` | 1024×1024 | iOS icon, App Store listing — no transparency |
| `assets/splash-icon.png` | 1024×1024 | Centered on `backgroundColor` |
| `assets/android-icon-foreground.png` | 512×512 | Adaptive icon foreground — keep safe zone to 66% (340×340 px) |
| `assets/android-icon-background.png` | 512×512 | Adaptive icon background |
| `assets/android-icon-monochrome.png` | 432×432 | Android 13+ themed icon |
| `assets/favicon.png` | 48×48 | Web (not used in native builds) |

All required files are present and correctly sized. To update them, replace the PNG files and rebuild.

---

## Permissions Summary

### iOS (`infoPlist` in app.json)

| Key | Usage |
|-----|-------|
| `NSLocationWhenInUseUsageDescription` | Mileage tracking during active shifts |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | Background mileage tracking |
| `NSCameraUsageDescription` | Receipt photo capture |
| `NSPhotoLibraryUsageDescription` | Receipt photo library access |
| `NSUserNotificationUsageDescription` | Quarterly tax due-date reminders |
| `UIBackgroundModes: location, fetch, remote-notification` | Background location + push |

### Android (`permissions` in app.json)

`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`,
`CAMERA`, `READ_MEDIA_IMAGES`, `RECEIVE_BOOT_COMPLETED`, `VIBRATE`,
`POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`

---

## Useful Commands

```bash
# Check Expo Doctor for config issues
npx expo-doctor

# List all scheduled EAS builds
eas build:list

# View build logs
eas build:view

# Clear Metro cache
npx expo start --clear

# Run TypeScript type-check
npx tsc --noEmit
```
