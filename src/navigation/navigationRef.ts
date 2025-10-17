import { createNavigationContainerRef } from '@react-navigation/native';

// Use loose typing here to avoid circular type deps
export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: any, params?: any) {
  if (navigationRef.isReady()) {
    // @ts-ignore
    navigationRef.navigate(name as never, params as never);
  }
}
