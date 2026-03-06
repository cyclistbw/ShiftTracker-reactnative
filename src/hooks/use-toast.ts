// 🚩 FLAG: Web version imports from @/components/ui/toast (shadcn/Radix UI system).
// RN replacement: wraps react-native-toast-message to match the same call signature.

import Toast from "react-native-toast-message";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

function toast(options: ToastOptions) {
  const { title, description, variant, duration } = options;
  const type = variant === "destructive" ? "error" : "success";

  Toast.show({
    type,
    text1: title,
    text2: description,
    visibilityTime: duration ?? 3000,
  });
}

// Match the shadcn { toast } = useToast() destructuring pattern
export function useToast() {
  return { toast };
}

export { toast };
