package com.vaicar.app

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
    var isFetching by remember { mutableStateOf(true) }
    var message by remember { mutableStateOf("") }

    // Onboarding Form States
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var cpf by remember { mutableStateOf("") }
    var vehicleModel by remember { mutableStateOf("") }
    var vehiclePlate by remember { mutableStateOf("") }

    // Driver operation configs
    var minFare by remember { mutableStateOf("25.0") }
    var rateKm by remember { mutableStateOf("3.5") }
    var serveAllZones by remember { mutableStateOf(true) }
    var selectedZoneIds by remember { mutableStateOf<Set<String>>(emptySet()) }

    fun refreshState() {
        ApiService.fetchDrivers(
            onSuccess = { drivers ->
                // Look up driver by their registered phone, or fall back to first available
                val drv = drivers.find { it.phone == savedPhone } ?: drivers.firstOrNull()
                registeredDriver = drv
                onlineStatus = drv?.isOnline ?: false
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
    LaunchedEffect(registeredDriver, onlineStatus) {
        if (registeredDriver != null) {
            while (true) {
                ApiService.fetchRides(
                    onSuccess = { rides ->
                        // Filter rides for this driver or in their operating zones
                        activeRidesList = rides.filter {
                            (it.requestedDriverId == registeredDriver?.id || it.matchedDriverId == registeredDriver?.id) &&
                                    it.status != "COMPLETED" && !it.status.startsWith("CANCELLED")
                        }
                    },
                    onError = {}
                )
                kotlinx.coroutines.delay(3000)
            }
        }
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
                                        if (name.isNotEmpty() && phone.isNotEmpty() && cpf.isNotEmpty() && vehicleModel.isNotEmpty()) {
                                            isFetching = true
                                            ApiService.registerDriver(
                                                name = name,
                                                phone = phone,
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
                                            message = "Preencha todos os campos obrigatórios."
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
                                                message = if (it.isOnline) "Você agora está Online!" else "Você saiu de serviço."
                                            },
                                            onError = { err ->
                                                message = err.message ?: "Erro ao atualizar status de serviço."
                                            }
                                        )
                                    },
                                    colors = SwitchDefaults.colors(checkedThumbColor = EmeraldGreen)
                                )
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
                            Card(
                                colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(ride.passengerName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                        Text("R$ ${ride.fareBrl}", color = EmeraldGreen, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                    }

                                    Text("Rota: ${zones.find { it.id == ride.originZoneId }?.name ?: "Origem"} ➔ ${zones.find { it.id == ride.destinationZoneId }?.name ?: "Destino"}", color = TextSecondary, fontSize = 14.sp)

                                    if (ride.notes?.isNotEmpty() == true) {
                                        Text("Obs: ${ride.notes}", color = TextSecondary, fontSize = 12.sp)
                                    }

                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        if (ride.status == "REQUESTED") {
                                            Button(
                                                onClick = {
                                                    ApiService.updateRideStatus(
                                                        rideId = ride.id,
                                                        status = "ACCEPTED",
                                                        onSuccess = {
                                                            refreshState()
                                                            message = "Você aceitou a corrida de ${ride.passengerName}!"
                                                        },
                                                        onError = {
                                                            message = "Erro ao aceitar corrida."
                                                        }
                                                    )
                                                },
                                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Text("Aceitar Corrida", color = Color.Black, fontWeight = FontWeight.Bold)
                                            }
                                        } else if (ride.status == "ACCEPTED") {
                                            Button(
                                                onClick = {
                                                    ApiService.updateRideStatus(
                                                        rideId = ride.id,
                                                        status = "COMPLETED",
                                                        onSuccess = {
                                                            refreshState()
                                                            message = "Corrida finalizada com sucesso! Parabéns!"
                                                        },
                                                        onError = {
                                                            message = "Erro ao finalizar corrida."
                                                        }
                                                    )
                                                },
                                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Text("Finalizar Corrida", color = Color.Black, fontWeight = FontWeight.Bold)
                                            }

                                            Button(
                                                onClick = {
                                                    ApiService.updateRideStatus(
                                                        rideId = ride.id,
                                                        status = "CANCELLED_BY_DRIVER",
                                                        onSuccess = {
                                                            refreshState()
                                                            message = "Você cancelou a corrida."
                                                        },
                                                        onError = {
                                                            message = "Erro ao cancelar corrida."
                                                        }
                                                    )
                                                },
                                                colors = ButtonDefaults.buttonColors(containerColor = AccentRed),
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Text("Recusar/Cancelar", color = Color.White)
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
