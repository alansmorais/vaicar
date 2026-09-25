package com.vaicar.app

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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminScreen(metrics: PlatformMetrics, onBack: () -> Unit) {
    var driversList by remember { mutableStateOf<List<Driver>>(listOf()) }
    var passengersList by remember { mutableStateOf<List<Passenger>>(listOf()) }
    var isFetchingDrivers by remember { mutableStateOf(true) }
    var isFetchingPassengers by remember { mutableStateOf(true) }
    var deletingPassenger by remember { mutableStateOf<Passenger?>(null) }
    var message by remember { mutableStateOf("") }
    var selectedTab by remember { mutableStateOf(0) } // 0 = Motoristas, 1 = Passageiros

    fun refreshDrivers() {
        isFetchingDrivers = true
        ApiService.fetchDrivers(
            onSuccess = {
                driversList = it
                isFetchingDrivers = false
            },
            onError = {
                isFetchingDrivers = false
                message = "Erro ao carregar condutores: ${it.message}"
            }
        )
    }

    fun refreshPassengers() {
        isFetchingPassengers = true
        ApiService.fetchPassengers(
            onSuccess = {
                passengersList = it
                isFetchingPassengers = false
            },
            onError = {
                isFetchingPassengers = false
                message = "Erro ao carregar passageiros: ${it.message}"
            }
        )
    }

    LaunchedEffect(Unit) {
        refreshDrivers()
        refreshPassengers()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkSlate)
            .padding(16.dp)
    ) {
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
                        text = "Gestão Pública",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Icon(Icons.Default.AdminPanelSettings, contentDescription = null, tint = EmeraldGreen)
                }
            }

            // Metrics Grid
            item {
                Text("Visão Geral da Plataforma", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }

            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                        modifier = Modifier.weight(1.5f)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text("Arrecadação Mensal", color = TextSecondary, fontSize = 11.sp)
                            Text("R$ ${metrics.monthlyRecurringRevenue}", color = EmeraldGreen, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        }
                    }

                    Card(
                        colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text("Total Corridas", color = TextSecondary, fontSize = 11.sp)
                            Text("${metrics.totalRides}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        }
                    }

                    Card(
                        colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text("Passageiros", color = TextSecondary, fontSize = 11.sp)
                            Text("${metrics.totalPassengers}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        }
                    }
                }
            }

            // Tab Selector
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SurfaceSlate, RoundedCornerShape(8.dp))
                        .padding(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .background(
                                if (selectedTab == 0) EmeraldGreen else Color.Transparent,
                                RoundedCornerShape(6.dp)
                            )
                            .clickable { selectedTab = 0 }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "Motoristas (${driversList.size})",
                            color = if (selectedTab == 0) Color.Black else Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .background(
                                if (selectedTab == 1) EmeraldGreen else Color.Transparent,
                                RoundedCornerShape(6.dp)
                            )
                            .clickable { selectedTab = 1 }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "Passageiros (${passengersList.size})",
                            color = if (selectedTab == 1) Color.Black else Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                }
            }

            if (selectedTab == 0) {
                // DRIVERS TAB
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Moderação de Condutores", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        IconButton(onClick = { refreshDrivers() }) {
                            Icon(Icons.Default.Refresh, contentDescription = "Recarregar", tint = EmeraldGreen)
                        }
                    }
                }

                if (isFetchingDrivers) {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = EmeraldGreen)
                        }
                    }
                } else if (driversList.isEmpty()) {
                    item {
                        Text("Nenhum motorista credenciado ainda.", color = TextSecondary, modifier = Modifier.padding(8.dp))
                    }
                } else {
                    items(driversList) { driver ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(driver.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                        Text("Tel: ${driver.phone} • CPF: ${driver.cpf}", color = TextSecondary, fontSize = 11.sp)
                                        Text("Veículo: ${driver.vehicle.brand} ${driver.vehicle.model} (${driver.vehicle.licensePlate})", color = TextSecondary, fontSize = 11.sp)
                                    }

                                    Badge(
                                        containerColor = when (driver.regulatoryStatus) {
                                            "APPROVED" -> EmeraldGreen
                                            "PENDING", "SUBMITTED" -> Color.Blue
                                            "SUSPENDED" -> Color.Yellow
                                            else -> AccentRed
                                        }
                                    ) {
                                        Text(
                                            text = when (driver.regulatoryStatus) {
                                                "APPROVED" -> "Homologado"
                                                "PENDING", "SUBMITTED" -> "Pendente"
                                                "SUSPENDED" -> "Suspenso"
                                                "BLOCKED" -> "Bloqueado"
                                                "REJECTED" -> "Rejeitado"
                                                else -> driver.regulatoryStatus
                                            },
                                            color = if (driver.regulatoryStatus == "SUSPENDED") Color.Black else Color.White,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                            fontSize = 11.sp
                                        )
                                    }
                                }

                                // Moderation buttons for drivers
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    if (driver.regulatoryStatus != "APPROVED") {
                                        Button(
                                            onClick = {
                                                isFetchingDrivers = true
                                                ApiService.approveDriver(
                                                    id = driver.id,
                                                    onSuccess = {
                                                        refreshDrivers()
                                                        message = "Condutor ${driver.name} homologado com sucesso!"
                                                    },
                                                    onError = {
                                                        isFetchingDrivers = false
                                                        message = "Erro ao aprovar condutor: ${it.message}"
                                                    }
                                                )
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                            shape = RoundedCornerShape(6.dp),
                                            modifier = Modifier.weight(1f),
                                            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                                        ) {
                                            Text("Homologar", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                        }
                                    }

                                    if (driver.regulatoryStatus != "SUSPENDED") {
                                        Button(
                                            onClick = {
                                                isFetchingDrivers = true
                                                ApiService.suspendDriver(
                                                    id = driver.id,
                                                    reason = "Suspenso administrativa por auditoria",
                                                    onSuccess = {
                                                        refreshDrivers()
                                                        message = "Condutor ${driver.name} suspenso com sucesso."
                                                    },
                                                    onError = {
                                                        isFetchingDrivers = false
                                                        message = "Erro ao suspender condutor."
                                                    }
                                                )
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = Color.Yellow),
                                            shape = RoundedCornerShape(6.dp),
                                            modifier = Modifier.weight(1f),
                                            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                                        ) {
                                            Text("Suspender", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                        }
                                    }

                                    if (driver.regulatoryStatus != "BLOCKED") {
                                        Button(
                                            onClick = {
                                                isFetchingDrivers = true
                                                ApiService.blockDriver(
                                                    id = driver.id,
                                                    reason = "Bloqueado por violação das diretrizes",
                                                    onSuccess = {
                                                        refreshDrivers()
                                                        message = "Condutor ${driver.name} bloqueado!"
                                                    },
                                                    onError = {
                                                        isFetchingDrivers = false
                                                        message = "Erro ao bloquear condutor."
                                                    }
                                                )
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = AccentRed),
                                            shape = RoundedCornerShape(6.dp),
                                            modifier = Modifier.weight(1f),
                                            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                                        ) {
                                            Text("Bloquear", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                // PASSENGERS TAB
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Moderação de Passageiros", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        IconButton(onClick = { refreshPassengers() }) {
                            Icon(Icons.Default.Refresh, contentDescription = "Recarregar", tint = EmeraldGreen)
                        }
                    }
                }

                if (isFetchingPassengers) {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = EmeraldGreen)
                        }
                    }
                } else if (passengersList.isEmpty()) {
                    item {
                        Text("Nenhum passageiro registrado ainda.", color = TextSecondary, modifier = Modifier.padding(8.dp))
                    }
                } else {
                    items(passengersList) { passenger ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(passenger.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                        Text("Tel: ${passenger.phone} • Email: ${passenger.email}", color = TextSecondary, fontSize = 11.sp)
                                    }

                                    Badge(
                                        containerColor = if (passenger.isBlocked) AccentRed else EmeraldGreen
                                    ) {
                                        Text(
                                            text = if (passenger.isBlocked) "Bloqueado" else "Ativo",
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                            fontSize = 11.sp
                                        )
                                    }
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Button(
                                        onClick = {
                                            isFetchingPassengers = true
                                            ApiService.blockPassenger(
                                                id = passenger.id,
                                                isBlocked = !passenger.isBlocked,
                                                onSuccess = {
                                                    refreshPassengers()
                                                    message = if (!passenger.isBlocked) "Passageiro ${passenger.name} bloqueado!" else "Passageiro ${passenger.name} desbloqueado."
                                                },
                                                onError = {
                                                    isFetchingPassengers = false
                                                    message = "Erro ao alterar status do passageiro."
                                                }
                                            )
                                        },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (passenger.isBlocked) EmeraldGreen else AccentRed
                                        ),
                                        shape = RoundedCornerShape(6.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                                    ) {
                                        Text(
                                            if (passenger.isBlocked) "Desbloquear" else "Bloquear",
                                            color = if (passenger.isBlocked) Color.Black else Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 11.sp
                                        )
                                    }

                                    Button(
                                        onClick = { deletingPassenger = passenger },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7F1D1D)),
                                        shape = RoundedCornerShape(6.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                                    ) {
                                        Text(
                                            "Delete Passenger",
                                            color = Color(0xFFFCA5A5),
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 11.sp
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Delete Passenger Confirmation Dialog
        deletingPassenger?.let { p ->
            AlertDialog(
                onDismissRequest = { deletingPassenger = null },
                containerColor = Color(0xFF0F172A),
                title = {
                    Text(
                        "Excluir Conta de Passageiro",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            "Are you sure you want to delete this passenger account?",
                            color = Color(0xFFF87171),
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                        Text(
                            "Confirme os dados antes de prosseguir com a exclusão definitiva do banco de dados:",
                            color = Color(0xFF94A3B8),
                            fontSize = 12.sp
                        )
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text("Nome: ${p.name}", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                Text("WhatsApp/Telefone: ${p.phone}", color = Color(0xFF10B981), fontSize = 12.sp)
                                Text("E-mail: ${if (p.email.isNotBlank()) p.email else "Não informado"}", color = Color(0xFF94A3B8), fontSize = 12.sp)
                                Text("ID: ${p.id}", color = Color(0xFF64748B), fontSize = 10.sp)
                            }
                        }
                        Text(
                            "Apenas este passageiro será excluído. Motoristas e dados de outros usuários não serão afetados.",
                            color = Color(0xFFFBBF24),
                            fontSize = 11.sp
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            val targetId = p.id
                            val targetName = p.name
                            deletingPassenger = null
                            isFetchingPassengers = true
                            ApiService.deletePassenger(
                                id = targetId,
                                onSuccess = { successMsg ->
                                    passengersList = passengersList.filter { it.id != targetId }
                                    isFetchingPassengers = false
                                    message = "Conta de $targetName excluída com sucesso!"
                                },
                                onError = { err ->
                                    isFetchingPassengers = false
                                    message = "Erro ao excluir passageiro: ${err.message}"
                                }
                            )
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                    ) {
                        Text("Confirmar Exclusão", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { deletingPassenger = null }) {
                        Text("Cancelar", color = Color(0xFF94A3B8))
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
