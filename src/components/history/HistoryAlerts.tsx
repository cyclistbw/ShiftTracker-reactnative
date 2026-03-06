// 🚩 FLAG: lucide-react → lucide-react-native; onClick → onPress
import { View } from "react-native";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react-native";

interface HistoryAlertsProps {
  error: string | null;
  duplicateWarning: boolean;
  onRetry: () => void;
}

const HistoryAlerts = ({ error, duplicateWarning, onRetry }: HistoryAlertsProps) => {
  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <View className="flex-row items-center gap-2">
            <AlertCircle size={16} color="#dc2626" />
            <AlertTitle>Error loading data</AlertTitle>
          </View>
          <AlertDescription>
            {error} Showing local data only.
          </AlertDescription>
          <Button variant="outline" size="sm" onPress={onRetry} className="mt-2">
            Retry
          </Button>
        </Alert>
      )}

      {duplicateWarning && (
        <Alert variant="warning" className="mb-4 bg-yellow-50 border-yellow-200">
          <View className="flex-row items-center gap-2">
            <AlertCircle size={16} color="#ca8a04" />
            <AlertTitle className="text-yellow-800">Possible duplicate data detected</AlertTitle>
          </View>
          <AlertDescription className="text-yellow-700">
            We've detected some shifts that may be duplicates. This could affect your earnings calculations.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

export default HistoryAlerts;
