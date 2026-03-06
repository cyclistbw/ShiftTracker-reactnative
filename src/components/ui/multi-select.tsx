// 🚩 FLAG: Popover + input → Modal + TextInput + ScrollView (no DOM popper/input in RN)
import * as React from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { Check, X, ChevronDown } from "lucide-react-native";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder = "Select options...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const safeOptions = React.useMemo(() => (Array.isArray(options) ? options : []), [options]);
  const safeSelected = React.useMemo(() => (Array.isArray(selected) ? selected : []), [selected]);

  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return safeOptions;
    return safeOptions.filter((o) => o.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [safeOptions, searchTerm]);

  const handleUnselect = (item: string) => {
    onChange(safeSelected.filter((i) => i !== item));
  };

  const handleSelect = (item: string) => {
    if (safeSelected.includes(item)) {
      onChange(safeSelected.filter((i) => i !== item));
    } else {
      onChange([...safeSelected, item]);
    }
  };

  const handleSelectAll = () => {
    if (safeSelected.length === safeOptions.length) {
      onChange([]);
    } else {
      onChange([...safeOptions]);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={cn(
          "flex flex-row flex-wrap items-center min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2",
          className
        )}
      >
        <View className="flex-1 flex-row flex-wrap gap-1">
          {safeSelected.length > 0 ? (
            safeSelected.map((item) => (
              <Badge key={item} variant="secondary" className="mr-1 mb-1 bg-lime-100">
                <Pressable
                  onPress={(e) => { e.stopPropagation?.(); handleUnselect(item); }}
                  className="flex-row items-center gap-1"
                >
                  <Text className="text-xs text-lime-800">{item}</Text>
                  <X size={10} color="#4d7c0f" />
                </Pressable>
              </Badge>
            ))
          ) : (
            <Text className="text-sm text-muted-foreground">{placeholder}</Text>
          )}
        </View>
        <ChevronDown size={16} className="opacity-50" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View className="flex-1 items-center justify-center bg-black/30">
            <TouchableWithoutFeedback>
              <View className="w-[85vw] max-w-sm rounded-md border border-border bg-background shadow-lg">
                {/* Search */}
                <View className="p-3 border-b border-border">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-sm font-medium text-foreground">Select Years</Text>
                    <ChevronDown size={16} color="#9ca3af" />
                  </View>
                  <Input
                    placeholder="Search"
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    className="h-9"
                  />
                </View>

                <ScrollView className="max-h-64">
                  {/* Select All */}
                  <Pressable
                    onPress={handleSelectAll}
                    className="flex-row items-center px-3 py-2.5"
                  >
                    <View
                      className={cn(
                        "w-4 h-4 rounded border-2 items-center justify-center mr-3",
                        safeSelected.length === safeOptions.length
                          ? "bg-lime-500 border-lime-500"
                          : "border-gray-300"
                      )}
                    >
                      {safeSelected.length === safeOptions.length && (
                        <Check size={10} color="#ffffff" />
                      )}
                    </View>
                    <Text className="text-sm font-medium text-foreground">Select All</Text>
                  </Pressable>

                  <View className="border-t border-border">
                    {filteredOptions.length === 0 ? (
                      <Text className="py-6 text-center text-sm text-muted-foreground">
                        No options found.
                      </Text>
                    ) : (
                      filteredOptions.map((option) => (
                        <Pressable
                          key={option}
                          onPress={() => handleSelect(option)}
                          className="flex-row items-center px-3 py-2.5"
                        >
                          <View
                            className={cn(
                              "w-4 h-4 rounded border-2 items-center justify-center mr-3",
                              safeSelected.includes(option)
                                ? "bg-lime-500 border-lime-500"
                                : "border-gray-300"
                            )}
                          >
                            {safeSelected.includes(option) && (
                              <Check size={10} color="#ffffff" />
                            )}
                          </View>
                          <Text className="text-sm text-foreground">{option}</Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
