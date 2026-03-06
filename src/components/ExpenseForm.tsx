// 🚩 FLAG: <form onSubmit> → onPress handler (no form element in RN)
// 🚩 FLAG: onChange={(e) => set(e.target.value)} → onChangeText={set}
// 🚩 FLAG: <img src> → <Image source={{ uri }} /> from react-native
// 🚩 FLAG: toast from sonner → toast from @/hooks/use-toast
import { useState } from "react";
import { View, Text, Image } from "react-native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Expense } from "@/types/shift";
import { Trash2, Receipt } from "lucide-react-native";
import { toast } from "@/hooks/use-toast";
import MobileReceiptCapture from "@/components/mobile/MobileReceiptCapture";

interface ExpenseFormProps {
  onAddExpense: (expense: Omit<Expense, "id" | "timestamp">) => Promise<void>;
  onCameraStateChange?: (isActive: boolean) => void;
}

const ExpenseForm = ({ onAddExpense, onCameraStateChange }: ExpenseFormProps) => {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("");
  const [businessPurpose, setBusinessPurpose] = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const handleSubmit = async () => {
    if (isLoading) return;

    if (!description || !amount || isNaN(parseFloat(amount)) || !location || !businessPurpose) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    try {
      setIsLoading(true);
      await onAddExpense({
        description,
        amount: parseFloat(amount),
        date: new Date(),
        location,
        businessPurpose,
        receiptImage: receiptImage || undefined,
      });
      setDescription("");
      setAmount("");
      setLocation("");
      setBusinessPurpose("");
      setReceiptImage(null);
      setFormVisible(false);
    } catch (error) {
      console.error("Error saving expense:", error);
      toast({
        title: `Failed to save expense: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageCapture = async (imageData: string) => {
    setReceiptImage(imageData);
    setIsCameraActive(false);
    toast({ title: "Photo captured! Complete the expense details and save." });
  };

  const handleCameraStart = () => {
    setIsCameraActive(true);
    onCameraStateChange?.(true);
  };

  const removeImage = () => setReceiptImage(null);

  if (!formVisible) {
    return (
      <Button
        variant="outline"
        onPress={() => setFormVisible(true)}
        className="w-full border-dashed border-2 bg-lime-50"
        textClassName="text-lime-700"
      >
        + Add Expense
      </Button>
    );
  }

  return (
    <View className="border rounded-lg p-6 bg-white shadow-sm">
      <Text className="text-lg font-semibold text-gray-900 mb-4">Add Expense</Text>

      <View className="space-y-4">
        <View>
          <Label>Description</Label>
          <Input
            placeholder="Expense description"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View>
          <Label>Amount (USD)</Label>
          <Input
            placeholder="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </View>

        <View>
          <Label>Business Purpose</Label>
          <Input
            placeholder="Business purpose"
            value={businessPurpose}
            onChangeText={setBusinessPurpose}
          />
        </View>

        <View>
          <Label>Location</Label>
          <Input
            placeholder="Location"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* Receipt Photo */}
        <View>
          <View className="flex-row items-center gap-1 mb-2">
            <Receipt size={14} color="#6b7280" />
            <Label>Receipt Photo</Label>
          </View>
          {receiptImage ? (
            <View className="relative">
              {/* 🚩 FLAG: <img src> → <Image source={{ uri }} /> */}
              <Image
                source={{ uri: receiptImage }}
                className="max-h-56 w-full rounded border"
                resizeMode="cover"
              />
              <Button
                size="icon"
                variant="destructive"
                onPress={removeImage}
                className="absolute top-2 right-2 h-8 w-8 rounded-full"
              >
                <Trash2 size={16} color="#ffffff" />
              </Button>
            </View>
          ) : (
            <MobileReceiptCapture
              onImageCapture={handleImageCapture}
              onCameraStart={handleCameraStart}
            />
          )}
        </View>

        <View className="flex-row gap-2 pt-4">
          <Button
            variant="outline"
            onPress={() => setFormVisible(false)}
            className="flex-1"
            disabled={isLoading || isCameraActive}
          >
            Cancel
          </Button>
          <Button
            onPress={handleSubmit}
            className="flex-1 bg-lime-600"
            loading={isLoading}
            disabled={isCameraActive}
          >
            Add Expense
          </Button>
        </View>
      </View>
    </View>
  );
};

export default ExpenseForm;
