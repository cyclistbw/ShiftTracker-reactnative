import * as React from "react";
import { TextInput, TextInputProps, View } from "react-native";
import { cn } from "@/lib/utils";

export interface InputProps extends TextInputProps {
  className?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, placeholderTextColor, style, ...props }, ref) => {
    return (
      <View
        style={{
          borderRadius: 6,
          overflow: "hidden",
          backgroundColor: "#f7fee7",
        }}
      >
        <TextInput
          ref={ref}
          className={cn(
            "h-10 w-full rounded-md border border-input px-3 py-2 text-sm text-foreground",
            "placeholder:text-muted-foreground",
            props.editable === false && "opacity-50",
            className
          )}
          style={[{ backgroundColor: "transparent" }, style]}
          placeholderTextColor={placeholderTextColor ?? "#9ca3af"}
          {...props}
        />
      </View>
    );
  }
);

Input.displayName = "Input";
