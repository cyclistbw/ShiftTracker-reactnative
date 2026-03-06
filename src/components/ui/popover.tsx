// 🚩 FLAG: Radix UI Popover → Modal-based overlay (no DOM popper/portal in RN)
import * as React from "react";
import {
  Modal,
  View,
  TouchableWithoutFeedback,
} from "react-native";
import { cn } from "@/lib/utils";

interface PopoverContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PopoverContext = React.createContext<PopoverContextValue>({
  open: false,
  onOpenChange: () => {},
});

interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

function Popover({ open = false, onOpenChange, children }: PopoverProps) {
  return (
    <PopoverContext.Provider value={{ open, onOpenChange: onOpenChange ?? (() => {}) }}>
      {children}
    </PopoverContext.Provider>
  );
}

function PopoverTrigger({
  children,
  asChild,
}: {
  children: React.ReactElement;
  asChild?: boolean;
}) {
  const { onOpenChange } = React.useContext(PopoverContext);
  return React.cloneElement(children, {
    onPress: () => onOpenChange(true),
  });
}

interface PopoverContentProps {
  className?: string;
  children?: React.ReactNode;
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

function PopoverContent({ className, children }: PopoverContentProps) {
  const { open, onOpenChange } = React.useContext(PopoverContext);
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <TouchableWithoutFeedback onPress={() => onOpenChange(false)}>
        <View className="flex-1 items-center justify-center bg-black/30">
          <TouchableWithoutFeedback>
            <View
              className={cn(
                "w-72 rounded-md border border-border bg-popover p-4 shadow-md",
                className
              )}
            >
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
