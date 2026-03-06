import * as React from "react";
import { Text, TextProps } from "react-native";
import { cn } from "@/lib/utils";

export interface LabelProps extends TextProps {
  className?: string;
  children?: React.ReactNode;
}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <Text
      className={cn(
        "text-sm font-medium leading-none text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </Text>
  );
}
