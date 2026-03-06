// 🚩 FLAG: HTML table elements → View/Text rows (no table/thead/tbody in RN)
import * as React from "react";
import { View, Text, ScrollView } from "react-native";
import { cn } from "@/lib/utils";

interface ViewChildProps {
  className?: string;
  children?: React.ReactNode;
}

function Table({ className, children }: ViewChildProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className={cn("w-full", className)}>{children}</View>
    </ScrollView>
  );
}

function TableHeader({ className, children }: ViewChildProps) {
  return (
    <View className={cn("border-b border-border", className)}>{children}</View>
  );
}

function TableBody({ className, children }: ViewChildProps) {
  return <View className={cn("", className)}>{children}</View>;
}

function TableFooter({ className, children }: ViewChildProps) {
  return (
    <View className={cn("border-t border-border bg-muted/50", className)}>
      {children}
    </View>
  );
}

function TableRow({ className, children }: ViewChildProps) {
  return (
    <View
      className={cn(
        "flex flex-row border-b border-border items-center",
        className
      )}
    >
      {children}
    </View>
  );
}

interface TableCellProps extends ViewChildProps {
  isHeader?: boolean;
}

function TableHead({ className, children }: ViewChildProps) {
  return (
    <View className={cn("flex-1 h-12 px-4 justify-center", className)}>
      <Text className="text-left text-sm font-medium text-muted-foreground">
        {children}
      </Text>
    </View>
  );
}

function TableCell({ className, children }: ViewChildProps) {
  return (
    <View className={cn("flex-1 p-4 justify-center", className)}>
      {typeof children === "string" ? (
        <Text className="text-sm text-foreground">{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

function TableCaption({ className, children }: ViewChildProps) {
  return (
    <Text className={cn("mt-4 text-sm text-muted-foreground text-center", className)}>
      {children}
    </Text>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
