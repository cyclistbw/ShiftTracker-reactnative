// 🚩 FLAG: Radix UI Dialog → React Native Modal
import * as React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { X } from "lucide-react-native";
import { cn } from "@/lib/utils";

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue>({
  open: false,
  onOpenChange: () => {},
});

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

function Dialog({ open = false, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange: onOpenChange ?? (() => {}) }}>
      {children}
    </DialogContext.Provider>
  );
}

function DialogTrigger({
  children,
  asChild,
}: {
  children: React.ReactElement;
  asChild?: boolean;
}) {
  const { onOpenChange } = React.useContext(DialogContext);
  return React.cloneElement(children, {
    onPress: () => onOpenChange(true),
  });
}

function DialogContent({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { open, onOpenChange } = React.useContext(DialogContext);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <TouchableWithoutFeedback onPress={() => onOpenChange(false)}>
        <View className="flex-1 items-center justify-center bg-black/80">
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View
                className={cn(
                  "w-[90vw] max-w-lg rounded-lg border border-border bg-background p-6 shadow-lg",
                  className
                )}
              >
                <Pressable
                  onPress={() => onOpenChange(false)}
                  className="absolute right-4 top-4 rounded-sm opacity-70 active:opacity-100"
                >
                  <X size={16} />
                </Pressable>
                {children}
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function DialogHeader({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <View className={cn("mb-4 flex flex-col space-y-1.5", className)}>
      {children}
    </View>
  );
}

function DialogFooter({
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

function DialogTitle({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Text
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-foreground",
        className
      )}
    >
      {children}
    </Text>
  );
}

function DialogDescription({
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

function DialogClose({ children }: { children: React.ReactElement }) {
  const { onOpenChange } = React.useContext(DialogContext);
  return React.cloneElement(children, {
    onPress: () => onOpenChange(false),
  });
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
