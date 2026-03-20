import * as React from "react";
import { TextInput, TextInputProps, View, Platform } from "react-native";
import { cn } from "@/lib/utils";

export interface InputProps extends TextInputProps {
  className?: string;
}

const AUTOFILL_BG = "#f7fee7";

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, placeholderTextColor, style, onChangeText, ...props }, ref) => {
    const [bgKey, setBgKey] = React.useState(0);

    const handleChangeText = React.useCallback(
      (text: string) => {
        // Force a re-render to reassert our background color after
        // Samsung Pass / Android autofill applies its native yellow tint
        if (Platform.OS === "android") setBgKey((k) => k + 1);
        onChangeText?.(text);
      },
      [onChangeText]
    );

    return (
      <View style={{ borderRadius: 6, overflow: "hidden", backgroundColor: AUTOFILL_BG }}>
        <TextInput
          key={bgKey}
          ref={ref}
          className={cn(
            "h-10 w-full rounded-md border border-input px-3 py-2 text-sm text-foreground",
            "placeholder:text-muted-foreground",
            props.editable === false && "opacity-50",
            className
          )}
          style={[{ backgroundColor: AUTOFILL_BG }, style]}
          placeholderTextColor={placeholderTextColor ?? "#9ca3af"}
          onChangeText={handleChangeText}
          {...props}
        />
      </View>
    );
  }
);

Input.displayName = "Input";
