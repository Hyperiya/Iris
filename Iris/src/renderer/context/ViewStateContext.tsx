// src/renderer/contexts/ViewStateContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { ViewState } from '../../types/viewState.ts';

interface ViewStateContextType {
  viewState: ViewState;
  setViewState: (state: ViewState) => void;
}

const ViewStateContext = createContext<ViewStateContextType | undefined>(undefined);

export const ViewStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewState, setViewState] = useState<ViewState>(ViewState.NEUTRAL);

  return (
    <ViewStateContext.Provider value={{ viewState, setViewState }}>
      {children}
    </ViewStateContext.Provider>
  );
};

export const useViewState = () => {
  const context = useContext(ViewStateContext);
  if (!context) {
    throw new Error('useViewState must be used within ViewStateProvider');
  }
  return context;
};
