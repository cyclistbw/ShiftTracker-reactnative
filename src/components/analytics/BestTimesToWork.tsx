// Deprecated component — static heatmap system has been removed.
// 🚩 FLAG: <div> → <View>; lucide-react → lucide-react-native
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react-native";

const BestTimesToWork: React.FC = () => {
  return (
    <Alert variant="destructive">
      <AlertTriangle size={16} color="#991b1b" />
      <AlertDescription>
        This component is deprecated. The static heatmap system has been removed.
        Please use the Dynamic Earnings Heatmap instead which provides better recommendations.
      </AlertDescription>
    </Alert>
  );
};

export default BestTimesToWork;
