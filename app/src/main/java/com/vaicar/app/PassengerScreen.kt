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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PassengerScreen(zones: List<Zone>, onBack: () -> Unit) {
    var originZone by remember { mutableStateOf<Zone?>(zones.firstOrNull()) }
    var destZone by remember { mutableStateOf<Zone?>(zones.getOrNull(1)) }
    var passengerCount by remember { mutableStateOf(1) }
    var passengerName by remember { mutableStateOf("Alan Morais") }
    var passengerPhone by remember { mutableStateOf("+551299999999") }
    var notes by remember { mutableStateOf("") }

    var searchResults by remember { mutableStateOf<SearchDriversResponse?>(null) }
    var selectedDriver by remember { mutableStateOf<SearchResult?>(null) }
    var currentRide by remember { mutableStateOf<Ride?>(null) }
    var isSearching by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }

    var originExpanded by remember { mutableStateOf(false) }
    var destExpanded by remember { mutableStateOf(false) }

    // Poll current ride status if active
    LaunchedEffect(currentRide) {
        if (currentRide != null) {
            while (true) {
                kotlinx.coroutines.delay(4000)
                currentRide?.let { ride ->
                    ApiService.fetchRides(
                        onSuccess = { rides ->
                            val updated = rides.find { it.id == ride.id }
                            if (updated != null) {
                                currentRide = updated
                            }
                        },
                        onError = {}
                    )
                }
            }
        }
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
                        text = "Solicitar Viagem",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Icon(Icons.Default.Person, contentDescription = null, tint = EmeraldGreen)
                }
            }

            if (currentRide == null) {
                // Booking Form
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
                            Text(
                                text = "Dados da Corrida",
                                color = EmeraldGreen,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )

                            // Passenger Name Input
                            OutlinedTextField(
                                value = passengerName,
                                onValueChange = { passengerName = it },
                                label = { Text("Seu Nome") },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = EmeraldGreen,
                                    focusedLabelColor = EmeraldGreen,
                                    unfocusedLabelColor = TextSecondary,
                                    unfocusedTextColor = Color.White,
                                    focusedTextColor = Color.White
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )

                            // Origin Zone Selector
                            Box(modifier = Modifier.fillMaxWidth()) {
                                OutlinedTextField(
                                    value = originZone?.name ?: "Selecione",
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("Origem (De Onde?)") },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = EmeraldGreen,
                                        focusedLabelColor = EmeraldGreen,
                                        unfocusedLabelColor = TextSecondary,
                                        unfocusedTextColor = Color.White,
                                        focusedTextColor = Color.White
                                    ),
                                    trailingIcon = {
                                        Icon(
                                            Icons.Default.ArrowDropDown,
                                            contentDescription = null,
                                            modifier = Modifier.clickable { originExpanded = true }
                                        )
                                    },
                                    modifier = Modifier.fillMaxWidth().clickable { originExpanded = true }
                                )
                                DropdownMenu(
                                    expanded = originExpanded,
                                    onDismissRequest = { originExpanded = false }
                                ) {
                                    zones.forEach { zone ->
                                        DropdownMenuItem(
                                            text = { Text(zone.name) },
                                            onClick = {
                                                originZone = zone
                                                originExpanded = false
                                                searchResults = null
                                            }
                                        )
                                    }
                                }
                            }

                            // Destination Zone Selector
                            Box(modifier = Modifier.fillMaxWidth()) {
                                OutlinedTextField(
                                    value = destZone?.name ?: "Selecione",
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("Destino (Para Onde?)") },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = EmeraldGreen,
                                        focusedLabelColor = EmeraldGreen,
                                        unfocusedLabelColor = TextSecondary,
                                        unfocusedTextColor = Color.White,
                                        focusedTextColor = Color.White
                                    ),
                                    trailingIcon = {
                                        Icon(
                                            Icons.Default.ArrowDropDown,
                                            contentDescription = null,
                                            modifier = Modifier.clickable { destExpanded = true }
                                        )
                                    },
                                    modifier = Modifier.fillMaxWidth().clickable { destExpanded = true }
                                )
                                DropdownMenu(
                                    expanded = destExpanded,
                                    onDismissRequest = { destExpanded = false }
                                ) {
                                    zones.forEach { zone ->
                                        DropdownMenuItem(
                                            text = { Text(zone.name) },
                                            onClick = {
                                                destZone = zone
                                                destExpanded = false
                                                searchResults = null
                                            }
                                        )
                                    }
                                }
                            }

                            // Search Button
                            Button(
                                onClick = {
                                    val orig = originZone
                                    val dest = destZone
                                    if (orig != null && dest != null) {
                                        isSearching = true
                                        ApiService.searchDrivers(
                                            originId = orig.id,
                                            destId = dest.id,
                                            passengerCount = passengerCount,
                                            onSuccess = {
                                                searchResults = it
                                                isSearching = false
                                            },
                                            onError = {
                                                message = "Falha ao buscar motoristas."
                                                isSearching = false
                                            }
                                        )
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                if (isSearching) {
                                    CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(24.dp))
                                } else {
                                    Text("Calcular Tarifas / Buscar Motoristas", color = Color.Black, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }

                // Results list
                searchResults?.let { res ->
                    if (res.results.isEmpty()) {
                        item {
                            Text(
                                text = "Nenhum motorista disponível no momento para esta rota.",
                                color = AccentRed,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                    } else {
                        item {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Motoristas Disponíveis (${res.results.size})",
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )
                                if (res.isDynamicActive) {
                                    Badge(containerColor = AccentRed) {
                                        Text("⚡ Dinâmico ${res.dynamicMultiplier}x", color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }

                        items(res.results) { driver ->
                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = if (selectedDriver?.driverId == driver.driverId) EmeraldGreen.copy(alpha = 0.2f) else SurfaceSlate
                                ),
                                border = if (selectedDriver?.driverId == driver.driverId) BorderStroke(2.dp, EmeraldGreen) else null,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { selectedDriver = driver }
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(driver.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                            Text("${driver.vehicle.brand} ${driver.vehicle.model} • ${driver.vehicle.licensePlate}", color = TextSecondary, fontSize = 12.sp)
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Default.Star, contentDescription = null, tint = Color.Yellow, modifier = Modifier.size(16.dp))
                                                Text(" ${driver.ratingAverage} (${driver.ratingCount} aval.)", color = Color.White, fontSize = 12.sp)
                                            }
                                        }
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text("R$ ${driver.fare}", color = EmeraldGreen, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                                            Text("Chega em ~${driver.arrivalTimeMin} min", color = TextSecondary, fontSize = 12.sp)
                                        }
                                    }
                                }
                            }
                        }

                        item {
                            selectedDriver?.let { driver ->
                                Button(
                                    onClick = {
                                        ApiService.createRide(
                                            passengerName = passengerName,
                                            passengerPhone = passengerPhone,
                                            originId = originZone!!.id,
                                            destId = destZone!!.id,
                                            passengerCount = passengerCount,
                                            driverId = driver.driverId,
                                            fare = driver.fare,
                                            notes = notes,
                                            onSuccess = {
                                                currentRide = it
                                                message = "Solicitação enviada com sucesso!"
                                            },
                                            onError = {
                                                message = "Falha ao solicitar viagem."
                                            }
                                        )
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Solicitar Corrida com ${driver.name}", color = Color.Black, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            } else {
                // Active Ride View
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Text(
                                text = "Sua Viagem está Ativa! 🚗",
                                color = EmeraldGreen,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Passageiro:", color = TextSecondary)
                                Text(currentRide!!.passengerName, color = Color.White, fontWeight = FontWeight.Bold)
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Rota:", color = TextSecondary)
                                Text("${originZone?.name} ➔ ${destZone?.name}", color = Color.White, fontWeight = FontWeight.Bold)
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Valor:", color = TextSecondary)
                                Text("R$ ${currentRide!!.fareBrl}", color = EmeraldGreen, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Status atual:", color = TextSecondary)
                                Badge(
                                    containerColor = when (currentRide!!.status) {
                                        "REQUESTED" -> Color.Blue
                                        "ACCEPTED" -> Color.Magenta
                                        "COMPLETED" -> Color.Green
                                        else -> AccentRed
                                    }
                                ) {
                                    Text(
                                        text = when (currentRide!!.status) {
                                            "REQUESTED" -> "Aguardando Motorista"
                                            "ACCEPTED" -> "Corrida Aceita"
                                            "COMPLETED" -> "Concluída!"
                                            "CANCELLED_BY_PASSENGER" -> "Cancelada por Você"
                                            "CANCELLED_BY_DRIVER" -> "Cancelada pelo Motorista"
                                            else -> currentRide!!.status
                                        },
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(4.dp)
                                    )
                                }
                            }

                            if (currentRide!!.status == "REQUESTED" || currentRide!!.status == "ACCEPTED") {
                                Button(
                                    onClick = {
                                        ApiService.updateRideStatus(
                                            rideId = currentRide!!.id,
                                            status = "CANCELLED_BY_PASSENGER",
                                            onSuccess = {
                                                currentRide = it
                                                message = "Corrida cancelada por você."
                                            },
                                            onError = {
                                                message = "Falha ao cancelar corrida."
                                            }
                                        )
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = AccentRed),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Cancelar Solicitação", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            } else {
                                Button(
                                    onClick = {
                                        currentRide = null
                                        searchResults = null
                                        selectedDriver = null
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Fazer Nova Solicitação", color = Color.Black, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }

            // Message Log Banner
            if (message.isNotEmpty()) {
                item {
                    Snackbar(
                        action = {
                            TextButton(onClick = { message = "" }) {
                                Text("OK", color = EmeraldGreen)
                            }
                        },
                        containerColor = SurfaceSlate,
                        contentColor = Color.White
                    ) {
                        Text(message)
                    }
                }
            }
        }
    }
}
