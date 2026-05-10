import * as React from "react";
import { TextInput, TextInputProps, View, Platform } from "react-native";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

export interface InputProps extends TextInputProps {
  className?: string;
  autofillColor?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, placeholderTextColor, style, onChangeText, autofillColor, ...props }, ref) => {
    const { isDark } = useTheme();
    const autofillBg = autofillColor ?? (isDark ? "#1e293b" : "#f9fafb");
    const [bgKey, setBgKey] = React.useState(0);
    const prevLenRef = React.useRef(0);

    // Sync prevLenRef with the controlled value on every render so delta
    // detection is correct from the very first keystroke. Without this,
    // a pre-populated field (e.g. "12345") has prevLenRef=0, so the first
    // backspace produces delta=4 and falsely triggers a remount → keyboard dismiss.
    prevLenRef.current = (props.value ?? "").length;

    const handleChangeText = React.useCallback(
      (text: string) => {
        // Only remount (to clear Samsung Pass yellow tint) when autofill is
        // detected — i.e. text jumped by more than 1 char at once.
        if (Platform.OS === "android") {
          const delta = Math.abs(text.length - prevLenRef.current);
          if (delta > 1) setBgKey((k) => k + 1);
        }
        onChangeText?.(text);
      },
      [onChangeText]
    );

    return (
      <View style={{ borderRadius: 6, overflow: "hidden", backgroundColor: autofillBg }}>
        <TextInput
          key={bgKey}
          ref={ref}
          className={cn(
            "h-10 w-full rounded-md border border-input px-3 py-2 text-sm text-foreground",
            "placeholder:text-muted-foreground",
            props.editable === false && "opacity-50",
            className
          )}
          style={[{ backgroundColor: autofillBg }, style]}
          placeholderTextColor={placeholderTextColor ?? "#9ca3af"}
          onChangeText={handleChangeText}
          {...props}
        />
      </View>
    );
  }
);

Input.displayName = "Input";
