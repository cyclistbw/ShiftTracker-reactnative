// 🚩 FLAG: Dialog → Modal; Form/FormField/FormItem/FormLabel/FormMessage → Controller + Label + Text
// 🚩 FLAG: <img src> → <Image source={{ uri }} />; toast from sonner → toast from @/hooks/use-toast
// 🚩 FLAG: window.location.href debug logs removed (no URL concept in RN)
// 🚩 FLAG: overflow-y-auto div → ScrollView; type="number" input → keyboardType="decimal-pad"
import { useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import { DatabaseExpense, getReceiptImageUrl } from "@/lib/expense-storage";
import React from "react";
import { Trash2, Receipt } from "lucide-react-native";
import { toast } from "@/hooks/use-toast";
import MobileReceiptCapture from "@/components/mobile/MobileReceiptCapture";
import { appLogger } from "@/lib/app-logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ExpenseFormValues {
  description: string;
  amount: string;
  businessPurpose: string;
  location: string;
  receiptImage?: string;
}

interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: DatabaseExpense | null;
  onSave: (values: ExpenseFormValues) => Promise<void>;
  saving: boolean;
  onCameraStateChange?: (active: boolean) => void;
}

const EditExpenseDialog = ({
  open,
  onOpenChange,
  expense,
  onSave,
  saving,
  onCameraStateChange,
}: EditExpenseDialogProps) => {
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  const { control, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm<ExpenseFormValues>({
    defaultValues: {
      description: "",
      amount: "",
      businessPurpose: "",
      location: "",
      receiptImage: "",
    },
  });

  // Reset form when expense changes or dialog opens
  React.useEffect(() => {
    if (open) {
      if (expense) {
        reset({
          description: expense.description,
          amount: expense.amount.toString(),
          businessPurpose: expense.business_purpose,
          location: expense.location,
          receiptImage: expense.receipt_image_path || "",
        });

        if (expense.receipt_image_path) {
          getReceiptImageUrl(expense.receipt_image_path).then((result) => {
            if (result.success && result.url) {
              setReceiptImage(result.url);
            }
          });
        } else {
          setReceiptImage(null);
        }
      } else {
        reset({
          description: "",
          amount: "",
          businessPurpose: "",
          location: "",
          receiptImage: "",
        });
        setReceiptImage(null);
      }
    }
  }, [expense, open]);

  const handleImageCapture = async (imageData: string) => {
    const debugTimestamp = new Date().toISOString();

    appLogger.photoUpload("Image capture started in EditExpenseDialog", "EditExpenseDialog", "handleImageCapture", {
      dialogState: { open, isCameraActive, isProcessingImage },
      imageDataLength: imageData?.length,
      timestamp: debugTimestamp,
    });

    setIsProcessingImage(true);
    setIsCameraActive(false);

    try {
      setReceiptImage(imageData);
      setValue("receiptImage", imageData);

      appLogger.photoUpload("Image processed and form updated successfully", "EditExpenseDialog", "handleImageCapture", {
        dialogState: { open, isCameraActive: false, isProcessingImage: true },
      });
    } catch (error) {
      appLogger.error("photo_upload", `Error processing image: ${error}`, "EditExpenseDialog", "handleImageCapture", error as Error, {
        timestamp: debugTimestamp,
      });
    } finally {
      setTimeout(() => {
        setIsProcessingImage(false);
        appLogger.photoUpload("Image processing complete - ready for form submission", "EditExpenseDialog", "handleImageCapture", {
          timestamp: debugTimestamp,
        });
      }, 100);
    }
  };

  const handleCameraStart = () => {
    setIsCameraActive(true);
  };

  const removeImage = () => {
    setReceiptImage(null);
    setValue("receiptImage", "");
  };

  const handleClose = () => {
    // Block close during camera / processing / submission
    if (isCameraActive || isProcessingImage || isFormSubmitting) return;
    onOpenChange(false);
  };

  const onSubmit = async (values: ExpenseFormValues) => {
    if (isProcessingImage || isFormSubmitting) return;

    appLogger.info("form_submission", "Form submission started", "EditExpenseDialog", "onSubmit", {
      hasReceiptImage: !!values.receiptImage,
      receiptImageLength: values.receiptImage?.length || 0,
    });

    setIsFormSubmitting(true);
    try {
      await onSave(values);
      appLogger.info("form_submission", "Form submission completed successfully", "EditExpenseDialog", "onSubmit");
    } catch (error) {
      appLogger.error("form_submission", "Form submission failed", "EditExpenseDialog", "onSubmit", error as Error, {
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsFormSubmitting(false);
    }
  };

  return (
    // 🚩 FLAG: Dialog → Modal with TouchableWithoutFeedback overlay
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              className="w-full max-w-lg"
            >
              <View className="bg-background rounded-lg border border-border overflow-hidden">
                {/* Header */}
                <View className="px-4 pt-4 pb-2 border-b border-border">
                  <Text className="text-lg font-semibold text-foreground">
                    {expense ? "Edit Expense" : "Add Expense"}
                  </Text>
                </View>

                {/* 🚩 FLAG: overflow-y-auto div → ScrollView */}
                <ScrollView
                  className="max-h-[70vh] px-4"
                  keyboardShouldPersistTaps="handled"
                >
                  <View className="space-y-4 py-4">
                    {/* Description */}
                    <View>
                      <Label className="mb-1">Description</Label>
                      <Controller
                        control={control}
                        name="description"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <Input
                            placeholder="Expense description"
                            onChangeText={onChange}
                            onBlur={onBlur}
                            value={value}
                          />
                        )}
                      />
                      {errors.description && (
                        <Text className="text-sm text-destructive mt-1">{errors.description.message}</Text>
                      )}
                    </View>

                    {/* Amount */}
                    <View>
                      <Label className="mb-1">Amount (USD)</Label>
                      <Controller
                        control={control}
                        name="amount"
                        render={({ field: { onChange, onBlur, value } }) => (
                          // 🚩 FLAG: type="number" → keyboardType="decimal-pad"
                          <Input
                            keyboardType="decimal-pad"
                            placeholder="Amount"
                            onChangeText={onChange}
                            onBlur={onBlur}
                            value={value}
                          />
                        )}
                      />
                      {errors.amount && (
                        <Text className="text-sm text-destructive mt-1">{errors.amount.message}</Text>
                      )}
                    </View>

                    {/* Business Purpose */}
                    <View>
                      <Label className="mb-1">Business Purpose</Label>
                      <Controller
                        control={control}
                        name="businessPurpose"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <Input
                            placeholder="Business purpose"
                            onChangeText={onChange}
                            onBlur={onBlur}
                            value={value}
                          />
                        )}
                      />
                      {errors.businessPurpose && (
                        <Text className="text-sm text-destructive mt-1">{errors.businessPurpose.message}</Text>
                      )}
                    </View>

                    {/* Location */}
                    <View>
                      <Label className="mb-1">Location</Label>
                      <Controller
                        control={control}
                        name="location"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <Input
                            placeholder="Location"
                            onChangeText={onChange}
                            onBlur={onBlur}
                            value={value}
                          />
                        )}
                      />
                      {errors.location && (
                        <Text className="text-sm text-destructive mt-1">{errors.location.message}</Text>
                      )}
                    </View>

                    {/* Receipt Image */}
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
                            className="w-full h-56 rounded border border-border"
                            resizeMode="cover"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-2 right-2 h-8 w-8 rounded-full"
                            onPress={removeImage}
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
                  </View>
                </ScrollView>

                {/* Footer */}
                <View className="flex-row justify-end gap-2 px-4 py-3 border-t border-border bg-background">
                  <Button variant="outline" onPress={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    onPress={handleSubmit(onSubmit)}
                    disabled={saving || isProcessingImage || isFormSubmitting}
                  >
                    {saving || isFormSubmitting
                      ? "Saving..."
                      : isProcessingImage
                      ? "Processing Image..."
                      : expense
                      ? "Save Changes"
                      : "Add Expense"}
                  </Button>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default EditExpenseDialog;
