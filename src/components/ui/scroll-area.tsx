// 🚩 FLAG: Radix UI ScrollArea → ScrollView (native scrolling, no custom scrollbar)
import * as React from "react";
import { ScrollView, ScrollViewProps, View } from "react-native";
import { cn } from "@/lib/utils";

interface ScrollAreaProps extends ScrollViewProps {
  className?: string;
  children?: React.ReactNode;
}

function ScrollArea({ className, children, ...props }: ScrollAreaProps) {
  return (
    <ScrollView
      className={cn("flex-1", className)}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

function ScrollBar() {
  // 🚩 FLAG: No-op — native scrollbars are handled by the OS
  return null;
}

export { ScrollArea, ScrollBar };
