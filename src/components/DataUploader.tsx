// 🚩 FLAG: <input type="file"> → expo-document-picker (no browser file picker in RN)
// 🚩 FLAG: file.text() → FileSystem.readAsStringAsync from expo-file-system
// 🚩 FLAG: getShifts() / saveShifts() → now async (AsyncStorage); must be awaited
// 🚩 FLAG: <ul>/<li> → <View>/<Text> with bullet prefix
import React, { useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Shift } from "@/types/shift";
import { saveShifts, getShifts } from "@/lib/storage";
import { v4 as uuidv4 } from "uuid";
import { Loader2, AlertTriangle, Upload, Check } from "lucide-react-native";
import { generateAnalyticsData, saveAnalyticsToSupabase } from "@/lib/analytics-service";
import { useToast } from "@/hooks/use-toast";

interface TaskImport {
  date: string;
  startTime: string;
  endTime: string;
  earnings: number;
  description?: string;
}

const DataUploader = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    stats?: { imported: number; days: number; totalEarnings: number };
  } | null>(null);
  const [isGeneratingAnalytics, setIsGeneratingAnalytics] = useState(false);
  const { toast } = useToast();

  const parseCSV = (csvText: string): TaskImport[] => {
    const lines = csvText.split("\n").filter((l) => l.trim() !== "");
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const dateIndex = headers.findIndex((h) => h.includes("date"));
    const startIndex = headers.findIndex((h) => h.includes("start"));
    const endIndex = headers.findIndex((h) => h.includes("end"));
    const earningsIndex = headers.findIndex(
      (h) => h.includes("earn") || h.includes("amount") || h.includes("income")
    );
    const descIndex = headers.findIndex((h) => h.includes("desc") || h.includes("task"));
    if (dateIndex === -1 || startIndex === -1 || endIndex === -1 || earningsIndex === -1) {
      throw new Error("CSV must contain date, start time, end time, and earnings columns");
    }
    const tasks: TaskImport[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length <= 1) continue;
      tasks.push({
        date: values[dateIndex],
        startTime: values[startIndex],
        endTime: values[endIndex],
        earnings: parseFloat(values[earningsIndex].replace(/[$,]/g, "")),
        description: descIndex !== -1 ? values[descIndex] : undefined,
      });
    }
    return tasks;
  };

  const parseJSON = (jsonText: string): TaskImport[] => {
    const data = JSON.parse(jsonText);
    const arr = Array.isArray(data) ? data : data.tasks || data.data || [];
    if (!Array.isArray(arr) || !arr.length) throw new Error("No valid task data found in JSON");
    const findField = (obj: any, names: string[]) => {
      for (const n of names) if (obj[n] !== undefined) return n;
      const lower: Record<string, string> = {};
      Object.keys(obj).forEach((k) => { lower[k.toLowerCase()] = k; });
      for (const n of names) { const m = lower[n.toLowerCase()]; if (m) return m; }
      return undefined;
    };
    return arr.map((item: any) => {
      const df = findField(item, ["date", "taskDate", "day"]);
      const sf = findField(item, ["startTime", "start", "beginTime"]);
      const ef = findField(item, ["endTime", "end", "completeTime"]);
      const ef2 = findField(item, ["earnings", "amount", "pay", "income", "revenue"]);
      const desc = findField(item, ["description", "desc", "task", "name", "title"]);
      if (!df || !sf || !ef || !ef2) throw new Error("JSON data is missing required fields");
      return {
        date: item[df],
        startTime: item[sf],
        endTime: item[ef],
        earnings:
          typeof item[ef2] === "number"
            ? item[ef2]
            : parseFloat(String(item[ef2]).replace(/[$,]/g, "")),
        description: desc ? item[desc] : undefined,
      };
    });
  };

  const processImportedTasks = (tasks: TaskImport[]): Shift[] => {
    const byDate = new Map<string, TaskImport[]>();
    tasks.forEach((t) => {
      if (!byDate.has(t.date)) byDate.set(t.date, []);
      byDate.get(t.date)!.push(t);
    });
    const shifts: Shift[] = [];
    byDate.forEach((dateTasks, date) => {
      dateTasks.sort((a, b) => a.startTime.localeCompare(b.startTime));
      const first = dateTasks[0];
      const last = dateTasks[dateTasks.length - 1];
      const totalEarnings = dateTasks.reduce((s, t) => s + t.earnings, 0);
      shifts.push({
        id: uuidv4(),
        startTime: new Date(`${date}T${first.startTime}`),
        endTime: new Date(`${date}T${last.endTime}`),
        mileageStart: 0,
        mileageEnd: 0,
        income: totalEarnings,
        expenses: [],
        isActive: false,
        totalPausedTime: 0,
      });
    });
    return shifts;
  };

  const handleFileUpload = async () => {
    try {
      // 🚩 FLAG: <input type="file"> → expo-document-picker
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "application/json", "text/plain"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      setIsProcessing(true);
      setImportResult(null);

      const asset = result.assets[0];
      // 🚩 FLAG: file.text() → FileSystem.readAsStringAsync
      const fileContent = await FileSystem.readAsStringAsync(asset.uri);
      const name = asset.name?.toLowerCase() ?? "";

      let tasks: TaskImport[] = [];
      if (name.endsWith(".csv")) {
        tasks = parseCSV(fileContent);
      } else if (name.endsWith(".json")) {
        tasks = parseJSON(fileContent);
      } else {
        throw new Error("Unsupported file type. Please upload a CSV or JSON file.");
      }

      if (tasks.length === 0) throw new Error("No valid tasks found in the file.");

      const importedShifts = processImportedTasks(tasks);

      // 🚩 FLAG: getShifts() → now async (AsyncStorage)
      const existingShifts = await getShifts();
      await saveShifts([...existingShifts, ...importedShifts]);

      const totalEarnings = importedShifts.reduce((s, sh) => s + (sh.income || 0), 0);
      setImportResult({
        success: true,
        message: "Data imported successfully!",
        stats: { imported: tasks.length, days: importedShifts.length, totalEarnings },
      });
      toast({ title: "Import Successful", description: `Imported ${tasks.length} tasks across ${importedShifts.length} days.` });
    } catch (error) {
      console.error("Import error:", error);
      const msg = error instanceof Error ? error.message : "Unknown error during import";
      setImportResult({ success: false, message: msg });
      toast({ title: "Import Failed", description: msg, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateAnalytics = async () => {
    try {
      setIsGeneratingAnalytics(true);
      const newAnalytics = await generateAnalyticsData();
      const success = await saveAnalyticsToSupabase(newAnalytics);
      if (success) {
        toast({ title: "Analytics generated", description: "Your gig analytics have been regenerated." });
      } else {
        throw new Error("Failed to save analytics data.");
      }
    } catch (err) {
      console.error("Analytics generation error:", err);
      toast({ title: "Error", description: "Failed to regenerate analytics.", variant: "destructive" });
    } finally {
      setIsGeneratingAnalytics(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Your Task Data</CardTitle>
      </CardHeader>
      <CardContent>
        <View className="space-y-6">
          <Text className="text-gray-600">
            Upload your task data to import it into the system. This will help provide more accurate analytics based on your actual work history.
          </Text>

          {/* Upload area */}
          <View className="border border-dashed border-gray-300 rounded-lg p-6 items-center">
            <Upload size={40} color="#9ca3af" />
            <Text className="text-sm text-gray-600 mt-2 mb-4">Select a CSV or JSON file</Text>
            <Button
              variant="outline"
              onPress={handleFileUpload}
              loading={isProcessing}
              disabled={isProcessing}
            >
              {isProcessing ? "Importing..." : "Select CSV or JSON File"}
            </Button>
            <Text className="mt-2 text-xs text-gray-500 text-center">
              Your file must include: date, start time, end time, and earnings columns
            </Text>
          </View>

          {importResult && (
            <Alert variant={importResult.success ? "default" : "destructive"} className={importResult.success ? "bg-green-50" : "bg-red-50"}>
              {importResult.success ? <Check size={16} color="#16a34a" /> : <AlertTriangle size={16} color="#dc2626" />}
              <AlertTitle>{importResult.success ? "Import Successful" : "Import Failed"}</AlertTitle>
              <AlertDescription>
                {importResult.message}
                {importResult.success && importResult.stats && (
                  <View className="mt-2">
                    <Text className="text-sm">Tasks imported: {importResult.stats.imported}</Text>
                    <Text className="text-sm">Days covered: {importResult.stats.days}</Text>
                    <Text className="text-sm">Total earnings: ${importResult.stats.totalEarnings.toFixed(2)}</Text>
                  </View>
                )}
              </AlertDescription>
            </Alert>
          )}

          {importResult?.success && (
            <View>
              <Button onPress={handleGenerateAnalytics} loading={isGeneratingAnalytics} className="w-full">
                Update Analytics with Imported Data
              </Button>
              <Text className="text-sm text-gray-500 mt-2">
                Click to regenerate your analytics using the newly imported task data.
              </Text>
            </View>
          )}

          {/* Format guidelines */}
          <View>
            <Text className="text-lg font-medium mb-2">File Format Guidelines</Text>
            <View className="space-y-2">
              <Text className="text-sm text-gray-600 font-semibold">CSV Format requires:</Text>
              {["Date column (YYYY-MM-DD)", "Start time column (HH:MM)", "End time column (HH:MM)", "Earnings column (numeric)"].map((item) => (
                <Text key={item} className="text-sm text-gray-600 pl-4">• {item}</Text>
              ))}
              <Text className="text-sm text-gray-600 font-semibold mt-2">JSON Format requires fields:</Text>
              {['"date" (YYYY-MM-DD)', '"startTime" (HH:MM)', '"endTime" (HH:MM)', '"earnings" (numeric)'].map((item) => (
                <Text key={item} className="text-sm text-gray-600 pl-4">• {item}</Text>
              ))}
            </View>
          </View>
        </View>
      </CardContent>
    </Card>
  );
};

export default DataUploader;
