package com.vaicar.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.compose.animation.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    private val requestNotificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { _ -> }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize Firebase programmatically
        try {
            if (com.google.firebase.FirebaseApp.getApps(this).isEmpty()) {
                val options = com.google.firebase.FirebaseOptions.Builder()
                    .setApplicationId("1:770203144889:android:f886f7734ea0dbd8")
                    .setApiKey("AIzaSyCFJDSCkR-U4c0wcgKlOUWAp1r-tE76R1U")
                    .setProjectId("gen-lang-client-0068493335")
                    .setGcmSenderId("770203144889")
                    .build()
                com.google.firebase.FirebaseApp.initializeApp(this, options)
            }
            
            // Register/fetch FCM token
            com.google.firebase.messaging.FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val token = task.result
                    android.util.Log.i("MainActivity", "FCM Token: $token")
                    SecurityUtils.setFcmToken(this, token)
                    val driverId = SecurityUtils.getDriverId(this)
                    if (driverId.isNotBlank()) {
                        ApiService.updateDriverFcmToken(
                            driverId = driverId,
                            fcmToken = token,
                            onSuccess = { android.util.Log.i("MainActivity", "Successfully registered FCM Token to driver.") },
                            onError = { e -> android.util.Log.e("MainActivity", "Failed to register FCM Token to driver: ${e.message}") }
                        )
                    }
                } else {
                    android.util.Log.w("MainActivity", "Fetching FCM registration token failed", task.exception)
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Firebase init error: ${e.message}", e)
        }

        // Request notification permission for Android 13+ (Tiramisu)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestNotificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        // Initialize Google Maps SDK Latest Renderer & Log initialization status
        try {
            com.google.android.gms.maps.MapsInitializer.initialize(applicationContext, com.google.android.gms.maps.MapsInitializer.Renderer.LATEST) { renderer ->
                when (renderer) {
                    com.google.android.gms.maps.MapsInitializer.Renderer.LATEST -> {
                        android.util.Log.i("VaiCarMaps", "Google Maps SDK initialized with LATEST renderer.")
                    }
                    com.google.android.gms.maps.MapsInitializer.Renderer.LEGACY -> {
                        android.util.Log.i("VaiCarMaps", "Google Maps SDK initialized with LEGACY renderer.")
                    }
                    else -> {
                        android.util.Log.i("VaiCarMaps", "Google Maps SDK initialized with renderer: $renderer")
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("VaiCarMaps", "Google Maps SDK MapsInitializer failed: ${e.message}", e)
        }

        val initialScreen = intent.getStringExtra("initial_screen")

        setContent {
            VaiCarTheme {
                MainAppContainer(initialScreen = initialScreen)
            }
        }
    }
}

enum class AppScreen {
    SPLASH,
    ROLE_SELECTOR,
    PASSENGER_AUTH,
    PASSENGER,
    DRIVER_AUTH,
    DRIVER,
    ADMIN_LOGIN,
    ADMIN,
    DEVELOPER_LOGIN,
    DEVELOPER
}

@OptIn(ExperimentalAnimationApi::class)
@Composable
fun MainAppContainer(initialScreen: String? = null) {
    val context = LocalContext.current
    var currentScreen by remember { mutableStateOf(if (initialScreen == "DRIVER") AppScreen.DRIVER else AppScreen.SPLASH) }
    var zones by remember { mutableStateOf<List<Zone>>(listOf()) }
    var metrics by remember { mutableStateOf<PlatformMetrics?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var loadError by remember { mutableStateOf(false) }
    var loadErrorMessage by remember { mutableStateOf("") }

    fun loadPlatformMeta() {
        isLoading = true
        loadError = false
        loadErrorMessage = ""
        ApiService.fetchMeta(
            onSuccess = { res ->
                zones = res.zones
                metrics = res.metrics
                isLoading = false
            },
            onError = { err ->
                isLoading = false
                loadError = true
                loadErrorMessage = err.message ?: "Não foi possível conectar ao servidor real."
            }
        )
    }

    LaunchedEffect(Unit) {
        if (initialScreen == "DRIVER") {
            loadPlatformMeta()
            currentScreen = AppScreen.DRIVER
        } else {
            // Show Splash Screen for 2.5 seconds minimum
            delay(2500)
            loadPlatformMeta()
            currentScreen = AppScreen.ROLE_SELECTOR
        }
    }

    AnimatedContent(
        targetState = currentScreen,
        transitionSpec = {
            fadeIn() with fadeOut()
        },
        label = "ScreenTransition"
    ) { screen ->
        when (screen) {
            AppScreen.SPLASH -> SplashScreenView()
            AppScreen.ROLE_SELECTOR -> RoleSelectorView(
                isLoading = isLoading,
                error = loadError,
                errorMessage = loadErrorMessage,
                onRetry = { loadPlatformMeta() },
                onSelectRole = { selectedScreen ->
                    currentScreen = selectedScreen
                }
            )
            AppScreen.PASSENGER_AUTH -> PassengerAuthScreen(
                onSuccess = { currentScreen = AppScreen.PASSENGER },
                onBack = { currentScreen = AppScreen.ROLE_SELECTOR }
            )
            AppScreen.PASSENGER -> PassengerScreen(
                zones = zones,
                onBack = { currentScreen = AppScreen.ROLE_SELECTOR }
            )
            AppScreen.DRIVER_AUTH -> DriverAuthScreen(
                onSuccess = { currentScreen = AppScreen.DRIVER },
                onBack = { currentScreen = AppScreen.ROLE_SELECTOR }
            )
            AppScreen.DRIVER -> DriverScreen(
                zones = zones,
                onBack = { currentScreen = AppScreen.ROLE_SELECTOR }
            )
            AppScreen.ADMIN_LOGIN -> PasswordGateScreen(
                title = "Acesso da Gestão Pública",
                initialPin = SecurityUtils.DEFAULT_ADMIN_PIN,
                onSuccess = { currentScreen = AppScreen.ADMIN },
                onBack = { currentScreen = AppScreen.ROLE_SELECTOR },
                onVerify = { pin -> SecurityUtils.verifyAdminPassword(context, pin) },
                onChangePassword = { pin -> SecurityUtils.setAdminPassword(context, pin) }
            )
            AppScreen.ADMIN -> AdminScreen(
                metrics = metrics ?: PlatformMetrics(0, 0, 0, 0, 0, 0, 0.0, 0, 0, 0, 0),
                onBack = { currentScreen = AppScreen.ROLE_SELECTOR }
            )
            AppScreen.DEVELOPER_LOGIN -> PasswordGateScreen(
                title = "Sandbox do Desenvolvedor",
                initialPin = SecurityUtils.DEFAULT_DEV_PIN,
                onSuccess = { currentScreen = AppScreen.DEVELOPER },
                onBack = { currentScreen = AppScreen.ROLE_SELECTOR },
                onVerify = { pin -> SecurityUtils.verifyDevPassword(context, pin) },
                onChangePassword = { pin -> SecurityUtils.setDevPassword(context, pin) }
            )
            AppScreen.DEVELOPER -> DeveloperScreen(
                onBack = { currentScreen = AppScreen.ROLE_SELECTOR },
                onUrlChanged = { loadPlatformMeta() }
            )
        }
    }
}

@Composable
fun SplashScreenView() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkSlate),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(160.dp)
                    .clip(CircleShape)
                    .background(SurfaceSlate),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = R.drawable.ic_launcher),
                    contentDescription = "VaiCar Logo",
                    modifier = Modifier.size(120.dp)
                )
            }
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "VaiCar",
                color = Color.White,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "São Sebastião • Litoral Norte",
                color = EmeraldGreen,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(32.dp))
            CircularProgressIndicator(color = EmeraldGreen, modifier = Modifier.size(28.dp))
        }
    }
}

@Composable
fun RoleSelectorView(
    isLoading: Boolean,
    error: Boolean,
    errorMessage: String = "",
    onRetry: () -> Unit,
    onSelectRole: (AppScreen) -> Unit
) {
    val context = LocalContext.current
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkSlate)
            .padding(24.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // App Banner Brand
            Image(
                painter = painterResource(id = R.drawable.ic_launcher),
                contentDescription = "VaiCar Logo",
                modifier = Modifier.size(110.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "VaiCar",
                color = Color.White,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Selecione o seu portal de acesso",
                color = TextSecondary,
                fontSize = 14.sp,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(32.dp))

            if (isLoading) {
                CircularProgressIndicator(color = EmeraldGreen)
                Spacer(modifier = Modifier.height(12.dp))
                Text("Conectando ao banco de dados...", color = TextSecondary, fontSize = 12.sp)
            } else if (error) {
                Text(
                    text = if (errorMessage.isNotBlank()) errorMessage else "Não foi possível conectar ao servidor real.",
                    color = AccentRed,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    fontSize = 13.sp
                )
                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = onRetry,
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                ) {
                    Text("Tentar Novamente", color = Color.Black)
                }
                Spacer(modifier = Modifier.height(12.dp))
                TextButton(onClick = { onSelectRole(AppScreen.DEVELOPER_LOGIN) }) {
                    Text("Abrir Sandbox para Mudar Servidor", color = EmeraldGreen)
                }
            } else {
                // Role Selection Grid
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    RoleCard(
                        title = "Portal do Passageiro",
                        description = "Encontre motoristas, consulte tarifas oficiais e viaje com segurança",
                        icon = Icons.Default.Person,
                        iconColor = EmeraldGreen,
                        onClick = { 
                            if (SecurityUtils.isPassengerLoggedIn(context)) {
                                onSelectRole(AppScreen.PASSENGER)
                            } else {
                                onSelectRole(AppScreen.PASSENGER_AUTH)
                            }
                        }
                    )

                    RoleCard(
                        title = "Cockpit do Motorista",
                        description = "Trabalhe de forma autônoma com taxa zero sobre suas corridas",
                        icon = Icons.Default.DriveEta,
                        iconColor = EmeraldGreen,
                        onClick = { 
                            if (SecurityUtils.isDriverLoggedIn(context)) {
                                onSelectRole(AppScreen.DRIVER)
                            } else {
                                onSelectRole(AppScreen.DRIVER_AUTH)
                            }
                        }
                    )

                    RoleCard(
                        title = "Gestão Pública (Admin)",
                        description = "Conselho de Transportes: fiscalize alvarás, vistorias e métricas da plataforma",
                        icon = Icons.Default.AdminPanelSettings,
                        iconColor = EmeraldGreen,
                        onClick = { onSelectRole(AppScreen.ADMIN_LOGIN) }
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = { onSelectRole(AppScreen.DEVELOPER_LOGIN) }) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.BugReport, contentDescription = null, tint = EmeraldGreen, modifier = Modifier.size(16.dp))
                                Text(" Sandbox Dev", color = EmeraldGreen, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun RoleCard(
    title: String,
    description: String,
    icon: ImageVector,
    iconColor: Color,
    onClick: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(iconColor.copy(alpha = 0.15f), shape = CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconColor,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(
                    text = title,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = description,
                    color = TextSecondary,
                    fontSize = 12.sp
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PasswordGateScreen(
    title: String,
    initialPin: String,
    onSuccess: () -> Unit,
    onBack: () -> Unit,
    onVerify: (String) -> AuthResult,
    onChangePassword: (String) -> OperationResult
) {
    var password by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    
    var error by remember { mutableStateOf("") }
    var step by remember { mutableStateOf(1) } // 1 = Login, 2 = Force Change Password
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkSlate)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(0.9f),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Default.Lock,
                contentDescription = null,
                tint = EmeraldGreen,
                modifier = Modifier.size(64.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = title,
                color = Color.White,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            
            if (step == 1) {
                Text(
                    text = "Digite o código/PIN de acesso",
                    color = TextSecondary,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(24.dp))
                
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it; error = "" },
                    label = { Text("Senha de Acesso") },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = EmeraldGreen,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedLabelColor = EmeraldGreen
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
                
                if (error.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(error, color = AccentRed, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Button(
                    onClick = {
                        val res = onVerify(password)
                        if (res.success) {
                            if (res.needsPasswordChange) {
                                step = 2 // Redirect to force change password
                            } else {
                                onSuccess()
                            }
                        } else {
                            error = res.errorMessage ?: "Senha incorreta."
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Entrar", color = Color.Black, fontWeight = FontWeight.Bold)
                }
                
                Spacer(modifier = Modifier.height(12.dp))
                
                TextButton(onClick = onBack) {
                    Text("Voltar ao Menu Principal", color = EmeraldGreen)
                }
            } else {
                // Step 2: Force Password Change (First Access)
                Text(
                    text = "Primeiro Acesso: Altere sua senha para sua segurança",
                    color = Color.Yellow,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(24.dp))
                
                OutlinedTextField(
                    value = newPassword,
                    onValueChange = { newPassword = it; error = "" },
                    label = { Text("Nova Senha") },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = EmeraldGreen,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedLabelColor = EmeraldGreen
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = confirmPassword,
                    onValueChange = { confirmPassword = it; error = "" },
                    label = { Text("Confirmar Nova Senha") },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = EmeraldGreen,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedLabelColor = EmeraldGreen
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
                
                if (error.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(error, color = AccentRed, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Button(
                    onClick = {
                        if (newPassword != confirmPassword) {
                            error = "As senhas não coincidem."
                            return@Button
                        }
                        val opRes = onChangePassword(newPassword)
                        if (opRes.success) {
                            onSuccess()
                        } else {
                            error = opRes.message ?: "Erro ao salvar senha."
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Definir Senha e Entrar", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PassengerAuthScreen(
    onSuccess: () -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    var isPinMode by remember { mutableStateOf(true) } // true = PIN Auth (First access), false = Fast Login with Password
    var authStep by remember { mutableStateOf(0) } // 0 = Enter credentials/Phone, 1 = Verify PIN, 2 = Set Password
    var isLoginMode by remember { mutableStateOf(true) } // true = Login, false = Cadastro (Only applicable in PINMode/SignUp)

    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var pinCode by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }

    var error by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkSlate)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxWidth(0.9f),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            item {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = null,
                    tint = EmeraldGreen,
                    modifier = Modifier.size(64.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = when {
                        !isPinMode -> "Login Rápido"
                        authStep == 0 && isLoginMode -> "Acesso via PIN (E-mail)"
                        authStep == 0 && !isLoginMode -> "Cadastro de Passageiro"
                        authStep == 1 -> "Verificação de PIN"
                        else -> "Defina sua Senha"
                    },
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = when {
                        !isPinMode -> "Entre com seu telefone e senha cadastrada"
                        authStep == 0 && isLoginMode -> "Primeiro acesso: digite seu telefone para receber o PIN por e-mail"
                        authStep == 0 && !isLoginMode -> "Preencha seus dados para começar a viajar"
                        authStep == 1 -> "Digite o código de 4 dígitos enviado ao seu e-mail"
                        else -> "Crie uma senha segura para seus próximos acessos rápidos"
                    },
                    color = TextSecondary,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(24.dp))
            }

            if (!isPinMode) {
                // PASSWORD LOGIN MODE
                item {
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it; error = "" },
                        label = { Text("Telefone WhatsApp") },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it; error = "" },
                        label = { Text("Sua Senha") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            } else {
                // PIN MODE - STEPS
                when (authStep) {
                    0 -> {
                        item {
                            if (!isLoginMode) {
                                OutlinedTextField(
                                    value = name,
                                    onValueChange = { name = it; error = "" },
                                    label = { Text("Nome Completo") },
                                    singleLine = true,
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                            }

                            OutlinedTextField(
                                value = email,
                                onValueChange = { email = it; error = "" },
                                label = { Text("E-mail (para envio do PIN)") },
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = phone,
                                onValueChange = { phone = it; error = "" },
                                label = { Text("Telefone WhatsApp") },
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                    1 -> {
                        item {
                            OutlinedTextField(
                                value = pinCode,
                                onValueChange = { pinCode = it; error = "" },
                                label = { Text("Código PIN (4 dígitos)") },
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                    2 -> {
                        item {
                            OutlinedTextField(
                                value = password,
                                onValueChange = { password = it; error = "" },
                                label = { Text("Nova Senha (mínimo 6 caracteres)") },
                                visualTransformation = PasswordVisualTransformation(),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = confirmPassword,
                                onValueChange = { confirmPassword = it; error = "" },
                                label = { Text("Confirmar Senha") },
                                visualTransformation = PasswordVisualTransformation(),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
            }

            item {
                if (error.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(error, color = AccentRed, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        if (!isPinMode) {
                            // Fast Login Action
                            if (phone.trim().isEmpty() || password.trim().isEmpty()) {
                                error = "Preencha todos os campos."
                                return@Button
                            }
                            val res = SecurityUtils.loginPassenger(context, phone, password)
                            if (res.success) {
                                onSuccess()
                            } else {
                                error = res.message ?: "Credenciais incorretas."
                            }
                        } else {
                            // PIN Mode Steps Navigation
                            when (authStep) {
                                0 -> {
                                    if (phone.trim().isEmpty()) {
                                        error = "O telefone é obrigatório."
                                        return@Button
                                    }
                                    if (email.trim().isEmpty()) {
                                        error = "O e-mail é obrigatório para receber o código PIN."
                                        return@Button
                                    }
                                    if (!isLoginMode && name.trim().isEmpty()) {
                                        error = "Preencha o seu nome completo para cadastro."
                                        return@Button
                                    }
                                    isLoading = true
                                    ApiService.requestPassengerPin(
                                        phone = phone,
                                        email = email,
                                        name = name,
                                        onSuccess = { codeSent, msg ->
                                            isLoading = false
                                            if (codeSent) {
                                                authStep = 1
                                                error = ""
                                            } else {
                                                error = msg
                                            }
                                        },
                                        onError = {
                                            isLoading = false
                                            error = "Erro ao enviar PIN: ${it.message}"
                                        }
                                    )
                                }
                                1 -> {
                                    if (pinCode.trim().isEmpty()) {
                                        error = "Código PIN é obrigatório."
                                        return@Button
                                    }
                                    isLoading = true
                                    ApiService.verifyPassengerPin(
                                        phone = phone,
                                        pin = pinCode,
                                        onSuccess = { passengerObj ->
                                            isLoading = false
                                            name = passengerObj.name
                                            authStep = 2
                                            error = ""
                                        },
                                        onError = {
                                            isLoading = false
                                            error = "PIN incorreto ou expirado: ${it.message}"
                                        }
                                    )
                                }
                                2 -> {
                                    if (password.trim().length < 6) {
                                        error = "A senha deve ter pelo menos 6 caracteres."
                                        return@Button
                                    }
                                    if (password != confirmPassword) {
                                        error = "As senhas não coincidem."
                                        return@Button
                                    }
                                    val res = SecurityUtils.registerPassenger(context, name, phone, password)
                                    if (res.success) {
                                        onSuccess()
                                    } else {
                                        error = res.message ?: "Erro ao criar senha."
                                    }
                                }
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(24.dp))
                    } else {
                        Text(
                            text = when {
                                !isPinMode -> "Entrar com Senha"
                                authStep == 0 -> "Solicitar Código PIN por E-mail"
                                authStep == 1 -> "Confirmar PIN e Continuar"
                                else -> "Criar Senha e Entrar"
                            },
                            color = Color.Black,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (authStep == 0) {
                    TextButton(
                        onClick = {
                            isPinMode = !isPinMode
                            error = ""
                        }
                    ) {
                        Text(
                            text = if (isPinMode) "Entrar com Senha Cadastrada" else "Primeiro Acesso / Login com PIN por E-mail",
                            color = EmeraldGreen
                        )
                    }

                    if (isPinMode) {
                        TextButton(
                            onClick = {
                                isLoginMode = !isLoginMode
                                error = ""
                            }
                        ) {
                            Text(
                                text = if (isLoginMode) "Não possui conta? Cadastre-se!" else "Já possui conta? Faça Login!",
                                color = EmeraldGreen
                            )
                        }
                    }
                } else {
                    TextButton(
                        onClick = {
                            authStep = 0
                            error = ""
                        }
                    ) {
                        Text("Voltar ao início", color = EmeraldGreen)
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                TextButton(onClick = onBack) {
                    Text("Voltar ao Menu Principal", color = Color.Gray)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DriverAuthScreen(
    onSuccess: () -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    var isPinMode by remember { mutableStateOf(true) } // true = PIN Auth, false = Password Login
    var authStep by remember { mutableStateOf(0) } // 0 = Enter credentials/phone, 1 = Verify PIN, 2 = Set Password
    var isLoginMode by remember { mutableStateOf(true) }

    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var cpf by remember { mutableStateOf("") }
    var vehicleModel by remember { mutableStateOf("") }
    var vehiclePlate by remember { mutableStateOf("") }
    var pinCode by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }

    var error by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkSlate)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxWidth(0.9f),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            item {
                Icon(
                    imageVector = Icons.Default.DriveEta,
                    contentDescription = null,
                    tint = EmeraldGreen,
                    modifier = Modifier.size(64.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = when {
                        !isPinMode -> "Login Rápido Condutor"
                        authStep == 0 && isLoginMode -> "Acesso via PIN (E-mail)"
                        authStep == 0 && !isLoginMode -> "Cadastro de Condutor"
                        authStep == 1 -> "Verificação de PIN"
                        else -> "Defina sua Senha"
                    },
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = when {
                        !isPinMode -> "Entre com seu telefone e senha de condutor"
                        authStep == 0 && isLoginMode -> "Primeiro acesso: digite seu telefone para receber o PIN por e-mail"
                        authStep == 0 && !isLoginMode -> "Envie seus dados para homologação pública"
                        authStep == 1 -> "Digite o código de 4 dígitos enviado ao seu e-mail"
                        else -> "Crie uma senha de acesso rápido para o Cockpit"
                    },
                    color = TextSecondary,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(24.dp))
            }

            if (!isPinMode) {
                // PASSWORD LOGIN MODE
                item {
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it; error = "" },
                        label = { Text("Telefone WhatsApp") },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it; error = "" },
                        label = { Text("Sua Senha") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            } else {
                // PIN MODE - STEPS
                when (authStep) {
                    0 -> {
                        item {
                            if (!isLoginMode) {
                                OutlinedTextField(
                                    value = name,
                                    onValueChange = { name = it; error = "" },
                                    label = { Text("Nome Completo") },
                                    singleLine = true,
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(12.dp))

                                OutlinedTextField(
                                    value = cpf,
                                    onValueChange = { cpf = it; error = "" },
                                    label = { Text("CPF") },
                                    singleLine = true,
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(12.dp))

                                OutlinedTextField(
                                    value = vehicleModel,
                                    onValueChange = { vehicleModel = it; error = "" },
                                    label = { Text("Modelo do Veículo") },
                                    singleLine = true,
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(12.dp))

                                OutlinedTextField(
                                    value = vehiclePlate,
                                    onValueChange = { vehiclePlate = it; error = "" },
                                    label = { Text("Placa do Veículo") },
                                    singleLine = true,
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                            }

                            OutlinedTextField(
                                value = email,
                                onValueChange = { email = it; error = "" },
                                label = { Text("Seu E-mail (para envio do PIN)") },
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = phone,
                                onValueChange = { phone = it; error = "" },
                                label = { Text("Telefone WhatsApp") },
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                    1 -> {
                        item {
                            OutlinedTextField(
                                value = pinCode,
                                onValueChange = { pinCode = it; error = "" },
                                label = { Text("Código PIN (4 dígitos)") },
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                    2 -> {
                        item {
                            OutlinedTextField(
                                value = password,
                                onValueChange = { password = it; error = "" },
                                label = { Text("Nova Senha (mínimo 6 caracteres)") },
                                visualTransformation = PasswordVisualTransformation(),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = confirmPassword,
                                onValueChange = { confirmPassword = it; error = "" },
                                label = { Text("Confirmar Senha") },
                                visualTransformation = PasswordVisualTransformation(),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
            }

            item {
                if (error.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(error, color = AccentRed, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        if (!isPinMode) {
                            // Direct Password Login
                            if (phone.trim().isEmpty() || password.trim().isEmpty()) {
                                error = "Preencha todos os campos."
                                return@Button
                            }
                            val res = SecurityUtils.loginDriverLocal(context, phone, password)
                            if (res.success) {
                                onSuccess()
                            } else {
                                error = res.message ?: "Credenciais incorretas."
                            }
                        } else {
                            // PIN steps navigation
                            when (authStep) {
                                0 -> {
                                    if (phone.trim().isEmpty()) {
                                        error = "O telefone é obrigatório."
                                        return@Button
                                    }
                                    if (email.trim().isEmpty()) {
                                        error = "O e-mail é obrigatório para envio do código PIN."
                                        return@Button
                                    }
                                    if (!isLoginMode && (name.trim().isEmpty() || cpf.trim().isEmpty() || vehicleModel.trim().isEmpty())) {
                                        error = "Preencha todos os campos para homologação."
                                        return@Button
                                    }

                                    isLoading = true
                                    if (!isLoginMode) {
                                        // Register first, then request PIN
                                        ApiService.registerDriver(
                                            name = name,
                                            phone = phone,
                                            email = email,
                                            cpf = cpf,
                                            vehicleModel = vehicleModel,
                                            vehiclePlate = vehiclePlate,
                                            onSuccess = {
                                                // Trigger pin
                                                ApiService.requestDriverPin(
                                                    phone = phone,
                                                    email = email,
                                                    onSuccess = { codeSent, msg ->
                                                        isLoading = false
                                                        if (codeSent) {
                                                            authStep = 1
                                                            error = ""
                                                        } else {
                                                            error = msg
                                                        }
                                                    },
                                                    onError = {
                                                        isLoading = false
                                                        error = "Cadastro enviado, mas erro ao gerar PIN: ${it.message}"
                                                    }
                                                )
                                            },
                                            onError = {
                                                isLoading = false
                                                error = "Erro no credenciamento: ${it.message}"
                                            }
                                        )
                                    } else {
                                        // Simple auth PIN request with email
                                        ApiService.requestDriverPin(
                                            phone = phone,
                                            email = email,
                                            onSuccess = { codeSent, msg ->
                                                isLoading = false
                                                if (codeSent) {
                                                    authStep = 1
                                                    error = ""
                                                } else {
                                                    error = msg
                                                }
                                            },
                                            onError = {
                                                isLoading = false
                                                error = "Erro ao enviar PIN: ${it.message}"
                                            }
                                        )
                                    }
                                }
                                1 -> {
                                    if (pinCode.trim().isEmpty()) {
                                        error = "Código PIN é obrigatório."
                                        return@Button
                                    }
                                    isLoading = true
                                    ApiService.verifyDriverPin(
                                        phone = phone,
                                        pin = pinCode,
                                        onSuccess = { driverObj ->
                                            isLoading = false
                                            name = driverObj.name
                                            cpf = driverObj.cpf
                                            vehicleModel = driverObj.vehicle.model
                                            vehiclePlate = driverObj.vehicle.licensePlate
                                            authStep = 2
                                            error = ""
                                        },
                                        onError = {
                                            isLoading = false
                                            error = "PIN incorreto ou expirado: ${it.message}"
                                        }
                                    )
                                }
                                2 -> {
                                    if (password.trim().length < 6) {
                                        error = "A senha deve ter pelo menos 6 caracteres."
                                        return@Button
                                    }
                                    if (password != confirmPassword) {
                                        error = "As senhas não coincidem."
                                        return@Button
                                    }
                                    val res = SecurityUtils.registerDriverLocal(
                                        context, name, phone, cpf, vehicleModel, vehiclePlate, password
                                    )
                                    if (res.success) {
                                        onSuccess()
                                    } else {
                                        error = res.message ?: "Erro ao criar senha."
                                    }
                                }
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(24.dp))
                    } else {
                        Text(
                            text = when {
                                !isPinMode -> "Entrar com Senha"
                                authStep == 0 -> "Solicitar Código PIN por E-mail"
                                authStep == 1 -> "Confirmar PIN e Continuar"
                                else -> "Criar Senha e Entrar"
                            },
                            color = Color.Black,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (authStep == 0) {
                    TextButton(
                        onClick = {
                            isPinMode = !isPinMode
                            error = ""
                        }
                    ) {
                        Text(
                            text = if (isPinMode) "Entrar com Senha de Condutor" else "Primeiro Acesso / Login com PIN por E-mail",
                            color = EmeraldGreen
                        )
                    }

                    if (isPinMode) {
                        TextButton(
                            onClick = {
                                isLoginMode = !isLoginMode
                                error = ""
                            }
                        ) {
                            Text(
                                text = if (isLoginMode) "Não é credenciado? Registre-se!" else "Já é credenciado? Faça Login!",
                                color = EmeraldGreen
                            )
                        }
                    }
                } else {
                    TextButton(
                        onClick = {
                            authStep = 0
                            error = ""
                        }
                    ) {
                        Text("Voltar ao início", color = EmeraldGreen)
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                TextButton(onClick = onBack) {
                    Text("Voltar ao Menu Principal", color = Color.Gray)
                }
            }
        }
    }
}
