# SyncUp

A social calendar mobile app for iOS and Android. SyncUp makes it easy to create events, coordinate with friends and groups, and keep everyone on the same page.

## Tech Stack

**Mobile**
- React Native 0.83.6 via Expo ~55.0.20
- TypeScript 5.9.2 (strict)
- React Navigation v7 (native-stack + bottom-tabs)
- TanStack React Query v5
- react-native-reanimated 4.2.1
- Clerk for authentication

**API**
- Fastify
- Prisma ORM

## Project Structure

```
SyncUp/
├── social-calendar-mobile/   # Expo mobile app
│   ├── App.tsx               # Root entry; wraps QueryClientProvider
│   └── src/
│       ├── api/              # React Query hooks + query keys
│       ├── theme/            # Design tokens (colors, typography, spacing, motion, haptics)
│       ├── mocks/            # Seed data for dev
│       ├── navigation/       # RootNavigator, tab stacks, types
│       ├── components/       # Shared UI components
│       └── screens/          # App screens
└── social-calendar-api/      # Fastify backend
```

## Getting Started

### Prerequisites

- Node.js 20+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator or Android Emulator (or the Expo Go app)

### Mobile

```bash
cd social-calendar-mobile
npm install
npm start
```

Then press `i` for iOS or `a` for Android.

### API

```bash
cd social-calendar-api
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` in each package and fill in the required values.

**Mobile (`social-calendar-mobile/.env`)**
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
EXPO_PUBLIC_API_URL=
```

**API (`social-calendar-api/.env`)**
```
DATABASE_URL=
CLERK_SECRET_KEY=
```

## State Management

- Data from the API lives in **React Query** — no exceptions.
- Data that never touches the network lives in **local component state**.
- There is no global client-side store.

## Contributing

This project is under active development. See `FRONTEND-HANDOFF.txt` for the current build priority queue and open gaps.
