// 🚩 FLAG: lucide-react → lucide-react-native
// 🚩 FLAG: <input type="file"> ref + file.text() → expo-document-picker + FileSystem.readAsStringAsync
// 🚩 FLAG: useToast from @/components/ui/use-toast → useToast from @/hooks/use-toast
// 🚩 FLAG: <div>/<p>/<ul>/<li>/<strong> → <View>/<Text>
// 🚩 FLAG: animate-spin Loader2 → <ActivityIndicator>
// 🚩 FLAG: onClick → onPress
import { useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Shift } from "@/types/shift";
import { saveShifts, getShifts } from "@/lib/storage";
import { v4 as uuidv4 } from "uuid";
import { AlertTriangle, FileInput, Check } from "lucide-react-native";
// 🚩 FLAG: expo-document-picker + expo-file-system replace <input type="file"> + file.text()
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

interface TaskImport {
  date: string;
  startTime: string;
  endTime: string;
  earnings: number;
  description?: string;
}

const DataImport = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    stats?: {
      imported: number;
      days: number;
      totalEarnings: number;
    };
  } | null>(null);
  const { toast } = useToast();

  const parseCSV = (csvText: string): TaskImport[] => {
    const lines = csvText.split("\n").filter(line => line.trim() !== "");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

    const dateIndex = headers.findIndex(h => h.includes('date'));
    const startTimeIndex = headers.findIndex(h => h.includes('start'));
    const endTimeIndex = headers.findIndex(h => h.includes('end'));
    const earningsIndex = headers.findIndex(h => h.includes('earn') || h.includes('amount') || h.includes('income'));
    const descriptionIndex = headers.findIndex(h => h.includes('desc') || h.includes('task'));

    if (dateIndex === -1 || startTimeIndex === -1 || endTimeIndex === -1 || earningsIndex === -1) {
      throw new Error("CSV file must contain columns for date, start time, end time, and earnings");
    }

    const tasks: TaskImport[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      if (values.length <= 1) continue;
      tasks.push({
        date: values[dateIndex],
        startTime: values[startTimeIndex],
        endTime: values[endTimeIndex],
        earnings: parseFloat(values[earningsIndex].replace(/[$,]/g, '')),
        description: descriptionIndex !== -1 ? values[descriptionIndex] : undefined
      });
    }
    return tasks;
  };

  const parseJSON = (jsonText: string): TaskImport[] => {
    let data = JSON.parse(jsonText);
    const tasksArray = Array.isArray(data) ? data : (data.tasks || data.data || []);
    if (!Array.isArray(tasksArray) || !tasksArray.length) {
      throw new Error("No valid task data found in JSON");
    }
    return tasksArray.map(item => {
      const dateField = findField(item, ['date', 'taskDate', 'day']);
      const startField = findField(item, ['startTime', 'start', 'beginTime']);
      const endField = findField(item, ['endTime', 'end', 'completeTime']);
      const earningsField = findField(item, ['earnings', 'amount', 'pay', 'income', 'revenue']);
      const descField = findField(item, ['description', 'desc', 'task', 'name', 'title']);
      if (!dateField || !startField || !endField || !earningsField) {
        throw new Error("JSON data is missing required fields");
      }
      return {
        date: item[dateField],
        startTime: item[startField],
        endTime: item[endField],
        earnings: typeof item[earningsField] === 'number'
          ? item[earningsField]
          : parseFloat(String(item[earningsField]).replace(/[$,]/g, '')),
        description: descField ? item[descField] : undefined
      };
    });
  };

  const findField = (obj: any, possibleNames: string[]): string | undefined => {
    for (const name of possibleNames) {
      if (obj[name] !== undefined) return name;
    }
    const lowerCaseObj: { [key: string]: string } = {};
    Object.keys(obj).forEach(key => { lowerCaseObj[key.toLowerCase()] = key; });
    for (const name of possibleNames) {
      const match = lowerCaseObj[name.toLowerCase()];
      if (match !== undefined) return match;
    }
    return undefined;
  };

  const processImportedTasks = (tasks: TaskImport[]): Shift[] => {
    const tasksByDate = new Map<string, TaskImport[]>();
    tasks.forEach(task => {
      if (!tasksByDate.has(task.date)) tasksByDate.set(task.date, []);
      tasksByDate.get(task.date)?.push(task);
    });

    const shifts: Shift[] = [];
    tasksByDate.forEach((dateTasks, date) => {
      dateTasks.sort((a, b) => a.startTime.localeCompare(b.startTime));
      const firstTask = dateTasks[0];
      const lastTask = dateTasks[dateTasks.length - 1];
      const totalEarnings = dateTasks.reduce((sum, task) => sum + task.earnings, 0);
      shifts.push({
        id: uuidv4(),
        startTime: new Date(`${date}T${firstTask.startTime}`),
        endTime: new Date(`${date}T${lastTask.endTime}`),
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

  // 🚩 FLAG: <input type="file"> onChange → expo-document-picker + FileSystem.readAsStringAsync
  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/comma-separated-values', 'application/json'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setIsProcessing(true);
      setImportResult(null);

      const fileContent = await FileSystem.readAsStringAsync(asset.uri);
      let tasks: TaskImport[] = [];

      const fileName = asset.name.toLowerCase();
      if (fileName.endsWith('.csv')) {
        tasks = parseCSV(fileContent);
      } else if (fileName.endsWith('.json')) {
        tasks = parseJSON(fileContent);
      } else {
        throw new Error("Unsupported file type. Please upload a CSV or JSON file.");
      }

      if (tasks.length === 0) throw new Error("No valid tasks found in the file.");

      console.log(`Parsed ${tasks.length} tasks from file`);
      const importedShifts = processImportedTasks(tasks);
      console.log(`Converted to ${importedShifts.length} shifts`);

      const existingShifts = getShifts();
      saveShifts([...existingShifts, ...importedShifts]);

      const totalEarnings = importedShifts.reduce((sum, shift) => sum + (shift.income || 0), 0);
      setImportResult({
        success: true,
        message: "Data imported successfully!",
        stats: { imported: tasks.length, days: importedShifts.length, totalEarnings }
      });
      toast({
        title: "Import Successful",
        description: `Imported ${tasks.length} tasks across ${importedShifts.length} days.`,
      });
    } catch (error) {
      console.error("Import error:", error);
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error during import"
      });
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Unknown error during import",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Text className="text-xl font-semibold text-foreground mb-4">Import Task Data</Text>

        <View className="space-y-6">
          <View>
            <Text className="text-muted-foreground mb-4">
              Import your historical task data to improve your analytics.
              Upload a CSV or JSON file containing your tasks with dates, times, and earnings.
            </Text>

            {/* Drop zone → Button area */}
            {/* 🚩 FLAG: dashed border drop zone → simple button area (no drag-and-drop on mobile) */}
            <View className="border border-dashed border-border rounded-lg p-6 items-center">
              <FileInput size={40} color="#9ca3af" />
              <Text className="text-sm text-muted-foreground mt-2 mb-3">
                Select a CSV or JSON file to import
              </Text>
              <Button
                variant="outline"
                onPress={handleFileUpload}
                disabled={isProcessing}
                className="flex-row items-center gap-2"
              >
                {/* 🚩 FLAG: animate-spin Loader2 → ActivityIndicator */}
                {isProcessing && <ActivityIndicator size="small" />}
                <Text>Select CSV or JSON File</Text>
              </Button>
              <Text className="mt-2 text-xs text-muted-foreground text-center">
                Your file must include: date, start time, end time, and earnings columns
              </Text>
            </View>

            {importResult && (
              <Alert
                className={`mt-6 ${importResult.success ? "bg-green-50" : "bg-red-50"}`}
                variant={importResult.success ? "default" : "destructive"}
              >
                {importResult.success ? (
                  <Check size={16} color="#16a34a" />
                ) : (
                  <AlertTriangle size={16} color="#dc2626" />
                )}
                <AlertTitle>
                  {importResult.success ? "Import Successful" : "Import Failed"}
                </AlertTitle>
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

            {/* Format Guidelines */}
            <View className="mt-6">
              <Text className="text-lg font-medium text-foreground mb-2">File Format Guidelines</Text>
              <View className="space-y-3">
                <Text className="text-sm text-muted-foreground">
                  <Text className="font-bold">CSV Format:</Text> Your CSV file should have headers in the first row and include at least:
                </Text>
                <View className="pl-4 space-y-1">
                  {[
                    "Date column (format: YYYY-MM-DD)",
                    "Start time column (format: HH:MM)",
                    "End time column (format: HH:MM)",
                    "Earnings column (numeric value)",
                  ].map((item, i) => (
                    <Text key={i} className="text-sm text-muted-foreground">• {item}</Text>
                  ))}
                </View>

                <Text className="text-sm text-muted-foreground">
                  <Text className="font-bold">JSON Format:</Text> Your JSON file should contain an array of task objects with at least:
                </Text>
                <View className="pl-4 space-y-1">
                  {[
                    '"date" field (format: YYYY-MM-DD)',
                    '"startTime" field (format: HH:MM)',
                    '"endTime" field (format: HH:MM)',
                    '"earnings" field (numeric value)',
                  ].map((item, i) => (
                    <Text key={i} className="text-sm text-muted-foreground">• {item}</Text>
                  ))}
                </View>

                <Text className="text-sm text-muted-foreground mt-2">
                  The import tool will try to match common field names, but using the exact field names above
                  will ensure the most reliable results.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </CardContent>
    </Card>
  );
};

export default DataImport;
