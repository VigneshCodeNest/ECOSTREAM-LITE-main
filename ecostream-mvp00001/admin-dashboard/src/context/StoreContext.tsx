import React, { createContext, useContext, useState } from 'react';

export interface Store {
  id: string;
  name: string;
  url: string;
  port: number;
}

export const STORES: Store[] = [
  { id: 'ecofinds', name: 'EcoFinds', url: 'http://localhost:3000', port: 3000 },
  { id: 'techbazaar', name: 'TechBazaar', url: 'http://localhost:3001', port: 3001 },
  { id: 'styleavenue', name: 'StyleAvenue', url: 'http://localhost:3002', port: 3002 },
  { id: 'homeharmony', name: 'HomeHarmony', url: 'http://localhost:3003', port: 3003 },
];

interface StoreContextType {
  currentStore: Store;
  setStore: (storeId: string) => void;
  getApiUrl: (path: string) => string;
  getToken: () => string | null;
  setToken: (token: string) => void;
  logout: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [currentStore, setCurrentStore] = useState<Store>(() => {
    const saved = localStorage.getItem('lastStoreId');
    return STORES.find(s => s.id === saved) || STORES[0];
  });

  const setStore = (storeId: string) => {
    const store = STORES.find(s => s.id === storeId);
    if (store) {
      setCurrentStore(store);
      localStorage.setItem('lastStoreId', store.id);
    }
  };

  const getApiUrl = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${currentStore.url}${cleanPath}`;
  };

  const getToken = () => {
    return localStorage.getItem(`token_${currentStore.port}`);
  };

  const setToken = (token: string) => {
    localStorage.setItem(`token_${currentStore.port}`, token);
    localStorage.setItem('role', 'admin'); // Standardize for simplicity
  };

  const logout = () => {
    localStorage.removeItem(`token_${currentStore.port}`);
    window.location.href = '/login';
  };

  return (
    <StoreContext.Provider value={{ currentStore, setStore, getApiUrl, getToken, setToken, logout }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
