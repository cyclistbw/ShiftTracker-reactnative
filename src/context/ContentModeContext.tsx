/**
 * ContentModeContext — identical logic to web version.
 * No web API usage, safe to copy as-is.
 */
import React, { createContext, useContext, useState } from "react";

type ContentModeContextType = {
  isContentModeEnabled: boolean;
  toggleContentMode: () => void;
};

const ContentModeContext = createContext<ContentModeContextType | undefined>(undefined);

export function ContentModeProvider({ children }: { children: React.ReactNode }) {
  const [isContentModeEnabled, setIsContentModeEnabled] = useState(false);

  const toggleContentMode = () => setIsContentModeEnabled((prev) => !prev);

  return (
    <ContentModeContext.Provider value={{ isContentModeEnabled, toggleContentMode }}>
      {children}
    </ContentModeContext.Provider>
  );
}

export function useContentMode() {
  const context = useContext(ContentModeContext);
  if (!context) throw new Error("useContentMode must be used within a ContentModeProvider");
  return context;
}
