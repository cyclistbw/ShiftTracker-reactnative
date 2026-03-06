// 🚩 FLAG: Radix UI Tooltip → no-op stubs (hover/focus tooltips don't exist on mobile touch)
// On mobile, tooltips are replaced by long-press or inline helper text patterns.
import * as React from "react";
import { View } from "react-native";

// TooltipProvider — no-op wrapper kept for API compatibility
function TooltipProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

interface TooltipContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TooltipContext = React.createContext<TooltipContextValue>({
  open: false,
  onOpenChange: () => {},
});

function Tooltip({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <TooltipContext.Provider value={{ open, onOpenChange: setOpen }}>
      {children}
    </TooltipContext.Provider>
  );
}

// Trigger — renders children as-is; long-press could open tooltip but we keep it simple
function TooltipTrigger({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

// Content — hidden on mobile; tooltip content is not shown
function TooltipContent({ children }: { children?: React.ReactNode; className?: string; sideOffset?: number }) {
  return null;
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
