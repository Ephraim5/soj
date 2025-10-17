import React, { createContext, useContext, useMemo } from 'react';
import { useSouls } from '../hooks/useUnitMemberData';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SoulsStoreValue {
  personal: ReturnType<typeof useSouls>;
  unit: ReturnType<typeof useSouls>;
  addSoul: (input: { name: string; phone?: string; dateWon?: string; unitId?: string }) => Promise<any>;
  personalCount: number;
  unitCount: number;
}

const SoulsStoreContext = createContext<SoulsStoreValue | undefined>(undefined);

export const SoulsStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = React.useState<string | undefined>();
  React.useEffect(()=> {
    (async()=> {
      try {
        const t1 = await AsyncStorage.getItem('token');
        const t2 = t1 ? null : await AsyncStorage.getItem('auth_token');
        const t = (t1 || t2) as string | null;
        setToken(t || undefined);
      } catch{}
    })();
  },[]);
  const personal = useSouls(token, { scope: 'mine' });
  const unit = useSouls(token, { scope: 'unit' });

  const addSoul = React.useCallback(async (input: { name: string; phone?: string; dateWon?: string; unitId?: string }) => {
    // prefer personal.create for optimistic add
    return personal.create(input);
  }, [personal]);

  const value: SoulsStoreValue = useMemo(()=> ({
    personal,
    unit,
    addSoul,
    personalCount: personal.data?.souls?.length || 0,
    unitCount: unit.data?.souls?.length || 0,
  }), [personal, unit, addSoul]);

  return <SoulsStoreContext.Provider value={value}>{children}</SoulsStoreContext.Provider>;
};

export function useSoulsStore() {
  const ctx = useContext(SoulsStoreContext);
  if (!ctx) throw new Error('useSoulsStore must be inside SoulsStoreProvider');
  return ctx;
}
