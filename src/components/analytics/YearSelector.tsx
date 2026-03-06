// 🚩 FLAG: <div> → <View>; lucide-react → lucide-react-native
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface YearSelectorProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  disabled?: boolean;
}

const YearSelector: React.FC<YearSelectorProps> = ({
  selectedYear,
  onYearChange,
  disabled = false,
}) => {
  const currentYear = new Date().getFullYear();
  const { user } = useAuth();
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailableYears = async () => {
      if (!user?.id) {
        setAvailableYears([currentYear]);
        setLoading(false);
        return;
      }

      try {
        const [regularShifts, importedShifts] = await Promise.all([
          supabase
            .from("shift_summaries")
            .select("start_time")
            .eq("user_id", user.id)
            .not("start_time", "is", null),
          supabase
            .from("shift_summaries_import")
            .select("start_time")
            .eq("user_id", user.id)
            .not("start_time", "is", null),
        ]);

        const yearsSet = new Set<number>();
        yearsSet.add(currentYear);

        regularShifts.data?.forEach((shift) => {
          if (shift.start_time) {
            yearsSet.add(new Date(shift.start_time).getFullYear());
          }
        });

        importedShifts.data?.forEach((shift) => {
          if (shift.start_time) {
            yearsSet.add(new Date(shift.start_time).getFullYear());
          }
        });

        const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
        setAvailableYears(sortedYears);
      } catch (error) {
        console.error("Error fetching available years:", error);
        setAvailableYears([currentYear]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableYears();
  }, [user?.id, currentYear]);

  return (
    <View className="flex-row items-center gap-2">
      <Calendar size={16} color="#9ca3af" />
      <Select
        value={selectedYear.toString()}
        onValueChange={(value) => onYearChange(parseInt(value))}
        disabled={disabled || loading}
      >
        <SelectTrigger className="w-28">
          <SelectValue placeholder="Select year" />
        </SelectTrigger>
        <SelectContent>
          {availableYears.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </View>
  );
};

export default YearSelector;
