"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Model } from '@/hooks/useModels';

interface SettingsContextType {
  availableModels: Model[];
  modelsLoading: boolean;
  modelsError: string;
  refreshModels: () => Promise<void>;
  
  ip: string;
  port: number;
  ipLoading: boolean;
  ipError: string;
  refreshIp: (force?: boolean) => Promise<void>;
  updateIpSettings: (ip: string, port: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState<boolean>(true);
  const [modelsError, setModelsError] = useState<string>("");

  const [ip, setIp] = useState<string>('');
  const [port, setPort] = useState<number>(8080);
  const [ipLoading, setIpLoading] = useState<boolean>(true);
  const [ipError, setIpError] = useState<string>("");

  const fetchModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsError("");
    try {
      const response = await fetch('/api/models');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch models: ${response.status}`);
      }
      const models: Model[] = await response.json();
      setAvailableModels(models);
    } catch (err) {
      console.error("Error fetching models:", err);
      if (err instanceof Error) {
        setModelsError(err.message);
      } else {
        setModelsError("An unknown error occurred while fetching models.");
      }
    } finally {
      setModelsLoading(false);
    }
  }, []);

  const fetchIp = useCallback(async (force: boolean = false) => {
    setIpLoading(true);
    setIpError("");
    try {
      const url = force ? '/api/settings/server-ip?force=true' : '/api/settings/server-ip';
      const res = await fetch(url);
      const data = await res.json();
      if (data.ip) {
        setIp(data.ip);
      }
      if (data.port) {
        setPort(data.port);
      }
    } catch (error) {
      console.error('Error fetching IP:', error);
      setIpError('Discovery error.');
    } finally {
      setIpLoading(false);
    }
  }, []);

  const updateIpSettings = useCallback((newIp: string, newPort: number) => {
    setIp(newIp);
    setPort(newPort);
  }, []);

  useEffect(() => {
    fetchModels();
    fetchIp();
  }, [fetchModels, fetchIp]);

  return (
    <SettingsContext.Provider value={{
      availableModels,
      modelsLoading,
      modelsError,
      refreshModels: fetchModels,
      ip,
      port,
      ipLoading,
      ipError,
      refreshIp: fetchIp,
      updateIpSettings
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
