// 🚩 FLAG: Radix UI AlertDialog → React Native Modal (no browser primitives in RN)
import * as React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TouchableWithoutFeedback,
} from "react-native";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AlertDialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextValue>({
  open: false,
  onOpenChange: () => {},
});

interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

function AlertDialog({ open = false, onOpenChange, children }: AlertDialogProps) {
  return (
    <AlertDialogContext.Provider
      value={{ open, onOpenChange: onOpenChange ?? (() => {}) }}
    >
      {children}
    </AlertDialogContext.Provider>
  );
}

function AlertDialogTrigger({ children }: { children: React.ReactElement }) {
  const { onOpenChange } = React.useContext(AlertDialogContext);
  return React.cloneElement(children, { onPress: () => onOpenChange(true) });
}

function AlertDialogContent({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { open } = React.useContext(AlertDialogContext);
  return (
    <Modal visible={open} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/80">
        <View
          className={cn(
            "w-[90vw] max-w-lg rounded-lg border border-border bg-background p-6 shadow-lg",
            className
          )}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

function AlertDialogHeader({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <View className={cn("mb-4 flex flex-col space-y-2", className)}>
      {children}
    </View>
  );
}

function AlertDialogFooter({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <View className={cn("mt-4 flex flex-row justify-end space-x-2", className)}>
      {children}
    </View>
  );
}

function AlertDialogTitle({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Text className={cn("text-lg font-semibold text-foreground", className)}>
      {children}
    </Text>
  );
}

function AlertDialogDescription({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Text className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </Text>
  );
}

function AlertDialogAction({
  onPress,
  className,
  children,
}: {
  onPress?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const { onOpenChange } = React.useContext(AlertDialogContext);
  return (
    <Button
      onPress={() => {
        onPress?.();
        onOpenChange(false);
      }}
      className={className}
    >
      {children}
    </Button>
  );
}

function AlertDialogCancel({
  onPress,
  className,
  children,
}: {
  onPress?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const { onOpenChange } = React.useContext(AlertDialogContext);
  return (
    <Button
      variant="outline"
      onPress={() => {
        onPress?.();
        onOpenChange(false);
      }}
      className={className}
    >
      {children}
    </Button>
  );
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
