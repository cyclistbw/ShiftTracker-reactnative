// 🚩 FLAG: Radix UI Select → custom Modal-based picker (no web popper available in RN)
import * as React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { cn } from "@/lib/utils";
import { useTheme, THEME_COLORS } from "@/context/ThemeContext";

interface SelectContextValue {
  value?: string;
  selectedLabel?: string;
  onValueChange?: (value: string, label?: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue>({
  open: false,
  setOpen: () => {},
});

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
  defaultValue?: string;
}

function Select({ value, onValueChange, defaultValue, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [selectedLabel, setSelectedLabel] = React.useState<string | undefined>();

  const effectiveValue = value ?? internalValue;
  const handleChange = (v: string, label?: string) => {
    setInternalValue(v);
    setSelectedLabel(label);
    onValueChange?.(v);
    setOpen(false);
  };

  return (
    <SelectContext.Provider
      value={{ value: effectiveValue, selectedLabel, onValueChange: handleChange, open, setOpen }}
    >
      {children}
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps {
  className?: string;
  children?: React.ReactNode;
  placeholder?: string;
}

function SelectTrigger({ className, children, placeholder }: SelectTriggerProps) {
  const { open, setOpen } = React.useContext(SelectContext);
  return (
    <Pressable
      onPress={() => setOpen(!open)}
      className={cn(
        "flex h-10 w-full flex-row items-center justify-between rounded-md border border-input bg-background px-3 py-2",
        className
      )}
    >
      {children}
      <ChevronDown size={16} className="opacity-50" />
    </Pressable>
  );
}

function SelectValue({
  placeholder,
  displayValue,
  className,
}: {
  placeholder?: string;
  displayValue?: string;
  className?: string;
}) {
  const { value, selectedLabel } = React.useContext(SelectContext);
  const label = displayValue ?? selectedLabel ?? value;
  return (
    <Text
      className={cn(
        "flex-1 text-sm",
        label ? "text-foreground" : "text-muted-foreground",
        className
      )}
    >
      {label ?? placeholder ?? "Select..."}
    </Text>
  );
}

function SelectContent({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { open, setOpen } = React.useContext(SelectContext);
  const { isDark } = useTheme();
  const colors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => setOpen(false)}
    >
      <TouchableWithoutFeedback onPress={() => setOpen(false)}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <TouchableWithoutFeedback>
            <View
              style={{ backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border, maxHeight: 384, width: "80%" }}
              className={className}
            >
              <ScrollView>{children}</ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

interface SelectItemProps {
  value: string;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

function SelectItem({ value, className, children, disabled }: SelectItemProps) {
  const { value: selectedValue, onValueChange } = React.useContext(SelectContext);
  const { isDark } = useTheme();
  const colors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  const isSelected = selectedValue === value;

  return (
    <Pressable
      onPress={() => !disabled && onValueChange?.(value, typeof children === "string" ? children : undefined)}
      disabled={disabled}
      style={isSelected ? { backgroundColor: colors.muted } : undefined}
      className={cn(
        "flex flex-row items-center px-3 py-3",
        disabled && "opacity-50",
        className
      )}
    >
      <View className="mr-2 w-4">{isSelected && <Check size={14} color={colors.foreground} />}</View>
      {typeof children === "string" ? (
        <Text style={{ color: colors.foreground }} className="flex-1 text-sm">{children}</Text>
      ) : (
        <View className="flex-1">{children}</View>
      )}
    </Pressable>
  );
}

function SelectLabel({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <Text className={cn("px-3 py-1.5 text-sm font-semibold text-foreground", className)}>
      {children}
    </Text>
  );
}

function SelectSeparator({ className }: { className?: string }) {
  return <View className={cn("my-1 h-px bg-muted", className)} />;
}

function SelectGroup({ children }: { children?: React.ReactNode }) {
  return <View>{children}</View>;
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
