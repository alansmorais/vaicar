// Security and Access Management for Admin & Developer Panels

const ADMIN_STORAGE_KEY = 'vaicar_admin_sec_pwd';
const ADMIN_INITIAL_CHANGED_KEY = 'vaicar_admin_pwd_changed';
const DEV_STORAGE_KEY = 'vaicar_dev_sec_pwd';
const DEV_INITIAL_CHANGED_KEY = 'vaicar_dev_pwd_changed';

// Default temporary initial credentials (must be changed upon first access)
const DEFAULT_ADMIN_INITIAL_PIN = 'admin2025';
const DEFAULT_DEV_INITIAL_PIN = 'dev2025';

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
  const trimmed = inputPwd.trim();
  if (isPasswordBanned(trimmed)) {
    return {
      success: false,
      errorMessage: 'Acesso negado: Credenciais de teste ("demo") foram completamente desativadas por segurança.',
    };
  }

  const currentPwd = getAdminStoredPassword();
  if (trimmed !== currentPwd) {
    return {
      success: false,
      errorMessage: 'Senha de administrador incorreta.',
    };
  }

  const hasChanged = isAdminPasswordChanged();
  return {
    success: true,
    needsPasswordChange: !hasChanged,
  };
};

export const setAdminPassword = (newPwd: string): { success: boolean; message?: string } => {
  const trimmed = newPwd.trim();
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
  const trimmed = inputPwd.trim();
  if (isPasswordBanned(trimmed)) {
    return {
      success: false,
      errorMessage: 'Acesso negado: Credenciais de teste ("demo") foram desativadas.',
    };
  }

  const currentPwd = getDevStoredPassword();
  if (trimmed !== currentPwd) {
    return {
      success: false,
      errorMessage: 'Senha de desenvolvedor incorreta.',
    };
  }

  const hasChanged = isDevPasswordChanged();
  return {
    success: true,
    needsPasswordChange: !hasChanged,
  };
};

export const setDevPassword = (newPwd: string): { success: boolean; message?: string } => {
  const trimmed = newPwd.trim();
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
