import { createContext, useContext } from "react";
import type { AppContextType } from "./types";

export const AppCtx = createContext<(AppContextType & { pending: number; refreshPending: () => void }) | null>(null);

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppCtx.Provider");
  return ctx;
}
