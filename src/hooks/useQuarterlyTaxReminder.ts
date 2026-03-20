
import { useState, useEffect } from "react";
// 🚩 FLAG: useToast from @/hooks/use-toast is the RN shim — same import path, works as-is
import { useToast } from "@/hooks/use-toast";
// 🚩 FLAG: Native push notification scheduling added via expo-notifications
import { useNotifications } from "@/hooks/useNotifications";
import { Shift } from "@/types/shift";
import { getQuarterlyBreakdown } from "@/lib/tax-storage";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

interface QuarterlyReminder {
  quarter: number;
  year: number;
  dueDate: Date;
  estimatedTaxes: number;
  netIncome: number;
}

// 2024 Tax brackets for single filers
const TAX_BRACKETS = [
  { min: 0, max: 11600, rate: 0.10 },
  { min: 11601, max: 47150, rate: 0.12 },
  { min: 47151, max: 100525, rate: 0.22 },
  { min: 100526, max: 191950, rate: 0.24 },
  { min: 191951, max: 243725, rate: 0.32 },
  { min: 243726, max: 609350, rate: 0.35 },
  { min: 609351, max: Infinity, rate: 0.37 }
];

export const useQuarterlyTaxReminder = (shifts: Shift[], enableReminders: boolean = false) => {
  const { toast } = useToast();
  const { scheduleQuarterlyReminder } = useNotifications();
  const { settings } = useBusinessSettings();
  const [hasShownReminder, setHasShownReminder] = useState<Set<string>>(new Set());

  const calculateEstimatedTaxes = (netIncome: number): number => {
    if (netIncome <= 0) return 0;

    let incomeTax = 0;
    let remainingIncome = netIncome;

    for (const bracket of TAX_BRACKETS) {
      if (remainingIncome <= 0) break;
      const taxableAtThisBracket = Math.min(remainingIncome, bracket.max - bracket.min + 1);
      incomeTax += taxableAtThisBracket * bracket.rate;
      remainingIncome -= taxableAtThisBracket;
    }

    return incomeTax;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getQuarterEndDates = (year: number) => [
    { quarter: 1, date: new Date(year, 2, 31), dueDate: new Date(year, 3, 15) },
    { quarter: 2, date: new Date(year, 5, 30), dueDate: new Date(year, 5, 15) },
    { quarter: 3, date: new Date(year, 8, 30), dueDate: new Date(year, 8, 15) },
    { quarter: 4, date: new Date(year, 11, 31), dueDate: new Date(year + 1, 0, 15) },
  ];

  const checkForReminders = () => {
    if (!enableReminders) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const quarterEndDates = getQuarterEndDates(currentYear);
    const mileageRate = settings?.defaultMileageRate || 0.725;

    const quarterlyData = getQuarterlyBreakdown(shifts, currentYear, mileageRate);

    quarterEndDates.forEach(({ quarter, dueDate }) => {
      const reminderKey = `${currentYear}-Q${quarter}`;

      if (hasShownReminder.has(reminderKey)) return;

      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilDue <= 7 && daysUntilDue > 0) {
        const quarterData = quarterlyData.find(q => q.quarter === quarter);

        if (quarterData && quarterData.summary.netIncome > 0) {
          const estimatedTaxes = calculateEstimatedTaxes(quarterData.summary.netIncome);

          if (estimatedTaxes > 0) {
            const title = `Q${quarter} ${currentYear} Tax Payment Due Soon!`;
            const body = `Quarterly taxes of approximately ${formatCurrency(estimatedTaxes)} are due on ${dueDate.toLocaleDateString()}. Based on net income of ${formatCurrency(quarterData.summary.netIncome)}.`;

            toast({ title, description: body, duration: 10000 });

            // 🚩 FLAG: Schedule a native push notification for the due date (7 days prior)
            const reminderDate = new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            scheduleQuarterlyReminder(reminderKey, title, body, reminderDate).catch(console.error);

            setHasShownReminder(prev => new Set([...prev, reminderKey]));
          }
        }
      }
    });
  };

  useEffect(() => {
    if (shifts.length > 0 && enableReminders) {
      checkForReminders();
    }
  }, [shifts, enableReminders, settings?.defaultMileageRate]);

  useEffect(() => {
    if (!enableReminders) return;
    const interval = setInterval(checkForReminders, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [shifts, hasShownReminder, enableReminders, settings?.defaultMileageRate]);

  return {
    checkForReminders,
    hasShownReminder,
  };
};
