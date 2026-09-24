package com.vaicar.app

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PassengerScreen(zones: List<Zone>, onBack: () -> Unit) {
    val context = LocalContext.current
    var selectedTab by remember { mutableStateOf(0) } // 0: Viagem, 1: Mapa, 2: Perfil

    // Viagem State
    var originZone by remember { mutableStateOf<Zone?>(zones.firstOrNull()) }
    var destZone by remember { mutableStateOf<Zone?>(zones.getOrNull(1)) }
    var passengerCount by remember { mutableStateOf(1) }
    var passengerName by remember { mutableStateOf(SecurityUtils.getPassengerName(context)) }
    var passengerPhone by remember { mutableStateOf(SecurityUtils.getPassengerPhone(context)) }
    var originAddressDetails by remember { mutableStateOf("") }
    var destAddressDetails by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    var searchResults by remember { mutableStateOf<SearchDriversResponse?>(null) }
    var selectedDriver by remember { mutableStateOf<SearchResult?>(null) }
    var currentRide by remember { mutableStateOf<Ride?>(null) }
    var isSearching by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }

    var originExpanded by remember { mutableStateOf(false) }
    var destExpanded by remember { mutableStateOf(false) }

    // Mobility Map State
    var mobilityData by remember { mutableStateOf<MobilityMapData?>(null) }
    var isLoadingMobility by remember { mutableStateOf(false) }

    // Profile State
    var profileName by remember { mutableStateOf(SecurityUtils.getPassengerName(context)) }
    var profilePhone by remember { mutableStateOf(SecurityUtils.getPassengerPhone(context)) }
    var profileEmail by remember { mutableStateOf("") }
    var profileAvatar by remember { mutableStateOf("https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80") }
    var isSavingProfile by remember { mutableStateOf(false) }

    // Fetch passenger profile from backend on load
    LaunchedEffect(Unit) {
        val phone = SecurityUtils.getPassengerPhone(context)
        if (phone.isNotBlank()) {
            ApiService.fetchPassengers(
                onSuccess = { passengers ->
                    val myP = passengers.find { it.phone == phone || it.phone.replace("+", "").endsWith(phone.replace("+", "")) }
                    if (myP != null) {
                        profileName = myP.name
                        profilePhone = myP.phone
                        profileEmail = myP.email
                        if (!myP.avatarUrl.isNullOrBlank()) profileAvatar = myP.avatarUrl
                        passengerName = myP.name
                        passengerPhone = myP.phone
                    }
                },
                onError = {}
            )
        }
    }

    // Load mobility map data when Map tab selected
    LaunchedEffect(selectedTab) {
        if (selectedTab == 1) {
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

    // Poll current ride status if active
    val currentRideId = currentRide?.id
    LaunchedEffect(currentRideId) {
        if (currentRideId != null) {
            while (true) {
                kotlinx.coroutines.delay(2500)
                ApiService.getRide(
                    rideId = currentRideId,
                    onSuccess = { updated ->
                        currentRide = updated
                    },
                    onError = {}
                )
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
                        text = "VaiCar Passageiro",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(onClick = {
                        SecurityUtils.logoutPassenger(context)
                        onBack()
                    }) {
                        Icon(Icons.Default.ExitToApp, contentDescription = "Sair", tint = AccentRed)
                    }
                }
            }

            // Navigation Tabs
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
                        text = { Text("Viagem", fontWeight = FontWeight.Bold, fontSize = 13.sp) },
                        icon = { Icon(Icons.Default.DirectionsCar, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = { Text("Mapa", fontWeight = FontWeight.Bold, fontSize = 13.sp) },
                        icon = { Icon(Icons.Default.Place, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                    Tab(
                        selected = selectedTab == 2,
                        onClick = { selectedTab = 2 },
                        text = { Text("Meu Perfil", fontWeight = FontWeight.Bold, fontSize = 13.sp) },
                        icon = { Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                }
            }

            // ==========================================
            // TAB 0: VIAGEM & CORRIDAS
            // ==========================================
            if (selectedTab == 0) {
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
                                        label = { Text("Origem (Região / Bairro)") },
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
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                    DropdownMenu(
                                        expanded = originExpanded,
                                        onDismissRequest = { originExpanded = false },
                                        modifier = Modifier.background(SurfaceSlate)
                                    ) {
                                        zones.forEach { z ->
                                            DropdownMenuItem(
                                                text = { Text(z.name, color = Color.White) },
                                                onClick = {
                                                    originZone = z
                                                    originExpanded = false
                                                }
                                            )
                                        }
                                    }
                                }

                                // Origin Street / Landmark
                                OutlinedTextField(
                                    value = originAddressDetails,
                                    onValueChange = { originAddressDetails = it },
                                    label = { Text("Rua e Número / Ponto de Referência") },
                                    placeholder = { Text("Ex: Rua da Praia, 120", color = TextSecondary.copy(alpha = 0.5f)) },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = EmeraldGreen,
                                        focusedLabelColor = EmeraldGreen,
                                        unfocusedLabelColor = TextSecondary,
                                        unfocusedTextColor = Color.White,
                                        focusedTextColor = Color.White
                                    ),
                                    modifier = Modifier.fillMaxWidth()
                                )

                                // Destination Zone Selector
                                Box(modifier = Modifier.fillMaxWidth()) {
                                    OutlinedTextField(
                                        value = destZone?.name ?: "Selecione",
                                        onValueChange = {},
                                        readOnly = true,
                                        label = { Text("Destino (Região / Bairro)") },
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
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                    DropdownMenu(
                                        expanded = destExpanded,
                                        onDismissRequest = { destExpanded = false },
                                        modifier = Modifier.background(SurfaceSlate)
                                    ) {
                                        zones.forEach { z ->
                                            DropdownMenuItem(
                                                text = { Text(z.name, color = Color.White) },
                                                onClick = {
                                                    destZone = z
                                                    destExpanded = false
                                                }
                                            )
                                        }
                                    }
                                }

                                // Destination Address / Landmark
                                OutlinedTextField(
                                    value = destAddressDetails,
                                    onValueChange = { destAddressDetails = it },
                                    label = { Text("Endereço Completo de Destino") },
                                    placeholder = { Text("Ex: Av. Francisco Loup, 100 - Maresias", color = TextSecondary.copy(alpha = 0.5f)) },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = EmeraldGreen,
                                        focusedLabelColor = EmeraldGreen,
                                        unfocusedLabelColor = TextSecondary,
                                        unfocusedTextColor = Color.White,
                                        focusedTextColor = Color.White
                                    ),
                                    modifier = Modifier.fillMaxWidth()
                                )

                                // Passenger Count
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Passageiros:", color = TextSecondary, fontSize = 14.sp)
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        IconButton(onClick = { if (passengerCount > 1) passengerCount-- }) {
                                            Icon(Icons.Default.RemoveCircleOutline, contentDescription = "Diminuir", tint = EmeraldGreen)
                                        }
                                        Text("$passengerCount", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                        IconButton(onClick = { if (passengerCount < 4) passengerCount++ }) {
                                            Icon(Icons.Default.AddCircleOutline, contentDescription = "Aumentar", tint = EmeraldGreen)
                                        }
                                    }
                                }

                                // Search Drivers Button
                                Button(
                                    onClick = {
                                        if (originZone != null && destZone != null) {
                                            isSearching = true
                                            message = ""
                                            ApiService.searchDrivers(
                                                originId = originZone!!.id,
                                                destId = destZone!!.id,
                                                passengerCount = passengerCount,
                                                onSuccess = { res ->
                                                    isSearching = false
                                                    searchResults = res
                                                    if (res.results.isEmpty()) {
                                                        message = "Nenhum motorista disponível nesta rota no momento."
                                                    }
                                                },
                                                onError = {
                                                    isSearching = false
                                                    message = "Erro ao buscar motoristas."
                                                }
                                            )
                                        } else {
                                            message = "Selecione origem e destino válidos."
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    if (isSearching) {
                                        CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(20.dp))
                                    } else {
                                        Text("Buscar Motoristas Disponíveis", color = Color.Black, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }

                    // Search Results List
                    if (searchResults != null && searchResults!!.results.isNotEmpty()) {
                        item {
                            Text(
                                text = "Motoristas Encontrados (${searchResults!!.results.size}):",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                        }

                        items(searchResults!!.results) { driver ->
                            Card(
                                colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { selectedDriver = driver }
                            ) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(driver.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                        Text("R$ ${"%.2f".format(driver.fare)}", color = EmeraldGreen, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                    }
                                    Text(
                                        "${driver.vehicle.brand} ${driver.vehicle.model} - ${driver.vehicle.color}",
                                        color = TextSecondary,
                                        fontSize = 13.sp
                                    )
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("⭐ ${driver.ratingAverage} (${driver.ratingCount} avaliações)", color = TextSecondary, fontSize = 12.sp)
                                        Text("Chega em aprox. ${driver.arrivalTimeMin} min", color = EmeraldGreen, fontSize = 12.sp)
                                    }

                                    Button(
                                        onClick = {
                                            val fullOrigin = if (originAddressDetails.isNotBlank()) {
                                                "$originAddressDetails, ${originZone?.name}, São Sebastião - SP"
                                            } else {
                                                "${originZone?.name}, São Sebastião - SP"
                                            }
                                            val fullDest = if (destAddressDetails.isNotBlank()) {
                                                "$destAddressDetails, ${destZone?.name}, São Sebastião - SP"
                                            } else {
                                                "${destZone?.name}, São Sebastião - SP"
                                            }

                                            ApiService.createRide(
                                                passengerName = passengerName,
                                                passengerPhone = passengerPhone,
                                                originId = originZone!!.id,
                                                destId = destZone!!.id,
                                                passengerCount = passengerCount,
                                                driverId = driver.driverId,
                                                fare = driver.fare,
                                                notes = notes,
                                                originAddress = fullOrigin,
                                                destAddress = fullDest,
                                                onSuccess = { ride ->
                                                    currentRide = ride
                                                    message = "Chamada solicitada! Aguardando o motorista aceitar."
                                                },
                                                onError = {
                                                    message = "Falha ao solicitar corrida."
                                                }
                                            )
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text("Chamar Este Motorista", color = Color.Black, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // Active Ride Tracker Card
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
                                    text = if (currentRide!!.status == "COMPLETED") "Viagem Concluída com Sucesso! 🏁" else "Sua Viagem está Ativa! 🚗",
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

                                if (!currentRide!!.driverName.isNullOrBlank()) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("Motorista:", color = TextSecondary)
                                        Text(currentRide!!.driverName ?: "Motorista", color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                }

                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text("Embarque:", color = TextSecondary, fontSize = 12.sp)
                                    Text(currentRide!!.originAddress ?: originZone?.name ?: "Origem", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                }

                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text("Desembarque:", color = TextSecondary, fontSize = 12.sp)
                                    Text(currentRide!!.destinationAddress ?: destZone?.name ?: "Destino", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                }

                                val displayFare = if (currentRide!!.fareBrl > 0) currentRide!!.fareBrl else currentRide!!.estimatedPrice

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Valor Total:", color = TextSecondary)
                                    Text("R$ ${"%.2f".format(displayFare)}", color = EmeraldGreen, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Status:", color = TextSecondary)
                                    Badge(
                                        containerColor = when (currentRide!!.status) {
                                            "REQUESTED" -> Color(0xFFEAB308)
                                            "ACCEPTED" -> Color(0xFF3B82F6)
                                            "COMPLETED" -> Color(0xFF10B981)
                                            else -> AccentRed
                                        }
                                    ) {
                                        Text(
                                            text = when (currentRide!!.status) {
                                                "REQUESTED" -> "Aguardando Motorista Aceitar"
                                                "ACCEPTED" -> "Corrida Aceita! Motorista a caminho"
                                                "COMPLETED" -> "Finalizada"
                                                "CANCELLED_BY_PASSENGER" -> "Cancelada por Você"
                                                "CANCELLED_BY_DRIVER" -> "Cancelada pelo Motorista"
                                                else -> currentRide!!.status
                                            },
                                            color = if (currentRide!!.status == "REQUESTED") Color.Black else Color.White,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }

                                // COMPROVANTE DA CORRIDA BUTTON (PART 1 & 5)
                                if (currentRide!!.status == "COMPLETED") {
                                    Card(
                                        colors = CardDefaults.cardColors(containerColor = Color(0xFF022C22)),
                                        border = BorderStroke(1.dp, Color(0xFF059669)),
                                        shape = RoundedCornerShape(10.dp),
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
                                                Text("🧾 Comprovante da Corrida", color = EmeraldGreen, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                                Text("OFICIAL", color = Color(0xFFA7F3D0), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                            }
                                            Text(
                                                "O comprovante em formato PDF oficial com assinatura digital foi emitido para esta corrida e enviado ao seu e-mail.",
                                                color = Color(0xFFD1FAE5),
                                                fontSize = 11.sp
                                            )
                                            Button(
                                                onClick = {
                                                    val pdfUrl = "${NetworkConfig.PRODUCTION_URL}/api/v1/rides/${currentRide!!.id}/receipt/pdf"
                                                    val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(pdfUrl))
                                                    context.startActivity(browserIntent)
                                                },
                                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.fillMaxWidth()
                                            ) {
                                                Icon(Icons.Default.Download, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text("Visualizar / Baixar Comprovante PDF", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                            }
                                        }
                                    }
                                }

                                // Google Maps Route Button
                                Button(
                                    onClick = {
                                        val oAddress = currentRide!!.originAddress
                                        val dAddress = currentRide!!.destinationAddress
                                        val mapsUri = if (!oAddress.isNullOrBlank() && !dAddress.isNullOrBlank() && oAddress != "Origem" && dAddress != "Destino") {
                                            val cleanO = if (oAddress.contains("São Sebastião", ignoreCase = true)) oAddress else "$oAddress, São Sebastião - SP"
                                            val cleanD = if (dAddress.contains("São Sebastião", ignoreCase = true)) dAddress else "$dAddress, São Sebastião - SP"
                                            Uri.parse("https://www.google.com/maps/dir/?api=1&origin=${Uri.encode(cleanO)}&destination=${Uri.encode(cleanD)}&travelmode=driving")
                                        } else {
                                            val orig = originZone ?: zones.find { it.id == currentRide!!.originZoneId }
                                            val dest = destZone ?: zones.find { it.id == currentRide!!.destinationZoneId }
                                            val oLat = currentRide!!.originLat ?: orig?.lat ?: -23.8078
                                            val oLng = currentRide!!.originLng ?: orig?.lng ?: -45.4058
                                            val dLat = currentRide!!.destinationLat ?: dest?.lat ?: -23.8078
                                            val dLng = currentRide!!.destinationLng ?: dest?.lng ?: -45.4058
                                            Uri.parse("https://www.google.com/maps/dir/?api=1&origin=$oLat,$oLng&destination=$dLat,$dLng&travelmode=driving")
                                        }
                                        val mapIntent = Intent(Intent.ACTION_VIEW, mapsUri)
                                        context.startActivity(mapIntent)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                                    border = BorderStroke(1.dp, Color(0xFF38BDF8)),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(Icons.Default.Place, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Acompanhar Rota no Google Maps 🗺", color = Color(0xFF38BDF8), fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
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
            }

            // ==========================================
            // TAB 1: MAPA DE MOBILIDADE DE SÃO SEBASTIÃO
            // ==========================================
            if (selectedTab == 1) {
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
                                Text("Mapa de Mobilidade Real", color = EmeraldGreen, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                Text("São Sebastião - SP", color = TextSecondary, fontSize = 12.sp)
                            }
                            Text(
                                "Monitore a cobertura de motoristas ativos, tempo estimado de embarque e demanda por região em tempo real.",
                                color = Color.White.copy(alpha = 0.8f),
                                fontSize = 12.sp
                            )

                            Button(
                                onClick = {
                                    val mapWebUrl = "${NetworkConfig.PRODUCTION_URL}/?tab=mapa"
                                    val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(mapWebUrl))
                                    context.startActivity(browserIntent)
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Default.Navigation, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Abrir Mapa Interativo Completo", color = Color.Black, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                item {
                    Text("Regiões e Demanda em Tempo Real:", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
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
                                        Text("${z.distanceFromCenterKm} km do Centro Histórico", color = TextSecondary, fontSize = 11.sp)
                                    }
                                    Text("Disponível", color = EmeraldGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
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
                                            "${demand.onlineDrivers} motorista(s) ativo(s) • Chegada em ~${demand.estimatedPickupMin} min",
                                            color = TextSecondary,
                                            fontSize = 11.sp
                                        )
                                    }
                                    Badge(
                                        containerColor = if (demand.onlineDrivers > 0) Color(0xFF065F46) else Color(0xFF1E293B)
                                    ) {
                                        Text(
                                            if (demand.onlineDrivers > 0) "Com Cobertura" else "Baixa Cobertura",
                                            color = if (demand.onlineDrivers > 0) Color(0xFFA7F3D0) else TextSecondary,
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

            // ==========================================
            // TAB 2: MEU PERFIL (COMPLETE PASSENGER PROFILE)
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
                            Text(
                                text = "Gerenciamento de Perfil do Passageiro",
                                color = EmeraldGreen,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )

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
                                    Text("Foto do Perfil", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Text("Facilita a sua identificação no ponto de encontro.", color = TextSecondary, fontSize = 11.sp)
                                }
                            }

                            // Preset Avatars Selection
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                listOf(
                                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
                                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
                                    "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80"
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

                            // Name Input
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
                                label = { Text("WhatsApp / Telefone *") },
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
                                placeholder = { Text("seu.email@exemplo.com", color = TextSecondary.copy(alpha = 0.5f)) },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = EmeraldGreen,
                                    focusedLabelColor = EmeraldGreen,
                                    unfocusedLabelColor = TextSecondary,
                                    unfocusedTextColor = Color.White,
                                    focusedTextColor = Color.White
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )

                            // Save & Cancel Actions
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Button(
                                    onClick = {
                                        if (profileName.isBlank() || profilePhone.isBlank()) {
                                            message = "Nome e telefone são obrigatórios."
                                            return@Button
                                        }

                                        val digits = profilePhone.replace("\\D".toRegex(), "")
                                        if (digits.length < 10) {
                                            message = "Telefone inválido. Digite DDD + número."
                                            return@Button
                                        }

                                        if (profileEmail.isNotBlank() && !profileEmail.contains("@")) {
                                            message = "Formato de e-mail inválido."
                                            return@Button
                                        }

                                        isSavingProfile = true
                                        val passengerId = profilePhone.trim()

                                        ApiService.updatePassengerProfile(
                                            passengerId = passengerId,
                                            name = profileName.trim(),
                                            phone = profilePhone.trim(),
                                            email = profileEmail.trim(),
                                            avatarUrl = profileAvatar,
                                            onSuccess = { updated ->
                                                isSavingProfile = false
                                                passengerName = updated.name
                                                passengerPhone = updated.phone
                                                SecurityUtils.registerPassenger(
                                                    context,
                                                    updated.name,
                                                    updated.phone,
                                                    SecurityUtils.getAdminPassword(context)
                                                )
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
                                        profileName = SecurityUtils.getPassengerName(context)
                                        profilePhone = SecurityUtils.getPassengerPhone(context)
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
