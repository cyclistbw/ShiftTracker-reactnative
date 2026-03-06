// 🚩 FLAG: react-hook-form + zod kept as-is (both work in RN)
// 🚩 FLAG: Form/FormField/FormItem/FormLabel/FormMessage → plain View/Text (shadcn Form not available in RN)
// 🚩 FLAG: useLocation → useNavigationState for current route name
// 🚩 FLAG: toast from sonner → toast from @/hooks/use-toast
import React from "react";
import { View, Text } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useActivityTracker } from "@/hooks/useActivityTracker";

const feedbackSchema = z.object({
  type: z.string().min(1, "Please select a feedback type"),
  content: z.string().min(10, "Please provide at least 10 characters of feedback"),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
});

type FeedbackForm = z.infer<typeof feedbackSchema>;

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal = ({ isOpen, onClose }: FeedbackModalProps) => {
  const { trackEvent } = useActivityTracker();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackForm>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { type: "", content: "", email: "" },
  });

  const onSubmit = async (data: FeedbackForm) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("feedback").insert([
        {
          type: data.type,
          content: data.content,
          email: data.email || null,
          user_id: user?.id || null,
          page_path: "app",
          plan_tier: "free",
        },
      ]);

      if (error) {
        console.error("Error submitting feedback:", error);
        toast({ title: "Failed to submit feedback. Please try again.", variant: "destructive" });
        return;
      }

      trackEvent("feedback_submit", "feedback_modal", { type: data.type });
      toast({ title: "Thank you for your feedback! We appreciate your input." });
      reset();
      onClose();
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({ title: "An unexpected error occurred. Please try again.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Your Feedback</DialogTitle>
        </DialogHeader>

        <View className="space-y-4">
          {/* Type */}
          <View className="space-y-1">
            <Label>Feedback Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select feedback type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="improvement">Improvement</SelectItem>
                    <SelectItem value="general">General Feedback</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <Text className="text-xs text-destructive">{errors.type.message}</Text>
            )}
          </View>

          {/* Content */}
          <View className="space-y-1">
            <Label>Your Feedback</Label>
            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <Textarea
                  placeholder="Please share your thoughts, suggestions, or report any issues..."
                  className="min-h-[100px]"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
            {errors.content && (
              <Text className="text-xs text-destructive">{errors.content.message}</Text>
            )}
          </View>

          {/* Email */}
          <View className="space-y-1">
            <Label>Email (Optional)</Label>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <Input
                  placeholder="your.email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
            {errors.email && (
              <Text className="text-xs text-destructive">{errors.email.message}</Text>
            )}
          </View>

          <View className="flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onPress={onClose}>Cancel</Button>
            <Button
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              className="bg-lime-500"
            >
              Submit Feedback
            </Button>
          </View>
        </View>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;
