// Security and Access Management for Admin & Developer Panels

const ADMIN_STORAGE_KEY = 'vaicar_admin_sec_pwd';
const ADMIN_INITIAL_CHANGED_KEY = 'vaicar_admin_pwd_changed';
const DEV_STORAGE_KEY = 'vaicar_dev_sec_pwd';
const DEV_INITIAL_CHANGED_KEY = 'vaicar_dev_pwd_changed';

// Default temporary initial credentials
export const DEFAULT_ADMIN_INITIAL_PIN = 'Admin1989';
export const DEFAULT_DEV_INITIAL_PIN = 'Dev1989';

// Explicitly banned passwords
const BANNED_PASSWORDS = ['demo', 'demo123', 'teste', '123456', 'senha'];

export interface AuthVerifyResult {
  success: boolean;
  needsPasswordChange?: boolean;
  errorMessage?: string;
}

export const isPasswordBanned = (pwd: string): boolean => {
  const normalized = pwd.trim().toLowerCase();
  return BANNED_PASSWORDS.includes(normalized);
};

export const getAdminStoredPassword = (): string => {
  return localStorage.getItem(ADMIN_STORAGE_KEY) || DEFAULT_ADMIN_INITIAL_PIN;
};

export const isAdminPasswordChanged = (): boolean => {
  return localStorage.getItem(ADMIN_INITIAL_CHANGED_KEY) === 'true';
};

export const verifyAdminPassword = (inputPwd: string): AuthVerifyResult => {
  const trimmed = (inputPwd || '').trim();
  if (!trimmed) {
    return {
      success: false,
      errorMessage: 'Por favor, digite a senha de acesso.',
    };
  }

  if (isPasswordBanned(trimmed)) {
    return {
      success: false,
      errorMessage: 'Acesso negado: Credenciais de teste ("demo") foram completamente desativadas por segurança.',
    };
  }

  const normalizedInput = trimmed.toLowerCase();
  const currentPwd = getAdminStoredPassword().trim();
  const normalizedCurrent = currentPwd.toLowerCase();

  // 1. Direct match with current stored password (exact or case-insensitive)
  const matchesCurrent = trimmed === currentPwd || normalizedInput === normalizedCurrent;

  // 2. Factory and legacy recovery PINs (both Admin and Dev keys accepted, case-insensitive)
  // Accepts: Admin1989, admin1989, ADMIN1989, admin2025, Admin2025, Dev1989, dev1989, dev2025
  const isMasterKey = [
    'admin1989',
    'admin2025',
    'dev1989',
    'dev2025',
  ].includes(normalizedInput);

  if (!matchesCurrent && !isMasterKey) {
    return {
      success: false,
      errorMessage: 'Senha incorreta. Use o PIN de fábrica Admin1989 ou clique no botão Redefinir Senhas abaixo.',
    };
  }

  return {
    success: true,
    needsPasswordChange: false,
  };
};

export const setAdminPassword = (newPwd: string): { success: boolean; message?: string } => {
  const trimmed = (newPwd || '').trim();
  if (trimmed.length < 6) {
    return { success: false, message: 'A nova senha deve ter pelo menos 6 caracteres.' };
  }
  if (isPasswordBanned(trimmed)) {
    return { success: false, message: 'Não é permitido usar "demo", "teste" ou senhas triviais.' };
  }

  localStorage.setItem(ADMIN_STORAGE_KEY, trimmed);
  localStorage.setItem(ADMIN_INITIAL_CHANGED_KEY, 'true');
  return { success: true };
};

// Developer Auth
export const getDevStoredPassword = (): string => {
  return localStorage.getItem(DEV_STORAGE_KEY) || DEFAULT_DEV_INITIAL_PIN;
};

export const isDevPasswordChanged = (): boolean => {
  return localStorage.getItem(DEV_INITIAL_CHANGED_KEY) === 'true';
};

export const verifyDevPassword = (inputPwd: string): AuthVerifyResult => {
  const trimmed = (inputPwd || '').trim();
  if (!trimmed) {
    return {
      success: false,
      errorMessage: 'Por favor, digite a senha de desenvolvedor.',
    };
  }

  if (isPasswordBanned(trimmed)) {
    return {
      success: false,
      errorMessage: 'Acesso negado: Credenciais de teste ("demo") foram desativadas.',
    };
  }

  const normalizedInput = trimmed.toLowerCase();
  const currentPwd = getDevStoredPassword().trim();
  const normalizedCurrent = currentPwd.toLowerCase();

  // 1. Direct match with current stored password (exact or case-insensitive)
  const matchesCurrent = trimmed === currentPwd || normalizedInput === normalizedCurrent;

  // 2. Factory and legacy recovery PINs (case-insensitive)
  // Accepts: Dev1989, dev1989, DEV1989, dev2025, Dev2025, Admin1989, admin1989, admin2025
  const isMasterKey = [
    'dev1989',
    'dev2025',
    'admin1989',
    'admin2025',
  ].includes(normalizedInput);

  if (!matchesCurrent && !isMasterKey) {
    return {
      success: false,
      errorMessage: 'Senha incorreta. Use o PIN de fábrica Dev1989 ou clique no botão Redefinir Senhas abaixo.',
    };
  }

  return {
    success: true,
    needsPasswordChange: false,
  };
};

export const setDevPassword = (newPwd: string): { success: boolean; message?: string } => {
  const trimmed = (newPwd || '').trim();
  if (trimmed.length < 6) {
    return { success: false, message: 'A nova senha de desenvolvedor deve ter pelo menos 6 caracteres.' };
  }
  if (isPasswordBanned(trimmed)) {
    return { success: false, message: 'Não é permitido usar "demo" ou senhas triviais.' };
  }

  localStorage.setItem(DEV_STORAGE_KEY, trimmed);
  localStorage.setItem(DEV_INITIAL_CHANGED_KEY, 'true');
  return { success: true };
};

export const resetAllPasswords = (): void => {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
  localStorage.removeItem(ADMIN_INITIAL_CHANGED_KEY);
  localStorage.removeItem(DEV_STORAGE_KEY);
  localStorage.removeItem(DEV_INITIAL_CHANGED_KEY);
  localStorage.removeItem('vaicar_admin_auth');
  localStorage.removeItem('vaicar_dev_auth');
  localStorage.removeItem('adminPin');
  localStorage.removeItem('devPin');
  localStorage.removeItem('vaicar_admin_pwd');
  localStorage.removeItem('vaicar_dev_pwd');
  // Store explicit factory defaults
  localStorage.setItem(ADMIN_STORAGE_KEY, DEFAULT_ADMIN_INITIAL_PIN);
  localStorage.setItem(DEV_STORAGE_KEY, DEFAULT_DEV_INITIAL_PIN);
};
