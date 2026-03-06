// 🚩 FLAG: Radix Popover + Command components → Modal + TextInput + ScrollView
// 🚩 FLAG: e.stopPropagation() on onClick → no equivalent needed in RN (events don't bubble the same way)
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Plus, X } from "lucide-react-native";
import { cn } from "@/lib/utils";

interface PlatformSelectorProps {
  selectedPlatforms: string[];
  onPlatformsChange: (platforms: string[]) => void;
  savedPlatforms: string[];
  onSaveNewPlatform?: (platform: string) => void;
}

const commonPlatforms = [
  "Lime", "Uber", "Uber Eats", "Lyft", "DoorDash", "Grubhub",
  "Instacart", "Amazon Flex", "Spark", "Walmart", "Shipt",
  "Postmates", "TaskRabbit",
];

const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  selectedPlatforms,
  onPlatformsChange,
  savedPlatforms = [],
  onSaveNewPlatform,
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const allPlatforms = useMemo(() => {
    const combined = [...savedPlatforms];
    commonPlatforms.forEach((p) => {
      if (!combined.some((c) => c.toLowerCase() === p.toLowerCase())) {
        combined.push(p);
      }
    });
    return combined.sort((a, b) => {
      const aIsSaved = savedPlatforms.includes(a);
      const bIsSaved = savedPlatforms.includes(b);
      if (aIsSaved && !bIsSaved) return -1;
      if (!aIsSaved && bIsSaved) return 1;
      return a.localeCompare(b);
    });
  }, [savedPlatforms]);

  const filteredPlatforms = useMemo(() => {
    if (!inputValue.trim()) return allPlatforms;
    return allPlatforms.filter((p) =>
      p.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [allPlatforms, inputValue]);

  const isNewPlatform = useMemo(() => {
    if (!inputValue.trim()) return false;
    return !allPlatforms.some(
      (p) => p.toLowerCase() === inputValue.trim().toLowerCase()
    );
  }, [inputValue, allPlatforms]);

  const handleToggle = (platform: string) => {
    if (selectedPlatforms.includes(platform)) {
      onPlatformsChange(selectedPlatforms.filter((p) => p !== platform));
    } else {
      onPlatformsChange([...selectedPlatforms, platform]);
    }
  };

  const handleAddNew = () => {
    const newPlatform = inputValue.trim();
    if (!newPlatform) return;
    if (!selectedPlatforms.includes(newPlatform)) {
      onPlatformsChange([...selectedPlatforms, newPlatform]);
    }
    onSaveNewPlatform?.(newPlatform);
    setInputValue("");
  };

  const handleRemove = (platform: string) => {
    onPlatformsChange(selectedPlatforms.filter((p) => p !== platform));
  };

  return (
    <View className="space-y-2">
      <Label>Gig Apps Used (optional)</Label>

      {/* Trigger */}
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row flex-wrap items-center min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 gap-1"
      >
        {selectedPlatforms.length > 0 ? (
          selectedPlatforms.map((platform) => (
            <View key={platform} className="flex-row items-center bg-secondary rounded-full px-2 py-0.5 mr-1 mb-1">
              <Text className="text-xs text-secondary-foreground mr-1">{platform}</Text>
              <Pressable onPress={() => handleRemove(platform)}>
                <X size={10} color="#6b7280" />
              </Pressable>
            </View>
          ))
        ) : (
          <Text className="text-sm text-muted-foreground">Select apps used</Text>
        )}
      </Pressable>

      {/* Quick-select saved platforms when nothing selected */}
      {savedPlatforms.length > 0 && selectedPlatforms.length === 0 && (
        <View className="flex-row flex-wrap gap-1 mt-2">
          {savedPlatforms.slice(0, 5).map((platform) => (
            <Pressable key={platform} onPress={() => handleToggle(platform)}>
              <Badge variant="outline">{platform}</Badge>
            </Pressable>
          ))}
        </View>
      )}

      {/* Modal picker */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View className="flex-1 items-center justify-center bg-black/30">
            <TouchableWithoutFeedback>
              <View className="w-[85vw] max-w-sm rounded-md border border-border bg-background shadow-lg">
                <View className="p-3 border-b border-border">
                  <Input
                    placeholder="Search or type new platform..."
                    value={inputValue}
                    onChangeText={setInputValue}
                    autoFocus
                  />
                </View>

                <ScrollView className="max-h-80">
                  {/* Add new */}
                  {isNewPlatform && (
                    <Pressable
                      onPress={handleAddNew}
                      className="flex-row items-center px-3 py-3 border-b border-border"
                    >
                      <Plus size={16} color="#6b7280" />
                      <Text className="text-sm text-foreground ml-2">
                        Add "{inputValue.trim()}"
                      </Text>
                    </Pressable>
                  )}

                  {/* Your saved platforms */}
                  {savedPlatforms.length > 0 && (
                    <>
                      <Text className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/40">
                        Your Platforms
                      </Text>
                      {savedPlatforms
                        .filter((p) =>
                          !inputValue || p.toLowerCase().includes(inputValue.toLowerCase())
                        )
                        .map((platform) => (
                          <Pressable
                            key={`saved-${platform}`}
                            onPress={() => handleToggle(platform)}
                            className="flex-row items-center px-3 py-3"
                          >
                            <View className="w-4 mr-2">
                              {selectedPlatforms.includes(platform) && (
                                <Check size={14} color="#0f172a" />
                              )}
                            </View>
                            <Text className="text-sm text-foreground">{platform}</Text>
                          </Pressable>
                        ))}
                    </>
                  )}

                  {/* Popular platforms */}
                  <Text className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/40">
                    Popular Platforms
                  </Text>
                  {filteredPlatforms
                    .filter((p) => !savedPlatforms.includes(p))
                    .map((platform) => (
                      <Pressable
                        key={`common-${platform}`}
                        onPress={() => handleToggle(platform)}
                        className="flex-row items-center px-3 py-3"
                      >
                        <View className="w-4 mr-2">
                          {selectedPlatforms.includes(platform) && (
                            <Check size={14} color="#0f172a" />
                          )}
                        </View>
                        <Text className="text-sm text-foreground">{platform}</Text>
                      </Pressable>
                    ))}

                  {filteredPlatforms.length === 0 && !isNewPlatform && (
                    <Text className="text-center text-sm text-muted-foreground py-6">
                      No platforms found. Type to add a new one.
                    </Text>
                  )}
                </ScrollView>

                <View className="p-3 border-t border-border">
                  <Button variant="outline" onPress={() => setOpen(false)}>Done</Button>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default PlatformSelector;
