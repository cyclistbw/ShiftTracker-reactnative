// 🚩 FLAG: <input type="file"> → expo-document-picker
// 🚩 FLAG: file.text() → FileSystem.readAsStringAsync from expo-file-system
// 🚩 FLAG: <div>/<span>/<label> → <View>/<Text>/<Pressable>
import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { requireAuthentication } from "@/lib/security-utils";

interface ShiftDataUploaderProps {
  onUploadComplete: () => void;
}

const ShiftDataUploader = ({ onUploadComplete }: ShiftDataUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string } | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fileType, setFileType] = useState<"json" | "csv">("json");
  const { toast } = useToast();

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const record: Record<string, any> = {};
      headers.forEach((header, i) => {
        const value = values[i] || "";
        if (value && !isNaN(Number(value.replace("$", "")))) {
          record[header] = Number(value.replace("$", ""));
        } else if (value.toLowerCase() === "true") {
          record[header] = true;
        } else if (value.toLowerCase() === "false") {
          record[header] = false;
        } else {
          record[header] = value;
        }
      });
      return record;
    });
  };

  const calculateHours = (item: any): number | null => {
    if (item.start_time && item.end_time) {
      try {
        const start = new Date(item.start_time);
        const end = new Date(item.end_time);
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      } catch { return null; }
    }
    return null;
  };

  const prepareSummaryData = (item: any, recordId: string) => {
    if (item.summary_data) return item.summary_data;
    return {
      shift: {
        id: recordId,
        startTime: item.start_time || item.startTime || item.start,
        endTime: item.end_time || item.endTime || item.end,
        mileageStart: item.mileage_start || 0,
        mileageEnd: (item.mileage_end || 0) + (item.miles_driven || 0),
        income: item.earnings || item.amount || item.pay || 0,
        expenses: [],
        isActive: false,
        totalPausedTime: 0,
      },
    };
  };

  const processShiftData = async (data: any[]): Promise<number> => {
    let successCount = 0;
    const userId = await requireAuthentication();
    for (const item of data) {
      const recordId = String(item.id || `${Date.now()}_${Math.floor(Math.random() * 10000)}`);
      const record = {
        id: recordId,
        user_id: userId,
        start_time: item.start_time || item.startTime || item.start || null,
        end_time: item.end_time || item.endTime || item.end || null,
        earnings: item.earnings || item.amount || item.pay || item.revenue || null,
        miles_driven: item.miles_driven || item.miles || item.mileage || null,
        hours_worked: item.hours_worked || item.hours || calculateHours(item) || null,
        summary_data: prepareSummaryData(item, recordId),
        platform: item.platform || item.source || item.app || null,
      };
      const { error } = await supabase.from("shift_summaries").insert(record);
      if (error) console.error("Error inserting record:", error);
      else successCount++;
    }
    return successCount;
  };

  // 🚩 FLAG: <input type="file"> → DocumentPicker.getDocumentAsync
  const handleSelectFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/json", "text/csv", "text/plain"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const name = asset.name?.toLowerCase() ?? "";
    setFileType(name.endsWith(".csv") ? "csv" : "json");
    setSelectedFile({ name: asset.name, uri: asset.uri });
    setUploadSuccess(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "No file selected", description: "Please select a file to upload", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    setUploadSuccess(false);
    try {
      await requireAuthentication();
      // 🚩 FLAG: file.text() → FileSystem.readAsStringAsync
      const fileContent = await FileSystem.readAsStringAsync(selectedFile.uri);
      let data;
      try {
        data = fileType === "csv" ? parseCSV(fileContent) : JSON.parse(fileContent);
      } catch {
        throw new Error(`Invalid ${fileType.toUpperCase()} file.`);
      }

      const processArray = async (arr: any[]) => {
        const count = await processShiftData(arr);
        if (count > 0) {
          toast({ title: "Upload Successful", description: `Uploaded ${count} records to shift summaries.` });
          setUploadSuccess(true);
          onUploadComplete();
        } else {
          toast({ title: "No new records", description: "No records were added. There may have been an error." });
        }
      };

      if (Array.isArray(data)) {
        await processArray(data);
      } else if (typeof data === "object" && data !== null) {
        const key = ["shifts", "records", "data", "items"].find((k) => Array.isArray(data[k]));
        if (key) {
          await processArray(data[key]);
        } else {
          throw new Error("Could not find shift data in the uploaded file.");
        }
      } else {
        throw new Error("Invalid data format. Expected an array of shift records.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload Failed", description: error instanceof Error ? error.message : "An unknown error occurred", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle>Upload Shift Data</CardTitle>
      </CardHeader>
      <CardContent>
        <View className="space-y-4">
          {/* File picker */}
          <Pressable
            onPress={handleSelectFile}
            className="border-2 border-dashed border-gray-300 rounded-md p-4 items-center"
          >
            <Upload size={32} color="#9ca3af" />
            <Text className="text-sm font-medium mt-2">
              {selectedFile ? selectedFile.name : "Tap to select a JSON or CSV file"}
            </Text>
            <Text className="text-xs text-gray-500 mt-1">Upload your shift data as JSON or CSV</Text>
          </Pressable>

          {selectedFile && (
            <Text className="text-sm text-center">
              Selected format: <Text className="font-semibold uppercase">{fileType}</Text>
            </Text>
          )}

          <Button
            onPress={handleUpload}
            disabled={!selectedFile || isUploading}
            loading={isUploading}
            className="w-full"
          >
            Upload Data
          </Button>

          {uploadSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription>
                Data was successfully uploaded to your imported shifts database!
              </AlertDescription>
            </Alert>
          )}
        </View>
      </CardContent>
    </Card>
  );
};

export default ShiftDataUploader;
