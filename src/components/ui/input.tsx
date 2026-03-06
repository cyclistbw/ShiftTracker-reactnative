import * as React from "react";
import { TextInput, TextInputProps, View } from "react-native";
import { cn } from "@/lib/utils";

export interface InputProps extends TextInputProps {
  className?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, placeholderTextColor, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        className={cn(
          "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
          "placeholder:text-muted-foreground",
          props.editable === false && "opacity-50",
          className
        )}
        placeholderTextColor={placeholderTextColor ?? "#9ca3af"}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
