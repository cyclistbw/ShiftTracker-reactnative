import * as React from "react";
import { TextInput, TextInputProps } from "react-native";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextInputProps {
  className?: string;
}

export const Textarea = React.forwardRef<TextInput, TextareaProps>(
  ({ className, placeholderTextColor, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        multiline
        textAlignVertical="top"
        className={cn(
          "min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
          props.editable === false && "opacity-50",
          className
        )}
        placeholderTextColor={placeholderTextColor ?? "#9ca3af"}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
