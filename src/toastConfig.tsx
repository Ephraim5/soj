// ToastConfig.tsx
import React from "react";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import { Colors } from "@theme/colors";

export const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ 
        borderLeftColor: Colors.primary, 
        backgroundColor: Colors.background,
        borderRadius: 12,
        paddingVertical: 8
      }}
      contentContainerStyle={{ paddingHorizontal: 12 }}
      text1Style={{
        fontSize: 16,
        fontWeight: "600",
        color: Colors.primary
      }}
      text2Style={{
        fontSize: 14,
        color: Colors.muted
      }}
    />
  ),

  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ 
        borderLeftColor: Colors.danger, 
        backgroundColor: Colors.background,
        borderRadius: 12 
      }}
      contentContainerStyle={{ paddingHorizontal: 12 }}
      text1Style={{
        fontSize: 16,
        fontWeight: "600",
        color: Colors.danger
      }}
      text2Style={{
        fontSize: 14,
        color: Colors.muted
      }}
    />
  )
};

export default Toast;

// ---------------------------------------------------------------------------
// Global Toast Helpers (Default 5000ms visibility)
// ---------------------------------------------------------------------------
// Instead of sprinkling visibilityTime everywhere, use these helpers.
// They default to 5000ms unless you override via the optional param.

type ToastType = 'success' | 'error' | 'info';

interface ShowToastOptions {
  type: ToastType;
  text1: string;
  text2?: string;
  visibilityTime?: number; // override default 2000ms
  position?: 'top' | 'bottom';
  props?: any; // extra props if needed by custom renderer
}

const DEFAULT_VISIBILITY = 5000; // 5 seconds

export function showToast(options: ShowToastOptions) {
  Toast.show({
    position: 'top',
    ...options,
    visibilityTime: options.visibilityTime ?? DEFAULT_VISIBILITY,
  });
}

export function showSuccess(text1: string, text2?: string, visibilityTime?: number) {
  showToast({ type: 'success', text1, text2, visibilityTime });
}

export function showError(text1: string, text2?: string, visibilityTime?: number) {
  showToast({ type: 'error', text1, text2, visibilityTime });
}

export function showInfo(text1: string, text2?: string, visibilityTime?: number) {
  showToast({ type: 'info', text1, text2, visibilityTime });
}

// Optional: If you want to enforce the 2000ms default globally even when
// calling Toast.show directly, call initGlobalToastDefaults() once in App.tsx
// BEFORE any toasts are triggered.
export function initGlobalToastDefaults() {
  const originalShow = Toast.show;
  // @ts-ignore - augmenting for convenience
  Toast.show = (options: any) => {
    originalShow({ visibilityTime: DEFAULT_VISIBILITY, position: 'top', ...options });
  };
}
