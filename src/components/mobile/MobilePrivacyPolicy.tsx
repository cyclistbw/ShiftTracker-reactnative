// 🚩 FLAG: ScrollArea → ScrollView
// 🚩 FLAG: <div>/<p>/<h3>/<ul>/<li>/<section>/<br /> → <View>/<Text>
import { ScrollView, View, Text } from "react-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MobilePrivacyPolicy() {
  return (
    // 🚩 FLAG: ScrollArea className="h-full" → ScrollView flex-1
    <ScrollView className="flex-1">
      <View className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <View>
              <Text className="font-semibold mb-2 text-foreground">Information We Collect</Text>
              <Text className="text-sm text-foreground">
                ShiftTracker collects and processes the following information to provide our gig work optimization services:
              </Text>
              <View className="mt-2 space-y-1 pl-2">
                {[
                  "Location data when tracking shifts for mileage calculation",
                  "Work shift information (start/end times, earnings, expenses)",
                  "Account information (email address for authentication)",
                  "Device information for app functionality",
                ].map((item, i) => (
                  <Text key={i} className="text-sm text-foreground">• {item}</Text>
                ))}
              </View>
            </View>

            <View>
              <Text className="font-semibold mb-2 text-foreground">How We Use Your Information</Text>
              <View className="space-y-1 pl-2">
                {[
                  "Calculate accurate mileage for tax deductions",
                  "Provide earnings analytics and optimization recommendations",
                  "Sync your data across devices",
                  "Improve our services and user experience",
                ].map((item, i) => (
                  <Text key={i} className="text-sm text-foreground">• {item}</Text>
                ))}
              </View>
            </View>

            <View>
              <Text className="font-semibold mb-2 text-foreground">Location Data</Text>
              <Text className="text-sm text-foreground">
                We use location services to track your work routes and calculate mileage automatically.
                This data is stored securely and used only for your tax reporting and analytics.
                You can disable location tracking in the app settings at any time.
              </Text>
            </View>

            <View>
              <Text className="font-semibold mb-2 text-foreground">Data Security</Text>
              <Text className="text-sm text-foreground">
                Your data is encrypted and stored securely using industry-standard practices.
                We do not sell or share your personal information with third parties except as necessary to provide our services.
              </Text>
            </View>

            <View>
              <Text className="font-semibold mb-2 text-foreground">Your Rights</Text>
              <Text className="text-sm text-foreground">
                You have the right to access, update, or delete your personal information at any time.
                Contact us at support@shifttracker.app for any privacy-related requests.
              </Text>
            </View>

            <View>
              <Text className="font-semibold mb-2 text-foreground">Contact Us</Text>
              {/* 🚩 FLAG: <br /> → separate <Text> lines */}
              <Text className="text-sm text-foreground">
                If you have questions about this Privacy Policy, please contact us at:
              </Text>
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

export default MobilePrivacyPolicy;
