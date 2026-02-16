'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { PageContext } from '@/src/types/context';

interface PageContextContextType {
  context: PageContext;
  updateContext: (newContext: Partial<PageContext>) => void;
}

const PageContextContext = createContext<PageContextContextType | undefined>(undefined);

/**
 * PageContextProvider manages the ephemeral state of the current page's context,
 * including the route, workflow step, and project state. This context is injected
 * into the chat component tree to provide the LLM with situational awareness.
 */
export function PageContextProvider({
  children,
  initialContext,
}: {
  children: ReactNode;
  initialContext: PageContext;
}) {
  const [context, setContext] = useState<PageContext>(initialContext);

  // Synchronize internal state if the initialContext prop changes (e.g., during navigation)
  useEffect(() => {
    setContext(initialContext);
  }, [initialContext]);

  /**
   * Updates the current page context by merging the new context fields
   * with the existing state.
   */
  const updateContext = useCallback((newContext: Partial<PageContext>) => {
    setContext((prev) => ({
      ...prev,
      ...newContext,
    }));
  }, []);

  const value = useMemo(() => ({
    context,
    updateContext,
  }), [context, updateContext]);

  return (
    <PageContextContext.Provider value={value}>
      {children}
    </PageContextContext.Provider>
  );
}

/**
 * Hook to access the PageContext within components nested under PageContextProvider.
 * Throws an error if used outside of the provider.
 */
export function usePageContext() {
  const context = useContext(PageContextContext);
  if (context === undefined) {
    throw new Error('usePageContext must be used within a PageContextProvider');
  }
  return context;
}
