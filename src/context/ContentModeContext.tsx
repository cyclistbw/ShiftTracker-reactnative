import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type ContentModeContextType = {
  isContentModeEnabled: boolean;
  setContentMode: (enabled: boolean) => void;
};

const ContentModeContext = createContext<ContentModeContextType | undefined>(undefined);

export function ContentModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isContentModeEnabled, setIsContentModeEnabled] = useState(false);

  // Load saved preference from DB on mount
  useEffect(() => {
    if (!user) {
      setIsContentModeEnabled(false);
      return;
    }
    supabase
      .from("user_preferences")
      .select("content_mode_enabled")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setIsContentModeEnabled(!!(data as any).content_mode_enabled);
      });
  }, [user]);

  const setContentMode = (enabled: boolean) => setIsContentModeEnabled(enabled);

  return (
    <ContentModeContext.Provider value={{ isContentModeEnabled, setContentMode }}>
      {children}
    </ContentModeContext.Provider>
  );
}

export function useContentMode() {
  const context = useContext(ContentModeContext);
  if (!context) throw new Error("useContentMode must be used within a ContentModeProvider");
  return context;
}
