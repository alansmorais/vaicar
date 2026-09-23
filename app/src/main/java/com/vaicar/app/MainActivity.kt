package com.vaicar.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
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
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            VaiCarTheme {
                MainAppContainer()
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
fun MainAppContainer() {
    val context = LocalContext.current
    var currentScreen by remember { mutableStateOf(AppScreen.SPLASH) }
    var zones by remember { mutableStateOf<List<Zone>>(listOf()) }
    var metrics by remember { mutableStateOf<PlatformMetrics?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var loadError by remember { mutableStateOf(false) }

    fun loadPlatformMeta() {
        isLoading = true
        loadError = false
        ApiService.fetchMeta(
            onSuccess = { res ->
                zones = res.zones
                metrics = res.metrics
                isLoading = false
            },
            onError = {
                isLoading = false
                loadError = true
            }
        )
    }

    LaunchedEffect(Unit) {
        // Show Splash Screen for 2.5 seconds minimum
        delay(2500)
        loadPlatformMeta()
        currentScreen = AppScreen.ROLE_SELECTOR
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
                Text("Conectando ao banco de dados municipal...", color = TextSecondary, fontSize = 12.sp)
            } else if (error) {
                Text("Não foi possível conectar ao servidor real.", color = AccentRed, fontWeight = FontWeight.Bold)
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
                        description = "Conselho municipal: fiscalize alvarás, vistorias e métricas da plataforma",
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
    var isLoginMode by remember { mutableStateOf(false) } // false = SignUp, true = Login
    
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    
    var error by remember { mutableStateOf("") }
    
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
                    text = if (isLoginMode) "Login do Passageiro" else "Cadastro do Passageiro",
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = if (isLoginMode) "Entre com suas credenciais" else "Crie uma conta para viajar",
                    color = TextSecondary,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(24.dp))
            }
            
            if (!isLoginMode) {
                item {
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
            }
            
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
                    label = { Text("Senha (mínimo 6 caracteres)") },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            
            if (!isLoginMode) {
                item {
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
            
            item {
                if (error.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(error, color = AccentRed, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Button(
                    onClick = {
                        if (isLoginMode) {
                            if (phone.trim().isEmpty() || password.trim().isEmpty()) {
                                error = "Por favor preencha todos os campos."
                                return@Button
                            }
                            val res = SecurityUtils.loginPassenger(context, phone, password)
                            if (res.success) {
                                onSuccess()
                            } else {
                                error = res.message ?: "Erro ao efetuar login."
                            }
                        } else {
                            if (name.trim().isEmpty() || phone.trim().isEmpty() || password.trim().isEmpty()) {
                                error = "Por favor preencha todos os campos."
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
                                error = res.message ?: "Erro ao cadastrar."
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(if (isLoginMode) "Entrar" else "Cadastrar e Entrar", color = Color.Black, fontWeight = FontWeight.Bold)
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                TextButton(
                    onClick = { isLoginMode = !isLoginMode; error = "" }
                ) {
                    Text(
                        text = if (isLoginMode) "Não tem conta? Cadastre-se!" else "Já tem conta? Faça Login!",
                        color = EmeraldGreen
                    )
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
    var isLoginMode by remember { mutableStateOf(false) } // false = SignUp, true = Login
    
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var cpf by remember { mutableStateOf("") }
    var vehicleModel by remember { mutableStateOf("") }
    var vehiclePlate by remember { mutableStateOf("") }
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
                    text = if (isLoginMode) "Login do Motorista" else "Credenciamento de Motorista",
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = if (isLoginMode) "Entre no seu Cockpit" else "Preencha seus dados para homologação",
                    color = TextSecondary,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(24.dp))
            }

            if (!isLoginMode) {
                item {
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
            }

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
                    label = { Text("Senha (mínimo 6 caracteres)") },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedLabelColor = EmeraldGreen),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            if (!isLoginMode) {
                item {
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

            item {
                if (error.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(error, color = AccentRed, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        if (isLoginMode) {
                            if (phone.trim().isEmpty() || password.trim().isEmpty()) {
                                error = "Por favor preencha todos os campos."
                                return@Button
                            }
                            val res = SecurityUtils.loginDriverLocal(context, phone, password)
                            if (res.success) {
                                onSuccess()
                            } else {
                                error = res.message ?: "Erro ao efetuar login."
                            }
                        } else {
                            if (name.trim().isEmpty() || phone.trim().isEmpty() || cpf.trim().isEmpty() || vehicleModel.trim().isEmpty() || password.trim().isEmpty()) {
                                error = "Por favor preencha todos os campos obrigatórios."
                                return@Button
                            }
                            if (password != confirmPassword) {
                                error = "As senhas não coincidem."
                                return@Button
                            }
                            
                            isLoading = true
                            ApiService.registerDriver(
                                name = name,
                                phone = phone,
                                cpf = cpf,
                                vehicleModel = vehicleModel,
                                vehiclePlate = vehiclePlate,
                                onSuccess = {
                                    val res = SecurityUtils.registerDriverLocal(context, name, phone, cpf, vehicleModel, vehiclePlate, password)
                                    isLoading = false
                                    if (res.success) {
                                        onSuccess()
                                    } else {
                                        error = res.message ?: "Erro ao salvar cadastro local."
                                    }
                                },
                                onError = {
                                    isLoading = false
                                    error = "Erro de rede ao registrar motorista no servidor municipal. Verifique sua conexão."
                                }
                            )
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(24.dp))
                    } else {
                        Text(if (isLoginMode) "Entrar" else "Enviar Credenciamento", color = Color.Black, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                TextButton(
                    onClick = { isLoginMode = !isLoginMode; error = "" }
                ) {
                    Text(
                        text = if (isLoginMode) "Não tem credenciamento? Cadastre-se!" else "Já é credenciado? Faça Login!",
                        color = EmeraldGreen
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                TextButton(onClick = onBack) {
                    Text("Voltar ao Menu Principal", color = Color.Gray)
                }
            }
        }
    }
}
