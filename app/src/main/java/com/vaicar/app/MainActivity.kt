package com.vaicar.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
    PASSENGER,
    DRIVER,
    ADMIN,
    DEVELOPER
}

@OptIn(ExperimentalAnimationApi::class)
@Composable
fun MainAppContainer() {
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
            AppScreen.PASSENGER -> PassengerScreen(
                zones = zones,
                onBack = { currentScreen = AppScreen.ROLE_SELECTOR }
            )
            AppScreen.DRIVER -> DriverScreen(
                zones = zones,
                onBack = { currentScreen = AppScreen.ROLE_SELECTOR }
            )
            AppScreen.ADMIN -> AdminScreen(
                metrics = metrics ?: PlatformMetrics(0, 0, 0, 0, 0, 0, 0.0, 0, 0, 0, 0),
                onBack = { currentScreen = AppScreen.ROLE_SELECTOR }
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
                TextButton(onClick = { onSelectRole(AppScreen.DEVELOPER) }) {
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
                        onClick = { onSelectRole(AppScreen.PASSENGER) }
                    )

                    RoleCard(
                        title = "Cockpit do Motorista",
                        description = "Trabalhe de forma autônoma com taxa zero sobre suas corridas",
                        icon = Icons.Default.DriveEta,
                        iconColor = EmeraldGreen,
                        onClick = { onSelectRole(AppScreen.DRIVER) }
                    )

                    RoleCard(
                        title = "Gestão Pública (Admin)",
                        description = "Conselho municipal: fiscalize alvarás, vistorias e metrics da plataforma",
                        icon = Icons.Default.AdminPanelSettings,
                        iconColor = EmeraldGreen,
                        onClick = { onSelectRole(AppScreen.ADMIN) }
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = { onSelectRole(AppScreen.DEVELOPER) }) {
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
