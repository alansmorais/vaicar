package com.vaicar.app

import androidx.compose.foundation.background
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
    var isFetching by remember { mutableStateOf(true) }
    var message by remember { mutableStateOf("") }

    fun refreshDrivers() {
        ApiService.fetchDrivers(
            onSuccess = {
                driversList = it
                isFetching = false
            },
            onError = {
                isFetching = false
            }
        )
    }

    LaunchedEffect(Unit) {
        refreshDrivers()
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
                        text = "Gestão Pública Municipal",
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

            // Drivers Management
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Homologação de Condutores", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    IconButton(onClick = { isFetching = true; refreshDrivers() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Recarregar", tint = EmeraldGreen)
                    }
                }
            }

            if (isFetching) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = EmeraldGreen)
                    }
                }
            } else if (driversList.isEmpty()) {
                item {
                    Text("Nenhum motorista cadastrado ainda.", color = TextSecondary, modifier = Modifier.padding(8.dp))
                }
            } else {
                items(driversList) { driver ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(driver.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                    Text("CPF: ${driver.cpf} • Cel: ${driver.phone}", color = TextSecondary, fontSize = 12.sp)
                                    Text("Veículo: ${driver.vehicle.brand} ${driver.vehicle.model} (${driver.vehicle.licensePlate})", color = TextSecondary, fontSize = 12.sp)
                                }

                                Badge(
                                    containerColor = when (driver.regulatoryStatus) {
                                        "APPROVED" -> EmeraldGreen
                                        "PENDING", "SUBMITTED" -> Color.Blue
                                        else -> AccentRed
                                    }
                                ) {
                                    Text(
                                        text = when (driver.regulatoryStatus) {
                                            "APPROVED" -> "Homologado"
                                            "PENDING", "SUBMITTED" -> "Pendente"
                                            "SUSPENDED" -> "Suspenso"
                                            else -> driver.regulatoryStatus
                                        },
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(4.dp)
                                    )
                                }
                            }

                            // Show documents verification control if pending approval
                            if (driver.regulatoryStatus != "APPROVED") {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Button(
                                        onClick = {
                                            isFetching = true
                                            // Mock document upload / approve by calling updateDriverDocument
                                            ApiService.updateDriverDocument(
                                                driverId = driver.id,
                                                requirementId = "req-alvara", // Default alvara req
                                                status = "APPROVED",
                                                onSuccess = {
                                                    // Then set driver online/approved state
                                                    refreshDrivers()
                                                    message = "Motorista ${driver.name} aprovado e homologado com sucesso!"
                                                },
                                                onError = {
                                                    isFetching = false
                                                    message = "Erro ao aprovar motorista."
                                                }
                                            )
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                        shape = RoundedCornerShape(6.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("Homologar Condutor", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 12.sp)
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
