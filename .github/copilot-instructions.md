# StreamsOfJoy Management App - AI Coding Instructions

## Project Overview
A React Native/Expo church management app with role-based access (SuperAdmin, UnitLeader, Member, MinistryAdmin). Users can switch between multiple roles they possess within different units/ministries.

## Architecture & Key Patterns

### Role-Based Navigation & State
- **Active Role System**: Users have `user.activeRole` and can switch between roles via `RoleSwitchModal`
- **Role Resolution**: Find user's unit via `(user?.roles || []).find(r => r.role === user.activeRole && r.unit)?.unit`
- **Navigation Structure**: `src/screens/` organized by role: `AuthScreens/`, `main/{SuperAdmin,UnitLeader,UnitMember,Common}/`
- **Gate Components**: `AppBootstrapGate` → `InitialLoaderGate` → main app (layered loading with minimum duration)

### API & State Management
- **Dynamic Base URL**: `src/api/users.ts` implements robust API endpoint discovery with fallbacks (hosted → local dev → Android emulator)
- **React Query**: Primary state management with `@tanstack/react-query` and dev tools via `@dev-plugins/react-query`
- **Context Pattern**: `SoulsStoreProvider` wraps React Query hooks for souls data (personal vs unit scope)
- **Socket.io**: Real-time messaging with user registration and presence tracking in `App.tsx`

### Styling & UI
- **NativeWind**: Tailwind CSS for React Native (config in `tailwind.config.js`)
- **Module Resolution**: Babel aliases: `@components`, `@theme`, `@sales`, `@screens`, `@utils`
- **Navigation Theme**: Custom theme in `Navigation.tsx` with StatusBar management per route
- **Role-Specific Styling**: Import patterns like `PRIMARY_BLUE` from `@screens/AuthScreens/SuperAdmin/styles`

## Development Workflows

### Starting Development
```bash
pnpm start          # Expo dev server
pnpm android        # Android-specific
pnpm ios           # iOS-specific
```

### Key File Patterns
- **Screen Structure**: Each screen has role-specific directory with shared components
- **API Services**: Individual files per domain in `src/api/` (users.ts, souls.ts, events.ts, etc.)
- **Type Safety**: Custom types in `src/@types/` for external packages missing types

### Component Patterns
- **Modal Screens**: Use `presentation: 'modal'` in navigation stack
- **Loading States**: Implement `useMinimumLoader` hook for UX consistency  
- **Error Handling**: API calls include retry logic and graceful fallbacks
- **Toast Messages**: Global toast system via `react-native-toast-message` with custom config

## Critical Implementation Details

### User & Role Management
- Users stored in AsyncStorage as `'user'` key with roles array
- Each role has `{role: string, unit?: ObjectId, ministry?: ObjectId}`
- Role switching updates `activeRole` and persists `activeUnitId` in separate storage

### API Integration Specifics
- All API calls must handle base URL discovery pattern from `users.ts`
- Token stored as `'token'` in AsyncStorage (check for `'auth_token'` fallback)
- Include `Authorization: Bearer ${token}` headers
- Implement timeout handling (12-13 second timeouts standard)

### Navigation & Deep Linking
- Central navigation ref in `navigationRef.ts` for programmatic navigation
- Comprehensive `RootStackParamList` type in `Navigation.tsx`
- Screen params pattern: `{ id: string }` for detail screens, `{ scope?: 'mine'|'unit' }` for data scope

### Data Scope Patterns
- Many features support dual scope: personal (`scope: 'mine'`) vs unit-wide (`scope: 'unit'`)
- Unit ID resolution: prefer `activeRole` match, fallback to first UnitLeader role
- Permission checks based on `user.activeRole` value, not just role array membership

When implementing new features, follow the established role-based screen organization, use the API base URL discovery pattern, and implement proper loading states with minimum duration for better UX.