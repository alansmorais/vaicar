import React from 'react';
import { UserRole } from '../types.ts';
import { LandingPage } from './LandingPage.tsx';

interface RoleSelectorProps {
  onSelect: (role: UserRole) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ onSelect }) => {
  const handleSelect = (role: UserRole, extra?: { mode?: string }) => {
    if (extra?.mode) {
      localStorage.setItem('vaicar_passenger_mode', extra.mode);
    } else {
      localStorage.removeItem('vaicar_passenger_mode');
    }
    onSelect(role);
  };

  return <LandingPage onSelectRole={handleSelect} />;
};
