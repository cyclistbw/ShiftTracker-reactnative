// 🚩 FLAG: ScrollArea → ScrollView
// 🚩 FLAG: <div>/<p>/<h3>/<ul>/<li>/<section>/<br /> → <View>/<Text>
import { ScrollView, View, Text } from "react-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MobileTermsOfService() {
  return (
    // 🚩 FLAG: ScrollArea className="h-full" → ScrollView flex-1
    <ScrollView className="flex-1">
      <View className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <View>
              <Text className="font-semibold mb-2 text-foreground">Acceptance of Terms</Text>
              <Text className="text-sm text-foreground">
                By using ShiftTracker, you agree to these Terms of Service.
                If you do not agree to these terms, please do not use our service.
              </Text>
            </View>

            <View>
              <Text className="font-semibold mb-2 text-foreground">Service Description</Text>
              <Text className="text-sm text-foreground">
                ShiftTracker is a mobile application designed to help gig workers track their work shifts,
                earnings, expenses, and mileage for tax reporting and optimization purposes.
              </Text>
            </View>

            <View>
              <Text className="font-semibold mb-2 text-foreground">User Responsibilities</Text>
              <View className="space-y-1 pl-2">
                {[
                  "Provide accurate information when using the app",
                  "Maintain the security of your account credentials",
                  "Use the app in compliance with applicable laws",
                  "Not attempt to circumvent app security measures",
                ].map((item, i) => (
                  <Text key={i} className="text-sm text-foreground">• {item}</Text>
                ))}
              </View>
            </View>

            <View>
              <Text className="font-semibold mb-2 text-foreground">Limitation of Liability</Text>
              <Text className="text-sm text-foreground">
                ShiftTracker provides tools to assist with tracking and calculations, but users are responsible
                for verifying all information for accuracy. We are not liable for any tax or financial decisions
                made based on app data.
              </Text>
            </View>

            <View>
              <Text className="font-semibold mb-2 text-foreground">Subscription and Payments</Text>
              <Text className="text-sm text-foreground">
                Premium features require a subscription. Subscriptions auto-renew unless cancelled.
                Refunds are provided according to app store policies.
              </Text>
            </View>

            <View>
              <Text className="font-semibold mb-2 text-foreground">Termination</Text>
              <Text className="text-sm text-foreground">
                We may terminate or suspend your account if you violate these terms.
                You may delete your account at any time through the app settings.
              </Text>
            </View>

            <View>
              <Text className="font-semibold mb-2 text-foreground">Contact Information</Text>
              <Text className="text-sm text-foreground">
                For questions about these Terms of Service, contact us at:
              </Text>
              {/* 🚩 FLAG: <br /> → separate <Text> lines */}
              <Text className="text-sm text-foreground">Email: support@shifttracker.app</Text>
              <Text className="text-sm text-foreground">
                Last updated: {new Date().toLocaleDateString()}
              </Text>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}

export default MobileTermsOfService;
