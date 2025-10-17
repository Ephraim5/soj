import React, { createContext, useContext, useState, ReactNode } from 'react';

type PhoneContextType = {
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
};

const PhoneNumberContext = createContext<PhoneContextType | undefined>(undefined);

export const usePhoneNumber = () => {
  const context = useContext(PhoneNumberContext);
  if (!context) throw new Error('usePhoneNumber must be used within PhoneNumberProvider');
  return context;
};

export const PhoneNumberProvider = ({ children }: { children: ReactNode }) => {
  const [phoneNumber, setPhoneNumber] = useState('');

  return (
    <PhoneNumberContext.Provider value={{ phoneNumber, setPhoneNumber }}>
      {children}
    </PhoneNumberContext.Provider>
  );
};
