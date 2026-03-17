
/**
 * Format currency to USD
 */
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Content mode aware currency formatter
 */
export const formatCurrencyWithContentMode = (amount: number, hideIncome: boolean): string => {
  if (hideIncome) {
    return "$••••";
  }
  return formatCurrency(amount);
};

/**
 * Calculate percentage change between two numbers
 */
export const calculatePercentChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Format a date for displaying shift times
 */
export const formatShiftDate = (date: Date | null) => {
  if (!date) return "N/A";
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
};

/**
 * Get the background color for a heatmap cell based on average per day hourly earnings
 * Using a terracotta-to-green gradient color scheme with dark mode support
 */
export const getHeatmapColor = (hourlyRate: number | undefined, isDarkMode: boolean = false): string => {
  if (hourlyRate === undefined || hourlyRate === null || isNaN(hourlyRate) || hourlyRate === 0) {
    return isDarkMode ? 'bg-[#2a2a2a]' : 'bg-[#eee9db]'; // Dark gray or Old Linen (No Data)
  }
  
  if (isDarkMode) {
    // 🌙 Dark Mode: Muted terracotta-to-green gradient
    // Deep Umber ($0-$5/hr)
    if (hourlyRate < 6) return 'bg-[#3d2b1f] text-gray-300';
    // Muted Terracotta ($6-$10/hr)
    if (hourlyRate < 11) return 'bg-[#4a3426] text-gray-300';
    // Subdued Bronze ($11-$15/hr)
    if (hourlyRate < 16) return 'bg-[#5a4232] text-gray-300';
    // Soft Ochre ($16-$20/hr)
    if (hourlyRate < 21) return 'bg-[#695139] text-gray-300';
    // Muted Beige ($21-$25/hr)
    if (hourlyRate < 26) return 'bg-[#786548] text-gray-300';
    // Pale Clay ($26-$30/hr)
    if (hourlyRate < 31) return 'bg-[#8a7a5a] text-gray-300';
    
    // 🌿 Dark Mode Green Gradient (High Income)
    // Deep Olive ($31-$35/hr)
    if (hourlyRate < 36) return 'bg-[#6b6a42] text-gray-300';
    // Dark Moss ($36-$40/hr)
    if (hourlyRate < 41) return 'bg-[#5a6440] text-gray-300';
    // Forest Green ($41-$45/hr)
    if (hourlyRate < 46) return 'bg-[#4a5536] text-gray-200';
    // Deep Forest ($46+ /hr)
    return 'bg-[#3a4529] text-gray-200';
  } else {
    // ☀️ Light Mode: Original bright terracotta-to-green gradient
    // Burnt Umber ($0-$5/hr)
    if (hourlyRate < 6) return 'bg-[#5b3a29] text-white';
    // Warm Terracotta ($6-$10/hr)
    if (hourlyRate < 11) return 'bg-[#764b32] text-white';
    // Rustic Bronze ($11-$15/hr)
    if (hourlyRate < 16) return 'bg-[#91603e] text-white';
    // Soft Ochre ($16-$20/hr)
    if (hourlyRate < 21) return 'bg-[#ab7b4b] text-white';
    // Sandy Beige ($21-$25/hr)
    if (hourlyRate < 26) return 'bg-[#c5a264]';
    // Pale Clay ($26-$30/hr)
    if (hourlyRate < 31) return 'bg-[#e1cda2]';
    
    // 🌿 Green Gradient (High Income)
    // Faded Olive ($31-$35/hr)
    if (hourlyRate < 36) return 'bg-[#a6a25e]';
    // Light Moss Green ($36-$40/hr)
    if (hourlyRate < 41) return 'bg-[#879b59]';
    // Earthy Green ($41-$45/hr)
    if (hourlyRate < 46) return 'bg-[#6a864e] text-white';
    // Dark Forest Green ($46+ /hr)
    return 'bg-[#2f5533] text-white';
  }
};

/**
 * Render heatmap emoji based on rate
 * @deprecated Use getHeatmapColor instead for gradient visualization
 */
export const getHeatmapEmoji = (rate: number | undefined) => {
  if (!rate) return '⚪';
  if (rate > 25) return '🟢';
  if (rate > 20) return '🟡';
  return '🔴';
};

/**
 * Format earnings per mile
 */
export const formatEarningsPerMile = (earningsPerMile: number) => {
  return `$${earningsPerMile.toFixed(2)}/mi`;
};
