package com.vaicar.app

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.draw.clip
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DriverScreen(zones: List<Zone>, onBack: () -> Unit) {
    val context = LocalContext.current
    val savedPhone = SecurityUtils.getDriverPhone(context)
    var registeredDriver by remember { mutableStateOf<Driver?>(null) }
    var onlineStatus by remember { mutableStateOf(false) }
    var activeRidesList by remember { mutableStateOf<List<Ride>>(listOf()) }
    var knownRideIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var isFetching by remember { mutableStateOf(true) }
    var message by remember { mutableStateOf("") }

    // Onboarding Form States
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var cpf by remember { mutableStateOf("") }
    var vehicleModel by remember { mutableStateOf("") }
    var vehiclePlate by remember { mutableStateOf("") }

    // Driver operation configs
    var minFare by remember { mutableStateOf("25.0") }
    var rateKm by remember { mutableStateOf("3.5") }
    var serveAllZones by remember { mutableStateOf(true) }
    var selectedZoneIds by remember { mutableStateOf<Set<String>>(emptySet()) }

    // Navigation and Profile / Verification / Map States
    var selectedTab by remember { mutableStateOf(0) }
    var showNativeMobilityMap by remember { mutableStateOf(false) }
    var isSavingProfile by remember { mutableStateOf(false) }
    var isUploadingDoc by remember { mutableStateOf<String?>(null) }
    var mobilityData by remember { mutableStateOf<MobilityMapData?>(null) }
    var isLoadingMobility by remember { mutableStateOf(false) }

    // Profile Edit States
    var profileName by remember { mutableStateOf("") }
    var profilePhone by remember { mutableStateOf("") }
    var profileEmail by remember { mutableStateOf("") }
    var profileAvatar by remember { mutableStateOf("") }
    var profileVehicleModel by remember { mutableStateOf("") }
    var profileVehicleColor by remember { mutableStateOf("") }
    var profileWhatsappDirect by remember { mutableStateOf("") }

    // Payment Confirmation States
    var completingRide by remember { mutableStateOf<Ride?>(null) }
    var completingPaymentReceived by remember { mutableStateOf(true) }
    var completingPaymentMethod by remember { mutableStateOf("PIX") }
    var completingReasonText by remember { mutableStateOf("") }
    var isSubmittingPayment by remember { mutableStateOf(false) }

    var quickConfirmRide by remember { mutableStateOf<Ride?>(null) }
    var quickConfirmMethod by remember { mutableStateOf("PIX") }

    fun refreshState() {
        ApiService.fetchDrivers(
            onSuccess = { drivers ->
                // Look up driver by their registered phone, or fall back to first available
                val drv = drivers.find {
                    (savedPhone.isNotEmpty() && (
                        it.phone == savedPhone ||
                        it.phone.replace("+", "").endsWith(savedPhone.replace("+", "")) ||
                        savedPhone.replace("+", "").endsWith(it.phone.replace("+", ""))
                    ))
                } ?: drivers.firstOrNull()

                registeredDriver = drv
                onlineStatus = drv?.isOnline ?: false
                if (drv != null) {
                    profileName = drv.name
                    profilePhone = drv.phone
                    profileEmail = drv.email ?: ""
                    profileAvatar = drv.avatarUrl ?: ""
                    profileVehicleModel = drv.vehicle?.model ?: ""
                    profileVehicleColor = drv.vehicle?.color ?: ""
                    profileWhatsappDirect = drv.whatsappDirectNumber ?: ""
                    SecurityUtils.setDriverId(context, drv.id)
                    SecurityUtils.setDriverName(context, drv.name)
                    SecurityUtils.setDriverOnline(context, drv.isOnline)
                    val fcmToken = SecurityUtils.getFcmToken(context)
                    if (fcmToken.isNotBlank()) {
                        ApiService.updateDriverFcmToken(
                            driverId = drv.id,
                            fcmToken = fcmToken,
                            onSuccess = { android.util.Log.i("DriverScreen", "Successfully uploaded FCM Token on driver load.") },
                            onError = { android.util.Log.e("DriverScreen", "Failed to upload FCM Token on driver load: ${it.message}") }
                        )
                    }
                    if (drv.isOnline) {
                        DriverBackgroundService.startService(context)
                    }
                }
                minFare = drv?.pricing?.minimumFare?.toString() ?: "25.0"
                rateKm = drv?.pricing?.ratePerKm?.toString() ?: "3.5"

                val drvZones = drv?.operatingZones ?: emptyList()
                val isAll = drvZones.isEmpty() || drvZones.contains("ALL") || (zones.isNotEmpty() && drvZones.size >= zones.size)
                serveAllZones = isAll
                selectedZoneIds = if (isAll) {
                    zones.map { it.id }.toSet()
                } else {
                    drvZones.toSet()
                }

                isFetching = false
            },
            onError = {
                isFetching = false
            }
        )
    }

    LaunchedEffect(Unit) {
        refreshState()
    }

    // Active Requests Polling Loop
    LaunchedEffect(registeredDriver) {
        if (registeredDriver != null) {
            while (true) {
                ApiService.fetchRides(
                    onSuccess = { rides ->
                        val currentDriverId = registeredDriver?.id
                        val currentDriverPhone = registeredDriver?.phone
                        val filtered = rides.filter { ride ->
                            val matchesDriver = (currentDriverId != null && (
                                ride.driverId == currentDriverId ||
                                ride.requestedDriverId == currentDriverId ||
                                ride.matchedDriverId == currentDriverId
                            )) || (currentDriverPhone != null && currentDriverPhone.isNotBlank() && (
                                ride.driverPhone == currentDriverPhone ||
                                ride.driverPhone?.replace("+", "") == currentDriverPhone.replace("+", "")
                            ))
                            matchesDriver && ride.status != "COMPLETED" && !ride.status.startsWith("CANCELLED")
                        }

                        // Trigger bell chimes sound and vibration when a new ride is requested
                        val newCalls = filtered.filter { ride ->
                            ride.status == "REQUESTED" && !knownRideIds.contains(ride.id)
                        }
                        if (newCalls.isNotEmpty()) {
                            SoundAlertHelper.triggerIncomingRideAlert(context)
                        }

                        knownRideIds = knownRideIds + filtered.map { it.id }
                        activeRidesList = filtered
                    },
                    onError = {}
                )
                kotlinx.coroutines.delay(3000)
            }
        }
    }

    LaunchedEffect(selectedTab) {
        if (selectedTab == 3) {
            isLoadingMobility = true
            ApiService.fetchMobilityMapData(
                onSuccess = {
                    mobilityData = it
                    isLoadingMobility = false
                },
                onError = {
                    isLoadingMobility = false
                }
            )
        }
    }

    if (showNativeMobilityMap) {
        DriverMobilityMapScreen(
            driver = registeredDriver,
            zones = zones,
            mobilityData = mobilityData,
            isLoading = isLoadingMobility,
            onRefresh = {
                isLoadingMobility = true
                ApiService.fetchMobilityMapData(
                    onSuccess = {
                        mobilityData = it
                        isLoadingMobility = false
                    },
                    onError = {
                        isLoadingMobility = false
                    }
                )
            },
            onBack = { showNativeMobilityMap = false }
        )
        return
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkSlate)
            .padding(16.dp)
    ) {
        if (isFetching) {
            CircularProgressIndicator(
                color = EmeraldGreen,
                modifier = Modifier.align(Alignment.Center)
            )
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Voltar", tint = EmeraldGreen)
                        }
                        Text(
                            text = "Cockpit do Motorista",
                            color = Color.White,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold
                        )
                        IconButton(onClick = {
                            SecurityUtils.logoutDriver(context)
                            onBack()
                        }) {
                            Icon(Icons.Default.ExitToApp, contentDescription = "Sair", tint = AccentRed)
                        }
                    }
                }

                val driver = registeredDriver
                if (driver == null) {
                    // Driver Onboarding Form (If not registered yet)
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Text(
                                    text = "Cadastro de Motorista Profissional",
                                    color = EmeraldGreen,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "Inscreva-se na plataforma VaiCar e receba chamadas diretas de passageiros com taxa zero!",
                                    color = TextSecondary,
                                    fontSize = 14.sp
                                )

                                OutlinedTextField(
                                    value = name,
                                    onValueChange = { name = it },
                                    label = { Text("Nome Completo") },
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White),
                                    modifier = Modifier.fillMaxWidth()
                                )

                                OutlinedTextField(
                                    value = phone,
                                    onValueChange = { phone = it },
                                    label = { Text("Telefone WhatsApp") },
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White),
                                    modifier = Modifier.fillMaxWidth()
                                )

                                OutlinedTextField(
                                    value = email,
                                    onValueChange = { email = it },
                                    label = { Text("E-mail (para receber o código PIN)") },
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White),
                                    modifier = Modifier.fillMaxWidth()
                                )

                                OutlinedTextField(
                                    value = cpf,
                                    onValueChange = { cpf = it },
                                    label = { Text("CPF") },
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White),
                                    modifier = Modifier.fillMaxWidth()
                                )

                                OutlinedTextField(
                                    value = vehicleModel,
                                    onValueChange = { vehicleModel = it },
                                    label = { Text("Modelo do Veículo") },
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White),
                                    modifier = Modifier.fillMaxWidth()
                                )

                                OutlinedTextField(
                                    value = vehiclePlate,
                                    onValueChange = { vehiclePlate = it },
                                    label = { Text("Placa") },
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White),
                                    modifier = Modifier.fillMaxWidth()
                                )

                                Button(
                                    onClick = {
                                        if (name.isNotEmpty() && phone.isNotEmpty() && email.isNotEmpty() && cpf.isNotEmpty() && vehicleModel.isNotEmpty()) {
                                            isFetching = true
                                            ApiService.registerDriver(
                                                name = name,
                                                phone = phone,
                                                email = email,
                                                cpf = cpf,
                                                vehicleModel = vehicleModel,
                                                vehiclePlate = vehiclePlate,
                                                onSuccess = {
                                                    registeredDriver = it
                                                    isFetching = false
                                                    message = "Cadastro concluído com sucesso!"
                                                },
                                                onError = {
                                                    isFetching = false
                                                    message = "Erro ao cadastrar motorista."
                                                }
                                            )
                                        } else {
                                            message = "Preencha todos os campos obrigatórios (incluindo e-mail para PIN)."
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Concluir Cadastro", color = Color.Black, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                } else {
                    item {
                        TabRow(
                            selectedTabIndex = selectedTab,
                            containerColor = SurfaceSlate,
                            contentColor = EmeraldGreen,
                            modifier = Modifier.clip(RoundedCornerShape(12.dp))
                        ) {
                            Tab(
                                selected = selectedTab == 0,
                                onClick = { selectedTab = 0 },
                                text = { Text("Corridas", fontWeight = FontWeight.Bold, fontSize = 11.sp) },
                                icon = { Icon(Icons.Default.DirectionsCar, contentDescription = null, modifier = Modifier.size(16.dp)) }
                            )
                            Tab(
                                selected = selectedTab == 1,
                                onClick = { selectedTab = 1 },
                                text = { Text("Documentos", fontWeight = FontWeight.Bold, fontSize = 11.sp) },
                                icon = { Icon(Icons.Default.Assignment, contentDescription = null, modifier = Modifier.size(16.dp)) }
                            )
                            Tab(
                                selected = selectedTab == 2,
                                onClick = { selectedTab = 2 },
                                text = { Text("Meu Perfil", fontWeight = FontWeight.Bold, fontSize = 11.sp) },
                                icon = { Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(16.dp)) }
                            )
                            Tab(
                                selected = selectedTab == 3,
                                onClick = { selectedTab = 3 },
                                text = { Text("Demanda", fontWeight = FontWeight.Bold, fontSize = 11.sp) },
                                icon = { Icon(Icons.Default.Place, contentDescription = null, modifier = Modifier.size(16.dp)) }
                            )
                        }
                    }

                    if (selectedTab == 0) {
                        // Online / Offline Switch Cockpit
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "Olá, ${driver.name} 👋",
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 18.sp
                                    )
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            modifier = Modifier
                                                .size(10.dp)
                                                .background(
                                                    if (onlineStatus) EmeraldGreen else Color.Gray,
                                                    shape = RoundedCornerShape(5.dp)
                                                )
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = if (onlineStatus) "Você está ONLINE" else "Você está OFFLINE",
                                            color = TextSecondary,
                                            fontSize = 14.sp
                                        )
                                    }
                                }

                                Switch(
                                    checked = onlineStatus,
                                    onCheckedChange = { status ->
                                        ApiService.updateDriverOnline(
                                            driverId = driver.id,
                                            isOnline = status,
                                            onSuccess = {
                                                onlineStatus = it.isOnline
                                                SecurityUtils.setDriverOnline(context, it.isOnline)
                                                SecurityUtils.setDriverId(context, driver.id)
                                                if (it.isOnline) {
                                                    DriverBackgroundService.startService(context)
                                                    message = "Você está Online! O radar em segundo plano acordará você com alarme e pop-up mesmo com o app fechado."
                                                } else {
                                                    DriverBackgroundService.stopService(context)
                                                    SoundAlertHelper.stopAlarm(context)
                                                    message = "Você saiu de serviço. Radar de segundo plano desativado."
                                                }
                                            },
                                            onError = { err ->
                                                message = err.message ?: "Erro ao atualizar status de serviço."
                                            }
                                        )
                                    },
                                    colors = SwitchDefaults.colors(checkedThumbColor = EmeraldGreen)
                                )
                            }

                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(1.dp)
                                    .background(Color.DarkGray.copy(alpha = 0.5f))
                            )

                            // Wake-Up Radar Banner (Background listening & screen wake-up)
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            Icons.Default.Alarm,
                                            contentDescription = "Radar Despertador",
                                            tint = if (onlineStatus) EmeraldGreen else Color.Gray,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = if (onlineStatus) "Radar Ativo (Acorda Motorista)" else "Radar Desligado (Offline)",
                                            color = Color.White,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }

                                    if (SoundAlertHelper.isAlarmPlaying()) {
                                        Button(
                                            onClick = { SoundAlertHelper.stopAlarm(context) },
                                            colors = ButtonDefaults.buttonColors(containerColor = Color.Red),
                                            shape = RoundedCornerShape(8.dp),
                                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                                        ) {
                                            Text("Silenciar", fontSize = 11.sp, color = Color.White)
                                        }
                                    }
                                }

                                Text(
                                    text = "Mesmo com o aplicativo fechado ou a tela desligada, o sistema acordará você com alarme sonoro alto contínuo, vibração e pop-up em tela cheia com botão para aceitar.",
                                    color = TextSecondary,
                                    fontSize = 11.sp,
                                    lineHeight = 15.sp
                                )

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    OutlinedButton(
                                        onClick = {
                                            // Test full-screen pop-up and loud wake-up alarm
                                            SoundAlertHelper.startLoudWakeUpAlarm(context)
                                            val testPopUpIntent = IncomingRideAlertActivity.createIntent(
                                                context = context,
                                                rideId = "test-preview-${System.currentTimeMillis()}",
                                                passengerName = "Marina Silveira (Simulação Alarme)",
                                                passengerPhone = "(12) 99887-1122",
                                                originAddress = "Av. Dr. Manoel Hipólito, 850 - Hotel Ilha, Centro",
                                                destAddress = "Rua das Palmeiras, 150 - Maresias",
                                                fare = 48.00,
                                                notes = "Teste do sistema de despertar e pop-up do motorista",
                                                driverId = driver.id
                                            )
                                            context.startActivity(testPopUpIntent)
                                        },
                                        shape = RoundedCornerShape(8.dp),
                                        colors = ButtonDefaults.outlinedButtonColors(contentColor = EmeraldGreen),
                                        modifier = Modifier.weight(1f),
                                        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 4.dp)
                                    ) {
                                        Text(
                                            text = "🔔 Testar Alarme & Pop-up",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }

                                    Button(
                                        onClick = {
                                            SoundAlertHelper.triggerIncomingRideAlert(context)
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155)),
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                                    ) {
                                        Text("Sino Curto", fontSize = 11.sp, color = Color.White)
                                    }
                                }
                            }
                        }
                    }

                    // Configuration Settings
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Text(
                                    text = "Suas Configurações de Tarifa",
                                    color = EmeraldGreen,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )

                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                    OutlinedTextField(
                                        value = minFare,
                                        onValueChange = { minFare = it },
                                        label = { Text("Corrida Mínima (R$)") },
                                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White),
                                        modifier = Modifier.weight(1f)
                                    )
                                    OutlinedTextField(
                                        value = rateKm,
                                        onValueChange = { rateKm = it },
                                        label = { Text("Taxa por KM (R$)") },
                                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = EmeraldGreen, focusedTextColor = Color.White, unfocusedTextColor = Color.White),
                                        modifier = Modifier.weight(1f)
                                    )
                                }

                                Button(
                                    onClick = {
                                        val min = minFare.toDoubleOrNull() ?: 15.0
                                        val km = rateKm.toDoubleOrNull() ?: 1.0
                                        ApiService.updateDriverPricing(
                                            driverId = driver.id,
                                            minFare = min,
                                            ratePerKm = km,
                                            onSuccess = {
                                                message = "Configurações de tarifa salvas com sucesso!"
                                            },
                                            onError = { err ->
                                                message = err.message ?: "Erro ao salvar tarifas."
                                            }
                                        )
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Salvar Tarifas", color = Color.Black, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    // Operating Zones Configuration
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Place, contentDescription = null, tint = EmeraldGreen, modifier = Modifier.size(20.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "Regiões de Atendimento",
                                            color = EmeraldGreen,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 16.sp
                                        )
                                    }
                                    Text(
                                        text = if (serveAllZones) "Todas (${zones.size})" else "${selectedZoneIds.size}/${zones.size}",
                                        color = TextSecondary,
                                        fontSize = 12.sp
                                    )
                                }

                                Text(
                                    text = "Defina os bairros onde você gostaria de atender chamados de passageiros:",
                                    color = Color.White.copy(alpha = 0.8f),
                                    fontSize = 13.sp
                                )

                                // Switch to serve all zones
                                Card(
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (serveAllZones) EmeraldGreen.copy(alpha = 0.15f) else DarkSlate
                                    ),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = "Atender Todas as Regiões (Padrão)",
                                                color = Color.White,
                                                fontWeight = FontWeight.SemiBold,
                                                fontSize = 14.sp
                                            )
                                            Text(
                                                text = "Receba corridas originadas em qualquer bairro",
                                                color = TextSecondary,
                                                fontSize = 11.sp
                                            )
                                        }
                                        Switch(
                                            checked = serveAllZones,
                                            onCheckedChange = { checked ->
                                                serveAllZones = checked
                                                if (checked) {
                                                    selectedZoneIds = zones.map { it.id }.toSet()
                                                }
                                            },
                                            colors = SwitchDefaults.colors(checkedThumbColor = EmeraldGreen)
                                        )
                                    }
                                }

                                // Granular Zone Selection when not serving all
                                if (!serveAllZones) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "Selecione as localizações:",
                                            color = Color.White,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Medium
                                        )
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            TextButton(
                                                onClick = { selectedZoneIds = zones.map { it.id }.toSet() },
                                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                                            ) {
                                                Text("Marcar Todas", color = EmeraldGreen, fontSize = 12.sp)
                                            }
                                            TextButton(
                                                onClick = { selectedZoneIds = emptySet() },
                                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                                            ) {
                                                Text("Limpar", color = Color.Gray, fontSize = 12.sp)
                                            }
                                        }
                                    }

                                    zones.chunked(2).forEach { rowZones ->
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            rowZones.forEach { zone ->
                                                val isSelected = selectedZoneIds.contains(zone.id)
                                                Card(
                                                    colors = CardDefaults.cardColors(
                                                        containerColor = if (isSelected) EmeraldGreen.copy(alpha = 0.2f) else DarkSlate
                                                    ),
                                                    shape = RoundedCornerShape(8.dp),
                                                    border = if (isSelected) BorderStroke(1.dp, EmeraldGreen) else null,
                                                    modifier = Modifier
                                                        .weight(1f)
                                                        .clickable {
                                                            selectedZoneIds = if (isSelected) {
                                                                selectedZoneIds - zone.id
                                                            } else {
                                                                selectedZoneIds + zone.id
                                                            }
                                                        }
                                                ) {
                                                    Row(
                                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Checkbox(
                                                            checked = isSelected,
                                                            onCheckedChange = { checked ->
                                                                selectedZoneIds = if (checked) {
                                                                    selectedZoneIds + zone.id
                                                                } else {
                                                                    selectedZoneIds - zone.id
                                                                }
                                                            },
                                                            colors = CheckboxDefaults.colors(
                                                                checkedColor = EmeraldGreen,
                                                                checkmarkColor = Color.Black
                                                            ),
                                                            modifier = Modifier.size(24.dp)
                                                        )
                                                        Spacer(modifier = Modifier.width(6.dp))
                                                        Text(
                                                            text = zone.name,
                                                            color = if (isSelected) Color.White else Color.Gray,
                                                            fontSize = 12.sp,
                                                            maxLines = 1
                                                        )
                                                    }
                                                }
                                            }
                                            if (rowZones.size == 1) {
                                                Spacer(modifier = Modifier.weight(1f))
                                            }
                                        }
                                    }
                                }

                                Button(
                                    onClick = {
                                        val finalZones = if (serveAllZones || (zones.isNotEmpty() && selectedZoneIds.size == zones.size)) {
                                            listOf("ALL")
                                        } else if (selectedZoneIds.isEmpty()) {
                                            listOf("z-centro")
                                        } else {
                                            selectedZoneIds.toList()
                                        }

                                        ApiService.updateDriverOperatingZones(
                                            driverId = driver.id,
                                            operatingZones = finalZones,
                                            onSuccess = {
                                                message = if (serveAllZones) {
                                                    "Configurado para atender Todas as Regiões!"
                                                } else {
                                                    "${finalZones.size} regiões de atendimento salvas com sucesso!"
                                                }
                                            },
                                            onError = { err ->
                                                message = err.message ?: "Erro ao salvar regiões de atendimento."
                                            }
                                        )
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Salvar Regiões de Atendimento", color = Color.Black, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    // Active Ride Requests
                    item {
                        Text(
                            text = "Solicitações de Corrida Ativas",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                    }

                    if (activeRidesList.isEmpty()) {
                        item {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = SurfaceSlate.copy(alpha = 0.5f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(32.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("Nenhuma chamada ativa no momento.", color = TextSecondary)
                                }
                            }
                        }
                    } else {
                        items(activeRidesList) { ride ->
                            val originZone = zones.find { it.id == ride.originZoneId }
                            val destZone = zones.find { it.id == ride.destinationZoneId }
                            val fareToDisplay = if (ride.fareBrl > 0) ride.fareBrl else ride.estimatedPrice

                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = if (ride.status == "REQUESTED") SurfaceSlate else SurfaceSlate.copy(alpha = 0.9f)
                                ),
                                shape = RoundedCornerShape(12.dp),
                                border = if (ride.status == "REQUESTED") BorderStroke(2.dp, EmeraldGreen) else null,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    // Status Badge & Price
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Badge(
                                            containerColor = when (ride.status) {
                                                "REQUESTED" -> EmeraldGreen
                                                "ACCEPTED" -> Color(0xFF3B82F6)
                                                else -> Color.Gray
                                            }
                                        ) {
                                            Text(
                                                text = when (ride.status) {
                                                    "REQUESTED" -> "NOVA SOLICITAÇÃO 🔔"
                                                    "ACCEPTED" -> "EM ANDAMENTO 🚗"
                                                    else -> ride.status
                                                },
                                                color = if (ride.status == "REQUESTED") Color.Black else Color.White,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 11.sp,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }

                                        Text(
                                            text = "R$ ${"%.2f".format(fareToDisplay)}",
                                            color = EmeraldGreen,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 20.sp
                                        )
                                    }

                                    // Passenger Info
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(
                                                text = ride.passengerName,
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 16.sp
                                            )
                                            Text(
                                                text = "Tel: ${ride.passengerPhone}",
                                                color = TextSecondary,
                                                fontSize = 13.sp
                                            )
                                        }

                                        if (ride.passengerPhone.isNotBlank()) {
                                            OutlinedButton(
                                                onClick = {
                                                    val cleanPhone = ride.passengerPhone.replace("[^0-9]".toRegex(), "")
                                                    val waUri = Uri.parse("https://wa.me/$cleanPhone?text=Ol%C3%A1%2C%20sou%20seu%20motorista%20do%20VaiCar!")
                                                    val waIntent = Intent(Intent.ACTION_VIEW, waUri)
                                                    context.startActivity(waIntent)
                                                },
                                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                                                colors = ButtonDefaults.outlinedButtonColors(contentColor = EmeraldGreen),
                                                border = BorderStroke(1.dp, EmeraldGreen)
                                            ) {
                                                Text("WhatsApp 💬", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                            }
                                        }
                                    }

                                    Divider(color = DarkSlate, thickness = 1.dp)

                                    // Route Details
                                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.Place, contentDescription = null, tint = EmeraldGreen, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                text = "Embarque: ${originZone?.name ?: ride.originAddress ?: "Origem"}",
                                                color = Color.White,
                                                fontSize = 13.sp
                                            )
                                        }
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                text = "Destino: ${destZone?.name ?: ride.destinationAddress ?: "Destino"}",
                                                color = Color.White,
                                                fontSize = 13.sp
                                            )
                                        }
                                    }

                                    if (ride.notes?.isNotEmpty() == true) {
                                        Text("Obs: ${ride.notes}", color = TextSecondary, fontSize = 12.sp)
                                    }

                                    // Google Maps GPS Navigation Button
                                    Button(
                                        onClick = {
                                            val targetAddress = if (ride.status == "REQUESTED" || ride.status == "ACCEPTED") {
                                                ride.originAddress
                                            } else {
                                                ride.destinationAddress
                                            }
                                            val navUri = if (!targetAddress.isNullOrBlank() && targetAddress != "Origem" && targetAddress != "Destino") {
                                                val cleanTarget = if (targetAddress.contains("São Sebastião", ignoreCase = true)) targetAddress else "$targetAddress, São Sebastião - SP"
                                                Uri.parse("https://www.google.com/maps/dir/?api=1&destination=${Uri.encode(cleanTarget)}&travelmode=driving")
                                            } else {
                                                val targetLat = if (ride.status == "REQUESTED" || ride.status == "ACCEPTED") {
                                                    ride.originLat ?: originZone?.lat ?: -23.8078
                                                } else {
                                                    ride.destinationLat ?: destZone?.lat ?: -23.8078
                                                }
                                                val targetLng = if (ride.status == "REQUESTED" || ride.status == "ACCEPTED") {
                                                    ride.originLng ?: originZone?.lng ?: -45.4058
                                                } else {
                                                    ride.destinationLng ?: destZone?.lng ?: -45.4058
                                                }
                                                Uri.parse("https://www.google.com/maps/dir/?api=1&destination=$targetLat,$targetLng&travelmode=driving")
                                            }
                                            val navIntent = Intent(Intent.ACTION_VIEW, navUri)
                                            context.startActivity(navIntent)
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                                        border = BorderStroke(1.dp, Color(0xFF38BDF8)),
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Icon(Icons.Default.Place, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = if (ride.status == "REQUESTED" || ride.status == "ACCEPTED") "Navegar até Embarque (Google Maps) 🗺" else "Navegar até Destino (Google Maps) 🏁",
                                            color = Color(0xFF38BDF8),
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 13.sp
                                        )
                                    }

                                    // Action Buttons
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        if (ride.status == "REQUESTED") {
                                            Button(
                                                onClick = {
                                                    ApiService.updateRideStatus(
                                                        rideId = ride.id,
                                                        status = "ACCEPTED",
                                                        driverId = registeredDriver?.id,
                                                        onSuccess = {
                                                            refreshState()
                                                            message = "Você aceitou a corrida de ${ride.passengerName}!"
                                                        },
                                                        onError = { err ->
                                                            message = err.message ?: "Erro ao aceitar corrida."
                                                        }
                                                    )
                                                },
                                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.weight(1.5f)
                                            ) {
                                                Text("Aceitar Corrida", color = Color.Black, fontWeight = FontWeight.Bold)
                                            }

                                            Button(
                                                onClick = {
                                                    ApiService.updateRideStatus(
                                                        rideId = ride.id,
                                                        status = "CANCELLED_BY_DRIVER",
                                                        driverId = registeredDriver?.id,
                                                        cancellationReason = "Recusado pelo motorista",
                                                        onSuccess = {
                                                            refreshState()
                                                            message = "Corrida recusada."
                                                        },
                                                        onError = { err ->
                                                            message = err.message ?: "Erro ao recusar corrida."
                                                        }
                                                    )
                                                },
                                                colors = ButtonDefaults.buttonColors(containerColor = AccentRed),
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Text("Recusar", color = Color.White, fontWeight = FontWeight.Medium)
                                            }
                                        } else if (ride.status == "ACCEPTED") {
                                            Button(
                                                onClick = {
                                                    ApiService.updateRideStatus(
                                                        rideId = ride.id,
                                                        status = "DRIVER_ARRIVING",
                                                        driverId = registeredDriver?.id,
                                                        onSuccess = {
                                                            refreshState()
                                                            message = "Você informou que chegou ao ponto de embarque!"
                                                        },
                                                        onError = { err ->
                                                            message = err.message ?: "Erro ao atualizar chegada."
                                                        }
                                                    )
                                                },
                                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF06B6D4)), // Cyan
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.weight(1.5f)
                                            ) {
                                                Text("Cheguei ao Ponto 📍", color = Color.Black, fontWeight = FontWeight.Bold)
                                            }

                                            Button(
                                                onClick = {
                                                    ApiService.updateRideStatus(
                                                        rideId = ride.id,
                                                        status = "CANCELLED_BY_DRIVER",
                                                        driverId = registeredDriver?.id,
                                                        cancellationReason = "Cancelado pelo motorista",
                                                        onSuccess = {
                                                            refreshState()
                                                            message = "Você cancelou a corrida."
                                                        },
                                                        onError = { err ->
                                                            message = err.message ?: "Erro ao cancelar corrida."
                                                        }
                                                    )
                                                },
                                                colors = ButtonDefaults.buttonColors(containerColor = AccentRed),
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Text("Cancelar", color = Color.White)
                                            }
                                        } else if (ride.status == "DRIVER_ARRIVING") {
                                            // Live waiting time counter
                                            var elapsedSeconds by remember { mutableStateOf(0L) }
                                            LaunchedEffect(ride.arrivedAt) {
                                                while (true) {
                                                    val parsedTime = try {
                                                        if (!ride.arrivedAt.isNullOrBlank()) {
                                                            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                                                                java.time.Instant.parse(ride.arrivedAt).toEpochMilli()
                                                            } else {
                                                                java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US).apply {
                                                                    timeZone = java.util.TimeZone.getTimeZone("UTC")
                                                                }.parse(ride.arrivedAt.substring(0, 19))?.time ?: System.currentTimeMillis()
                                                            }
                                                        } else {
                                                            System.currentTimeMillis()
                                                        }
                                                    } catch (e: Exception) {
                                                        System.currentTimeMillis()
                                                    }
                                                    elapsedSeconds = ((System.currentTimeMillis() - parsedTime) / 1000).coerceAtLeast(0)
                                                    kotlinx.coroutines.delay(1000)
                                                }
                                            }

                                            val elapsedMinutes = (elapsedSeconds / 60).toInt()
                                            val remSeconds = (elapsedSeconds % 60).toInt()
                                            val isFree = elapsedMinutes < 4
                                            val waitTimeText = "%02d:%02d".format(elapsedMinutes, remSeconds)
                                            val activeFee = if (isFree) 0.0 else (elapsedMinutes - 4) * 0.50

                                            Column(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                                Card(
                                                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E2E)),
                                                    border = BorderStroke(1.dp, if (isFree) EmeraldGreen else AccentRed),
                                                    modifier = Modifier.fillMaxWidth()
                                                ) {
                                                    Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                                        Text(
                                                            text = if (isFree) "Tolerância Grátis de Espera ⏳" else "Tempo Adicional Excedido 🕒",
                                                            color = if (isFree) EmeraldGreen else AccentRed,
                                                            fontWeight = FontWeight.Bold,
                                                            fontSize = 13.sp
                                                        )
                                                        Text(
                                                            text = waitTimeText,
                                                            color = Color.White,
                                                            fontWeight = FontWeight.Black,
                                                            fontSize = 24.sp
                                                        )
                                                        Text(
                                                            text = if (isFree) "4 min gratuitos inclusos na chamada" else "Taxa de espera: R$ ${"%.2f".format(activeFee)} (R$ 0,50/min)",
                                                            color = TextSecondary,
                                                            fontSize = 11.sp
                                                        )
                                                    }
                                                }

                                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                    Button(
                                                        onClick = {
                                                            ApiService.updateRideStatus(
                                                                rideId = ride.id,
                                                                status = "IN_PROGRESS",
                                                                driverId = registeredDriver?.id,
                                                                onSuccess = {
                                                                    refreshState()
                                                                    message = "Viagem Iniciada! Boa corrida!"
                                                                },
                                                                onError = { err ->
                                                                    message = err.message ?: "Erro ao iniciar viagem."
                                                                }
                                                            )
                                                        },
                                                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                                        shape = RoundedCornerShape(8.dp),
                                                        modifier = Modifier.weight(1.5f)
                                                    ) {
                                                        Text("Iniciar Viagem 🚀", color = Color.Black, fontWeight = FontWeight.Bold)
                                                    }

                                                    Button(
                                                        onClick = {
                                                            ApiService.updateRideStatus(
                                                                rideId = ride.id,
                                                                status = "CANCELLED_BY_DRIVER",
                                                                driverId = registeredDriver?.id,
                                                                cancellationReason = "Cancelado pelo motorista por não comparecimento",
                                                                onSuccess = {
                                                                    refreshState()
                                                                    message = "Você cancelou a corrida."
                                                                },
                                                                onError = { err ->
                                                                    message = err.message ?: "Erro ao cancelar corrida."
                                                                }
                                                            )
                                                        },
                                                        colors = ButtonDefaults.buttonColors(containerColor = AccentRed),
                                                        shape = RoundedCornerShape(8.dp),
                                                        modifier = Modifier.weight(1f)
                                                    ) {
                                                        Text("Cancelar", color = Color.White)
                                                    }
                                                }
                                            }
                                        } else if (ride.status == "IN_PROGRESS") {
                                            Button(
                                                onClick = {
                                                    completingRide = ride
                                                    completingPaymentReceived = true
                                                    completingPaymentMethod = ride.paymentMethod ?: "PIX"
                                                    completingReasonText = ""
                                                },
                                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.weight(1.5f)
                                            ) {
                                                Text("Finalizar e Confirmar Pagamento ✔", color = Color.Black, fontWeight = FontWeight.Bold)
                                            }

                                            Button(
                                                onClick = {
                                                    ApiService.updateRideStatus(
                                                        rideId = ride.id,
                                                        status = "CANCELLED_BY_DRIVER",
                                                        driverId = registeredDriver?.id,
                                                        cancellationReason = "Cancelado pelo motorista em andamento",
                                                        onSuccess = {
                                                            refreshState()
                                                            message = "Você cancelou a corrida."
                                                        },
                                                        onError = { err ->
                                                            message = err.message ?: "Erro ao cancelar corrida."
                                                        }
                                                    )
                                                },
                                                colors = ButtonDefaults.buttonColors(containerColor = AccentRed),
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Text("Cancelar", color = Color.White)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    }

                    // ==========================================
                    // TAB 1: DOCUMENTOS (DRIVER DOCUMENT VERIFICATION)
                    // ==========================================
                    if (selectedTab == 1) {
                        // Regulatory Status Overview
                        item {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text("Auditoria Regulatória", color = EmeraldGreen, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                        val (statusText, statusBg, statusFg) = when (driver.regulatoryStatus) {
                                            "APPROVED" -> Triple("REGULAR / APROVADO", Color(0xFF065F46), Color(0xFFA7F3D0))
                                            "IN_REVIEW" -> Triple("EM AUDITORIA", Color(0xFF1E3A8A), Color(0xFFBFDBFE))
                                            "BLOCKED" -> Triple("BLOQUEADO", Color(0xFF991B1B), Color(0xFFFECACA))
                                            else -> Triple("PENDENTE", Color(0xFF92400E), Color(0xFFFDE68A))
                                        }
                                        Badge(containerColor = statusBg) {
                                            Text(statusText, color = statusFg, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                    }
                                    Text(
                                        "Conforme a legislação de São Sebastião, todos os motoristas parceiros devem manter sua documentação regularizada para operar na plataforma.",
                                        color = TextSecondary,
                                        fontSize = 12.sp
                                    )
                                    Text(
                                        "Nota de Segurança: Os documentos verificados não podem ser alterados diretamente no perfil do motorista para preservar a integridade regulatória.",
                                        color = Color(0xFF94A3B8),
                                        fontSize = 11.sp
                                    )
                                }
                            }
                        }

                        item {
                            Text("Documentos Obrigatórios do Motorista:", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        }

                        val docSpecs = listOf(
                            Triple("req-cnh-frente", "CNH - Frente (com Foto)", "Foto nítida e legível da frente aberta da Carteira Nacional de Habilitação."),
                            Triple("req-cnh-verso", "CNH - Verso (com EAR)", "Verso com QR Code e observação 'Exerce Atividade Remunerada (EAR)'."),
                            Triple("req-crlv", "CRLV - Documento do Veículo", "Certificado de Registro e Licenciamento do Veículo do exercício vigente."),
                            Triple("req-seguro-app", "Seguro APP de Passageiros", "Apólice ou comprovante do Seguro de Acidentes Pessoais a Passageiros."),
                            Triple("req-selfie-cnh", "Selfie com a CNH", "Foto do motorista segurando a CNH ao lado do rosto em ambiente claro."),
                            Triple("req-alvara", "Alvará Municipal de Transporte", "Inscrição ou alvará emitido pela Prefeitura de São Sebastião.")
                        )

                        items(docSpecs) { (specId, specTitle, specDesc) ->
                            val existingDoc = driver.documents.find { it.requirementId == specId }
                            Card(
                                colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(specTitle, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        val (docStatusText, docStatusBg, docStatusFg) = when (existingDoc?.status) {
                                            "APPROVED" -> Triple("Aprovado ✓", Color(0xFF065F46), Color(0xFFA7F3D0))
                                            "IN_REVIEW" -> Triple("Em análise ⏳", Color(0xFF1E3A8A), Color(0xFFBFDBFE))
                                            "REJECTED" -> Triple("Rejeitado ✕", Color(0xFF991B1B), Color(0xFFFECACA))
                                            else -> Triple("Pendente ⚠️", Color(0xFF92400E), Color(0xFFFDE68A))
                                        }
                                        Badge(containerColor = docStatusBg) {
                                            Text(docStatusText, color = docStatusFg, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                    }
                                    Text(specDesc, color = TextSecondary, fontSize = 12.sp)

                                    if (existingDoc?.status == "REJECTED" && !existingDoc.rejectionReason.isNullOrBlank()) {
                                        Card(
                                            colors = CardDefaults.cardColors(containerColor = Color(0xFF450A0A)),
                                            border = BorderStroke(1.dp, Color(0xFFDC2626)),
                                            shape = RoundedCornerShape(8.dp),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Text(
                                                "Motivo da rejeição: ${existingDoc.rejectionReason}",
                                                color = Color(0xFFFECACA),
                                                fontSize = 11.sp,
                                                modifier = Modifier.padding(8.dp)
                                            )
                                        }
                                    }

                                    val isUploadingThis = isUploadingDoc == specId
                                    Button(
                                        onClick = {
                                            isUploadingDoc = specId
                                            // Submit official document image payload
                                            val mockPayload = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80"
                                            ApiService.submitDriverDocument(
                                                driverId = driver.id,
                                                requirementId = specId,
                                                fileUrl = mockPayload,
                                                documentNumber = "DOC-${(100000..999999).random()}",
                                                expiryDate = "2028-12-31",
                                                onSuccess = {
                                                    isUploadingDoc = null
                                                    refreshState()
                                                    message = "Documento '$specTitle' enviado com sucesso para verificação!"
                                                },
                                                onError = { err ->
                                                    isUploadingDoc = null
                                                    message = err.message ?: "Erro ao enviar documento."
                                                }
                                            )
                                        },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (existingDoc == null) EmeraldGreen else Color(0xFF1E293B)
                                        ),
                                        border = if (existingDoc != null) BorderStroke(1.dp, EmeraldGreen) else null,
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        if (isUploadingThis) {
                                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                                        } else {
                                            val btnLabel = when (existingDoc?.status) {
                                                "APPROVED" -> "Atualizar Documento Aprovado"
                                                "REJECTED" -> "Reenviar Documento Corrigido 🔄"
                                                "IN_REVIEW" -> "Substituir Documento em Análise"
                                                else -> "Enviar Foto / Documento 📤"
                                            }
                                            Text(
                                                btnLabel,
                                                color = if (existingDoc == null) Color.Black else EmeraldGreen,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 12.sp
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ==========================================
                    // TAB 2: MEU PERFIL (COMPLETE DRIVER PROFILE)
                    // ==========================================
                    if (selectedTab == 2) {
                        item {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(14.dp)
                                ) {
                                    Text("Gerenciamento de Perfil do Motorista", color = EmeraldGreen, fontWeight = FontWeight.Bold, fontSize = 16.sp)

                                    // Profile Photo & Preset Options
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(64.dp)
                                                .clip(CircleShape)
                                                .background(EmeraldGreen.copy(alpha = 0.2f)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(Icons.Default.Person, contentDescription = null, tint = EmeraldGreen, modifier = Modifier.size(36.dp))
                                        }
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text("Foto do Perfil Profissional", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                            Text("Exibida para os passageiros ao aceitar uma chamada.", color = TextSecondary, fontSize = 11.sp)
                                        }
                                    }

                                    // Preset Avatars Selection
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        listOf(
                                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
                                            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
                                            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80"
                                        ).forEachIndexed { idx, url ->
                                            val isSelected = profileAvatar == url
                                            Button(
                                                onClick = { profileAvatar = url },
                                                colors = ButtonDefaults.buttonColors(
                                                    containerColor = if (isSelected) EmeraldGreen else DarkSlate
                                                ),
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Text(
                                                    "Avatar ${idx + 1}",
                                                    color = if (isSelected) Color.Black else Color.White,
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                        }
                                    }

                                    // Full Name Input
                                    OutlinedTextField(
                                        value = profileName,
                                        onValueChange = { profileName = it },
                                        label = { Text("Nome Completo *") },
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = EmeraldGreen,
                                            focusedLabelColor = EmeraldGreen,
                                            unfocusedLabelColor = TextSecondary,
                                            unfocusedTextColor = Color.White,
                                            focusedTextColor = Color.White
                                        ),
                                        modifier = Modifier.fillMaxWidth()
                                    )

                                    // Phone Input
                                    OutlinedTextField(
                                        value = profilePhone,
                                        onValueChange = { profilePhone = it },
                                        label = { Text("Telefone / WhatsApp *") },
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = EmeraldGreen,
                                            focusedLabelColor = EmeraldGreen,
                                            unfocusedLabelColor = TextSecondary,
                                            unfocusedTextColor = Color.White,
                                            focusedTextColor = Color.White
                                        ),
                                        modifier = Modifier.fillMaxWidth()
                                    )

                                    // Email Input
                                    OutlinedTextField(
                                        value = profileEmail,
                                        onValueChange = { profileEmail = it },
                                        label = { Text("E-mail Cadastrado") },
                                        placeholder = { Text("motorista@vaicar.com.br", color = TextSecondary.copy(alpha = 0.5f)) },
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = EmeraldGreen,
                                            focusedLabelColor = EmeraldGreen,
                                            unfocusedLabelColor = TextSecondary,
                                            unfocusedTextColor = Color.White,
                                            focusedTextColor = Color.White
                                        ),
                                        modifier = Modifier.fillMaxWidth()
                                    )

                                    // WhatsApp Direct Contact Number
                                    OutlinedTextField(
                                        value = profileWhatsappDirect,
                                        onValueChange = { profileWhatsappDirect = it },
                                        label = { Text("Número Direto WhatsApp") },
                                        placeholder = { Text("+5512999999999", color = TextSecondary.copy(alpha = 0.5f)) },
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = EmeraldGreen,
                                            focusedLabelColor = EmeraldGreen,
                                            unfocusedLabelColor = TextSecondary,
                                            unfocusedTextColor = Color.White,
                                            focusedTextColor = Color.White
                                        ),
                                        modifier = Modifier.fillMaxWidth()
                                    )

                                    // Vehicle Model & Color
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedTextField(
                                            value = profileVehicleModel,
                                            onValueChange = { profileVehicleModel = it },
                                            label = { Text("Modelo do Carro") },
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedBorderColor = EmeraldGreen,
                                                focusedLabelColor = EmeraldGreen,
                                                unfocusedLabelColor = TextSecondary,
                                                unfocusedTextColor = Color.White,
                                                focusedTextColor = Color.White
                                            ),
                                            modifier = Modifier.weight(1.5f)
                                        )
                                        OutlinedTextField(
                                            value = profileVehicleColor,
                                            onValueChange = { profileVehicleColor = it },
                                            label = { Text("Cor") },
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedBorderColor = EmeraldGreen,
                                                focusedLabelColor = EmeraldGreen,
                                                unfocusedLabelColor = TextSecondary,
                                                unfocusedTextColor = Color.White,
                                                focusedTextColor = Color.White
                                            ),
                                            modifier = Modifier.weight(1f)
                                        )
                                    }

                                    // Regulatory Protection Notice
                                    Card(
                                        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                                        border = BorderStroke(1.dp, Color(0xFF334155)),
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(10.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Icon(Icons.Default.Lock, contentDescription = null, tint = EmeraldGreen, modifier = Modifier.size(18.dp))
                                            Text(
                                                "Placa registrada: ${driver.vehicle?.licensePlate ?: "—"}. A placa e documentos fiscais são bloqueados para edição comum por conformidade legal.",
                                                color = TextSecondary,
                                                fontSize = 11.sp
                                            )
                                        }
                                    }

                                    // Save & Cancel Actions
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Button(
                                            onClick = {
                                                if (profileName.isBlank() || profilePhone.isBlank()) {
                                                    message = "Nome e telefone são campos obrigatórios."
                                                    return@Button
                                                }

                                                val digits = profilePhone.replace("\\D".toRegex(), "")
                                                if (digits.length < 10) {
                                                    message = "Telefone inválido. Informe o DDD e o número completo."
                                                    return@Button
                                                }

                                                if (profileEmail.isNotBlank() && !profileEmail.contains("@")) {
                                                    message = "Formato de e-mail inválido."
                                                    return@Button
                                                }

                                                isSavingProfile = true
                                                val updates = mutableMapOf<String, Any>(
                                                    "name" to profileName.trim(),
                                                    "phone" to profilePhone.trim(),
                                                    "email" to profileEmail.trim(),
                                                    "avatarUrl" to profileAvatar,
                                                    "whatsappDirectNumber" to profileWhatsappDirect.trim()
                                                )

                                                if (profileVehicleModel.isNotBlank()) {
                                                    updates["vehicle"] = mapOf(
                                                        "model" to profileVehicleModel.trim(),
                                                        "color" to profileVehicleColor.trim()
                                                    )
                                                }

                                                ApiService.updateDriverProfile(
                                                    driverId = driver.id,
                                                    updates = updates,
                                                    onSuccess = { updated ->
                                                        isSavingProfile = false
                                                        registeredDriver = updated
                                                        SecurityUtils.setDriverName(context, updated.name)
                                                        message = "Perfil atualizado com sucesso no VaiCar!"
                                                    },
                                                    onError = { err ->
                                                        isSavingProfile = false
                                                        message = err.message ?: "Erro ao salvar perfil."
                                                    }
                                                )
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                            shape = RoundedCornerShape(8.dp),
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            if (isSavingProfile) {
                                                CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(18.dp))
                                            } else {
                                                Text("Salvar Alterações", color = Color.Black, fontWeight = FontWeight.Bold)
                                            }
                                        }

                                        OutlinedButton(
                                            onClick = {
                                                profileName = driver.name
                                                profilePhone = driver.phone
                                                profileEmail = driver.email ?: ""
                                                profileAvatar = driver.avatarUrl ?: ""
                                                profileVehicleModel = driver.vehicle?.model ?: ""
                                                profileVehicleColor = driver.vehicle?.color ?: ""
                                                profileWhatsappDirect = driver.whatsappDirectNumber ?: ""
                                                message = "Alterações descartadas."
                                            },
                                            border = BorderStroke(1.dp, TextSecondary),
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Text("Cancelar", color = TextSecondary)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ==========================================
                    // TAB 3: DEMANDA (MOBILITY MAP)
                    // ==========================================
                    if (selectedTab == 3) {
                        item {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text("Mapa de Demanda em Tempo Real", color = EmeraldGreen, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                        Text("São Sebastião - SP", color = TextSecondary, fontSize = 12.sp)
                                    }
                                    Text(
                                        "Visualize as regiões de maior demanda, multiplicadores de tarifa dinâmica e tempo de resposta para otimizar seus ganhos.",
                                        color = Color.White.copy(alpha = 0.8f),
                                        fontSize = 12.sp
                                    )

                                    Button(
                                        onClick = {
                                            showNativeMobilityMap = true
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Icon(Icons.Default.Navigation, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Abrir Mapa de Mobilidade Interativo", color = Color.Black, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }

                        item {
                            Text("Zonas de Atendimento e Demanda Atual:", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }

                        if (isLoadingMobility) {
                            item {
                                Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator(color = EmeraldGreen)
                                }
                            }
                        } else {
                            val demands = mobilityData?.zoneDemand ?: emptyList()
                            if (demands.isEmpty()) {
                                items(zones) { z ->
                                    Card(
                                        colors = CardDefaults.cardColors(containerColor = SurfaceSlate.copy(alpha = 0.6f)),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(14.dp).fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column {
                                                Text(z.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                                Text("${z.distanceFromCenterKm} km do Centro", color = TextSecondary, fontSize = 11.sp)
                                            }
                                            Text("Demanda Normal", color = EmeraldGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            } else {
                                items(demands) { demand ->
                                    Card(
                                        colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(14.dp).fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Text(demand.zoneName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                                    if (demand.isSurgeActive) {
                                                        Spacer(modifier = Modifier.width(6.dp))
                                                        Badge(containerColor = Color(0xFFF59E0B)) {
                                                            Text("⚡ ${demand.multiplier}x", color = Color.Black, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                                        }
                                                    }
                                                }
                                                Text(
                                                    "${demand.onlineDrivers} motorista(s) ativo(s) • Tempo estimado: ~${demand.estimatedPickupMin} min",
                                                    color = TextSecondary,
                                                    fontSize = 11.sp
                                                )
                                            }
                                            Badge(
                                                containerColor = if (demand.isSurgeActive) Color(0xFF78350F) else Color(0xFF065F46)
                                            ) {
                                                Text(
                                                    if (demand.isSurgeActive) "Alta Demanda" else "Normal",
                                                    color = if (demand.isSurgeActive) Color(0xFFFDE68A) else Color(0xFFA7F3D0),
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // =========================================================================
        // DRIVER PAYMENT CONFIRMATION DIALOG (ON RIDE COMPLETION)
        // =========================================================================
        completingRide?.let { ride ->
            val ridePrice = if (ride.fareBrl > 0) ride.fareBrl else ride.estimatedPrice
            AlertDialog(
                onDismissRequest = {
                    if (!isSubmittingPayment) completingRide = null
                },
                containerColor = SurfaceSlate,
                title = {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = "Pagamento da corrida",
                            color = EmeraldGreen,
                            fontWeight = FontWeight.Black,
                            fontSize = 18.sp
                        )
                        Text(
                            text = "Valor: R$ ${"%.2f".format(ridePrice)}",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                    }
                },
                text = {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = "Você recebeu este pagamento do passageiro ${ride.passengerName}?",
                            color = Color.White,
                            fontSize = 14.sp
                        )

                        // Choice Buttons: RECEBIDO vs NÃO RECEBIDO
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = { completingPaymentReceived = true },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (completingPaymentReceived) EmeraldGreen else Color(0xFF1E293B)
                                ),
                                border = if (!completingPaymentReceived) BorderStroke(1.dp, Color(0xFF334155)) else null,
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(
                                    "PAGAMENTO RECEBIDO",
                                    color = if (completingPaymentReceived) Color.Black else Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            Button(
                                onClick = { completingPaymentReceived = false },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (!completingPaymentReceived) AccentRed else Color(0xFF1E293B)
                                ),
                                border = if (completingPaymentReceived) BorderStroke(1.dp, Color(0xFF334155)) else null,
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(
                                    "NÃO RECEBIDO",
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        if (completingPaymentReceived) {
                            Text(
                                text = "Selecione o meio de pagamento utilizado:",
                                color = TextSecondary,
                                fontSize = 12.sp
                            )
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                val methods = listOf("PIX" to "Pix", "CASH" to "Dinheiro", "CARD_TERMINAL" to "Maquininha")
                                methods.forEach { (code, label) ->
                                    val isSel = completingPaymentMethod == code
                                    Button(
                                        onClick = { completingPaymentMethod = code },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (isSel) Color(0xFF065F46) else Color(0xFF0F172A)
                                        ),
                                        border = BorderStroke(1.dp, if (isSel) EmeraldGreen else Color(0xFF334155)),
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.weight(1f),
                                        contentPadding = PaddingValues(horizontal = 4.dp, vertical = 6.dp)
                                    ) {
                                        Text(
                                            label,
                                            color = if (isSel) EmeraldGreen else TextSecondary,
                                            fontSize = 11.sp,
                                            fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal
                                        )
                                    }
                                }
                            }
                        } else {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF450A0A)),
                                border = BorderStroke(1.dp, AccentRed),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text(
                                        text = "A corrida será registrada com status de débito pendente (PAYMENT_PENDING). O passageiro ficará bloqueado para novas corridas até a quitação.",
                                        color = Color(0xFFFECACA),
                                        fontSize = 11.sp
                                    )
                                    OutlinedTextField(
                                        value = completingReasonText,
                                        onValueChange = { completingReasonText = it },
                                        placeholder = { Text("Motivo / observação (opcional)", color = TextSecondary, fontSize = 12.sp) },
                                        modifier = Modifier.fillMaxWidth(),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = AccentRed,
                                            unfocusedBorderColor = Color(0xFF7F1D1D),
                                            focusedTextColor = Color.White,
                                            unfocusedTextColor = Color.White
                                        )
                                    )
                                }
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            isSubmittingPayment = true
                            val finalMethod = if (completingPaymentReceived) completingPaymentMethod else null
                            val finalPendingReason = if (!completingPaymentReceived) {
                                if (completingReasonText.isNotBlank()) completingReasonText.trim() else "Pagamento não recebido pelo motorista ao término da corrida"
                            } else null

                            ApiService.updateRideStatus(
                                rideId = ride.id,
                                status = "COMPLETED",
                                driverId = registeredDriver?.id,
                                paymentReceived = completingPaymentReceived,
                                paymentStatus = if (completingPaymentReceived) "PAID" else "PAYMENT_PENDING",
                                paymentMethod = finalMethod,
                                paymentPendingReason = finalPendingReason,
                                onSuccess = {
                                    isSubmittingPayment = false
                                    completingRide = null
                                    refreshState()
                                    message = if (completingPaymentReceived) {
                                        "Corrida finalizada e pagamento confirmado com sucesso! Parabéns!"
                                    } else {
                                        "Corrida finalizada. Débito pendente registrado no sistema."
                                    }
                                },
                                onError = { err ->
                                    isSubmittingPayment = false
                                    message = err.message ?: "Erro ao processar finalização da corrida."
                                }
                            )
                        },
                        enabled = !isSubmittingPayment,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (completingPaymentReceived) EmeraldGreen else AccentRed
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        if (isSubmittingPayment) {
                            CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(16.dp))
                        } else {
                            Text(
                                text = if (completingPaymentReceived) "Confirmar e Finalizar ✔" else "Registrar Débito Pendente ⚠️",
                                color = if (completingPaymentReceived) Color.Black else Color.White,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                },
                dismissButton = {
                    TextButton(
                        onClick = { completingRide = null },
                        enabled = !isSubmittingPayment
                    ) {
                        Text("Voltar", color = TextSecondary)
                    }
                }
            )
        }

        // =========================================================================
        // QUICK CONFIRM DIALOG FOR PREVIOUS UNPAID RIDES
        // =========================================================================
        quickConfirmRide?.let { ride ->
            AlertDialog(
                onDismissRequest = { quickConfirmRide = null },
                containerColor = SurfaceSlate,
                title = {
                    Text("Confirmar Recebimento de Débito", color = EmeraldGreen, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Passageiro: ${ride.passengerName}", color = Color.White, fontWeight = FontWeight.Bold)
                        Text("Valor: R$ ${"%.2f".format(if (ride.fareBrl > 0) ride.fareBrl else ride.estimatedPrice)}", color = EmeraldGreen, fontWeight = FontWeight.Bold)
                        Text("Selecione como recebeu este valor:", color = TextSecondary, fontSize = 12.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                            val methods = listOf("PIX" to "Pix", "CASH" to "Dinheiro", "CARD_TERMINAL" to "Cartão")
                            methods.forEach { (code, label) ->
                                val isSel = quickConfirmMethod == code
                                Button(
                                    onClick = { quickConfirmMethod = code },
                                    colors = ButtonDefaults.buttonColors(containerColor = if (isSel) EmeraldGreen else Color(0xFF0F172A)),
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text(label, color = if (isSel) Color.Black else Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            ApiService.confirmRidePayment(
                                rideId = ride.id,
                                paymentMethod = quickConfirmMethod,
                                driverId = registeredDriver?.id,
                                onSuccess = {
                                    quickConfirmRide = null
                                    refreshState()
                                    message = "Pagamento baixado com sucesso! O passageiro foi desbloqueado."
                                },
                                onError = { err ->
                                    message = err.message ?: "Erro ao confirmar pagamento."
                                }
                            )
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Confirmar Baixa", color = Color.Black, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { quickConfirmRide = null }) {
                        Text("Cancelar", color = TextSecondary)
                    }
                }
            )
        }

        if (message.isNotEmpty()) {
            Snackbar(
                action = {
                    TextButton(onClick = { message = "" }) {
                        Text("OK", color = EmeraldGreen)
                    }
                },
                containerColor = SurfaceSlate,
                contentColor = Color.White,
                modifier = Modifier.align(Alignment.BottomCenter)
            ) {
                Text(message)
            }
        }
    }
}
