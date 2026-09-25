package com.vaicar.app

import android.content.Context
import android.content.SharedPreferences

object SecurityUtils {
    private const val PREFS_NAME = "vaicar_security_prefs"
    
    // Keys
    private const val KEY_ADMIN_PWD = "admin_sec_pwd"
    private const val KEY_ADMIN_PWD_CHANGED = "admin_pwd_changed"
    
    private const val KEY_DEV_PWD = "dev_sec_pwd"
    private const val KEY_DEV_PWD_CHANGED = "dev_pwd_changed"
    
    // Default initial credentials
    const val DEFAULT_ADMIN_PIN = "Admin1989%"
    const val DEFAULT_DEV_PIN = "Dev1989%"
    
    // Banned passwords list
    private val BANNED_PASSWORDS = listOf("demo", "demo123", "teste", "123456", "senha")

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun isPasswordBanned(pwd: String): Boolean {
        val normalized = pwd.trim().lowercase()
        return BANNED_PASSWORDS.contains(normalized)
    }

    // --- ADMIN SECURITY ---
    fun getAdminPassword(context: Context): String {
        return getPrefs(context).getString(KEY_ADMIN_PWD, DEFAULT_ADMIN_PIN) ?: DEFAULT_ADMIN_PIN
    }

    fun isAdminPasswordChanged(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_ADMIN_PWD_CHANGED, false)
    }

    fun verifyAdminPassword(context: Context, input: String): AuthResult {
        val trimmed = input.trim()
        if (isPasswordBanned(trimmed)) {
            return AuthResult(
                success = false,
                errorMessage = "Acesso negado: Senhas de teste (\"demo\") desativadas por segurança."
            )
        }
        val current = getAdminPassword(context)
        if (trimmed != current) {
            return AuthResult(success = false, errorMessage = "Senha de administrador incorreta.")
        }
        return AuthResult(success = true, needsPasswordChange = !isAdminPasswordChanged(context))
    }

    fun setAdminPassword(context: Context, newPwd: String): OperationResult {
        val trimmed = newPwd.trim()
        if (trimmed.length < 6) {
            return OperationResult(success = false, message = "A nova senha deve ter pelo menos 6 caracteres.")
        }
        if (isPasswordBanned(trimmed)) {
            return OperationResult(success = false, message = "Não é permitido usar \"demo\" ou senhas triviais.")
        }
        getPrefs(context).edit()
            .putString(KEY_ADMIN_PWD, trimmed)
            .putBoolean(KEY_ADMIN_PWD_CHANGED, true)
            .apply()
        return OperationResult(success = true)
    }

    // --- DEV SECURITY ---
    fun getDevPassword(context: Context): String {
        return getPrefs(context).getString(KEY_DEV_PWD, DEFAULT_DEV_PIN) ?: DEFAULT_DEV_PIN
    }

    fun isDevPasswordChanged(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_DEV_PWD_CHANGED, false)
    }

    fun verifyDevPassword(context: Context, input: String): AuthResult {
        val trimmed = input.trim()
        if (isPasswordBanned(trimmed)) {
            return AuthResult(
                success = false,
                errorMessage = "Acesso negado: Credenciais de teste desativadas por segurança."
            )
        }
        val current = getDevPassword(context)
        if (trimmed != current) {
            return AuthResult(success = false, errorMessage = "Senha de desenvolvedor incorreta.")
        }
        return AuthResult(success = true, needsPasswordChange = !isDevPasswordChanged(context))
    }

    fun setDevPassword(context: Context, newPwd: String): OperationResult {
        val trimmed = newPwd.trim()
        if (trimmed.length < 6) {
            return OperationResult(success = false, message = "A nova senha deve ter pelo menos 6 caracteres.")
        }
        if (isPasswordBanned(trimmed)) {
            return OperationResult(success = false, message = "Não é permitido usar \"demo\" ou senhas triviais.")
        }
        getPrefs(context).edit()
            .putString(KEY_DEV_PWD, trimmed)
            .putBoolean(KEY_DEV_PWD_CHANGED, true)
            .apply()
        return OperationResult(success = true)
    }

    // --- PASSENGER AUTHENTICATION ---
    fun registerPassenger(context: Context, name: String, phone: String, pin: String): OperationResult {
        val trimmedName = name.trim()
        val trimmedPhone = phone.trim()
        val trimmedPin = pin.trim()
        
        if (trimmedName.isEmpty() || trimmedPhone.isEmpty()) {
            return OperationResult(success = false, message = "Nome e telefone são obrigatórios.")
        }
        if (trimmedPin.length < 6) {
            return OperationResult(success = false, message = "A senha deve ter pelo menos 6 caracteres.")
        }
        if (isPasswordBanned(trimmedPin)) {
            return OperationResult(success = false, message = "Não é permitido usar senhas triviais.")
        }

        getPrefs(context).edit()
            .putString("passenger_name", trimmedName)
            .putString("passenger_phone", trimmedPhone)
            .putString("passenger_pwd", trimmedPin)
            .putBoolean("passenger_logged_in", true)
            .putBoolean("passenger_pwd_changed", true) // Created directly with custom secure password
            .apply()
            
        return OperationResult(success = true)
    }

    fun loginPassenger(context: Context, phone: String, pin: String): OperationResult {
        val trimmedPhone = phone.trim()
        val trimmedPin = pin.trim()
        
        val registeredPhone = getPrefs(context).getString("passenger_phone", "") ?: ""
        val registeredPwd = getPrefs(context).getString("passenger_pwd", "") ?: ""
        
        if (registeredPhone.isEmpty()) {
            // First install / no account: let's allow a default initial login for demo/testing or force signup
            // But user requested: "Passageiro (Opcao cadastro e Login) ... e nenhuma senha deve ser exposta, todos primeiros acessos sao obrigatorios a trocar a senha"
            // So if they have no account, they must register first!
            return OperationResult(success = false, message = "Nenhuma conta de passageiro cadastrada neste dispositivo. Cadastre-se primeiro!")
        }
        
        if (trimmedPhone != registeredPhone) {
            return OperationResult(success = false, message = "Telefone não cadastrado.")
        }
        
        if (trimmedPin != registeredPwd) {
            return OperationResult(success = false, message = "Senha de acesso incorreta.")
        }
        
        getPrefs(context).edit().putBoolean("passenger_logged_in", true).apply()
        return OperationResult(success = true)
    }

    fun isPassengerLoggedIn(context: Context): Boolean {
        return getPrefs(context).getBoolean("passenger_logged_in", false)
    }

    fun logoutPassenger(context: Context) {
        getPrefs(context).edit().putBoolean("passenger_logged_in", false).apply()
    }

    fun getPassengerName(context: Context): String {
        return getPrefs(context).getString("passenger_name", "Alan Morais") ?: "Alan Morais"
    }

    fun getPassengerPhone(context: Context): String {
        return getPrefs(context).getString("passenger_phone", "+551299999999") ?: "+551299999999"
    }

    // --- DRIVER AUTHENTICATION ---
    fun registerDriverLocal(context: Context, name: String, phone: String, cpf: String, model: String, plate: String, pin: String): OperationResult {
        val trimmedPin = pin.trim()
        if (trimmedPin.length < 6) {
            return OperationResult(success = false, message = "A senha deve ter pelo menos 6 caracteres.")
        }
        if (isPasswordBanned(trimmedPin)) {
            return OperationResult(success = false, message = "Não é permitido usar senhas triviais.")
        }

        getPrefs(context).edit()
            .putString("driver_name", name.trim())
            .putString("driver_phone", phone.trim())
            .putString("driver_cpf", cpf.trim())
            .putString("driver_model", model.trim())
            .putString("driver_plate", plate.trim())
            .putString("driver_pwd", trimmedPin)
            .putBoolean("driver_logged_in", true)
            .putBoolean("driver_pwd_changed", true) // Created directly with custom secure password
            .apply()

        return OperationResult(success = true)
    }

    fun loginDriverLocal(context: Context, phone: String, pin: String): OperationResult {
        val trimmedPhone = phone.trim()
        val trimmedPin = pin.trim()

        val registeredPhone = getPrefs(context).getString("driver_phone", "") ?: ""
        val registeredPwd = getPrefs(context).getString("driver_pwd", "") ?: ""

        if (registeredPhone.isEmpty()) {
            return OperationResult(success = false, message = "Nenhum motorista cadastrado neste dispositivo. Cadastre-se primeiro!")
        }

        if (trimmedPhone != registeredPhone) {
            return OperationResult(success = false, message = "Telefone não correspondente ao motorista cadastrado.")
        }

        if (trimmedPin != registeredPwd) {
            return OperationResult(success = false, message = "Senha incorreta.")
        }

        getPrefs(context).edit().putBoolean("driver_logged_in", true).apply()
        return OperationResult(success = true)
    }

    fun isDriverLoggedIn(context: Context): Boolean {
        return getPrefs(context).getBoolean("driver_logged_in", false)
    }

    fun logoutDriver(context: Context) {
        getPrefs(context).edit().putBoolean("driver_logged_in", false).apply()
    }

    fun getDriverPhone(context: Context): String {
        return getPrefs(context).getString("driver_phone", "") ?: ""
    }

    fun setDriverOnline(context: Context, isOnline: Boolean) {
        getPrefs(context).edit().putBoolean("driver_is_online", isOnline).apply()
    }

    fun isDriverOnline(context: Context): Boolean {
        return getPrefs(context).getBoolean("driver_is_online", false)
    }

    fun setDriverId(context: Context, driverId: String) {
        getPrefs(context).edit().putString("driver_id", driverId).apply()
    }

    fun getDriverId(context: Context): String {
        return getPrefs(context).getString("driver_id", "") ?: ""
    }

    fun setDriverName(context: Context, name: String) {
        getPrefs(context).edit().putString("driver_name", name).apply()
    }

    fun getDriverName(context: Context): String {
        return getPrefs(context).getString("driver_name", "") ?: ""
    }

    fun setFcmToken(context: Context, token: String) {
        getPrefs(context).edit().putString("fcm_token", token).apply()
    }

    fun getFcmToken(context: Context): String {
        return getPrefs(context).getString("fcm_token", "") ?: ""
    }
}

data class AuthResult(
    val success: Boolean,
    val needsPasswordChange: Boolean = false,
    val errorMessage: String? = null
)

data class OperationResult(
    val success: Boolean,
    val message: String? = null
)
