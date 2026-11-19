import React, { createContext, useContext, useState, useCallback } from 'react';

interface LoadingContextType {
  loadingCount: number;
  /** Requests that change data (save, toggle, delete...) currently in flight. */
  mutatingCount: number;
  startMutation: () => void;
  stopMutation: () => void;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Helper for non-React files (like api.ts)
let startLoadingFn: (() => void) | null = null;
let stopLoadingFn: (() => void) | null = null;

export const startGlobalLoading = () => startLoadingFn?.();
export const stopGlobalLoading = () => stopLoadingFn?.();

let startMutationFn: (() => void) | null = null;
let stopMutationFn: (() => void) | null = null;
export const startGlobalMutation = () => startMutationFn?.();
export const stopGlobalMutation = () => stopMutationFn?.();

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadingCount, setLoadingCount] = useState(0);
  const [mutatingCount, setMutatingCount] = useState(0);

  const startLoading = useCallback(() => {
    setLoadingCount((prev) => prev + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingCount((prev) => Math.max(0, prev - 1));
  }, []);

  const startMutation = useCallback(() => {
    setMutatingCount((prev) => prev + 1);
  }, []);

  const stopMutation = useCallback(() => {
    setMutatingCount((prev) => Math.max(0, prev - 1));
  }, []);

  React.useEffect(() => {
    startMutationFn = startMutation;
    stopMutationFn = stopMutation;
    return () => {
      startMutationFn = null;
      stopMutationFn = null;
    };
  }, [startMutation, stopMutation]);

  // Register the global helpers
  React.useEffect(() => {
    startLoadingFn = startLoading;
    stopLoadingFn = stopLoading;
    return () => {
      startLoadingFn = null;
      stopLoadingFn = null;
    };
  }, [startLoading, stopLoading]);

  return (
    <LoadingContext.Provider value={{ loadingCount, mutatingCount, startMutation, stopMutation, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};