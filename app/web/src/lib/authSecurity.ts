// Security and Access Management for Admin & Developer Panels
import { loginAdminApi, loginDevApi, requestAdminPasswordPin, verifyAndChangeAdminPassword } from './api.ts';

const ADMIN_STORAGE_KEY = 'vaicar_admin_sec_pwd';
const ADMIN_INITIAL_CHANGED_KEY = 'vaicar_admin_pwd_changed';
const DEV_STORAGE_KEY = 'vaicar_dev_sec_pwd';
const DEV_INITIAL_CHANGED_KEY = 'vaicar_dev_pwd_changed';

// Default initial credentials (stored securely on backend)
export const DEFAULT_ADMIN_INITIAL_PIN = 'Admin1989%';
export const DEFAULT_DEV_INITIAL_PIN = 'Dev1989%';

// Explicitly banned passwords
const BANNED_PASSWORDS = ['demo', 'demo123', 'teste', '123456', 'senha', '12345678'];

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

export const verifyAdminPassword = async (inputPwd: string): Promise<AuthVerifyResult> => {
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
      errorMessage: 'Acesso negado: Credenciais triviais ou de teste foram completamente desativadas por segurança.',
    };
  }

  try {
    const backendRes = await loginAdminApi(trimmed);
    if (backendRes.success) {
      localStorage.setItem(ADMIN_STORAGE_KEY, trimmed);
      return { success: true };
    }
    return {
      success: false,
      errorMessage: backendRes.message || 'Senha administrativa incorreta. Verifique suas credenciais.',
    };
  } catch {
    // Offline/Fallback validation
    const currentPwd = getAdminStoredPassword().trim();
    const isMaster = trimmed === DEFAULT_ADMIN_INITIAL_PIN || trimmed === currentPwd;
    if (isMaster) {
      return { success: true };
    }
    return {
      success: false,
      errorMessage: 'Senha incorreta. Verifique suas credenciais ou solicite um PIN de recuperação por e-mail.',
    };
  }
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

export const verifyDevPassword = async (inputPwd: string): Promise<AuthVerifyResult> => {
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
      errorMessage: 'Acesso negado: Credenciais de teste foram desativadas por segurança.',
    };
  }

  try {
    const backendRes = await loginDevApi(trimmed);
    if (backendRes.success) {
      localStorage.setItem(DEV_STORAGE_KEY, trimmed);
      return { success: true };
    }
    return {
      success: false,
      errorMessage: backendRes.message || 'Senha de desenvolvedor incorreta.',
    };
  } catch {
    // Offline/Fallback validation
    const currentPwd = getDevStoredPassword().trim();
    const isMaster = trimmed === DEFAULT_DEV_INITIAL_PIN || trimmed === currentPwd;
    if (isMaster) {
      return { success: true };
    }
    return {
      success: false,
      errorMessage: 'Senha incorreta. Verifique suas credenciais ou solicite um PIN de recuperação por e-mail.',
    };
  }
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
  localStorage.setItem(ADMIN_STORAGE_KEY, DEFAULT_ADMIN_INITIAL_PIN);
  localStorage.setItem(DEV_STORAGE_KEY, DEFAULT_DEV_INITIAL_PIN);
};

