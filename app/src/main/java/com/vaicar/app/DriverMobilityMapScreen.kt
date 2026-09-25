package com.vaicar.app

import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MapStyleOptions
import com.google.maps.android.compose.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DriverMobilityMapScreen(
    driver: Driver?,
    zones: List<Zone>,
    mobilityData: MobilityMapData?,
    isLoading: Boolean,
    onRefresh: () -> Unit,
    onBack: () -> Unit
) {
    var selectedZoneId by remember { mutableStateOf<String?>(zones.firstOrNull()?.id) }

    // Pulsing radar animation for high demand areas and active location
    val infiniteTransition = rememberInfiniteTransition(label = "mapRadar")
    val pulseRadius by infiniteTransition.animateFloat(
        initialValue = 12f,
        targetValue = 36f,
        animationSpec = infiniteRepeatable(
            animation = tween(1600, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "pulseRadius"
    )
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 0.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1600, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "pulseAlpha"
    )

    // Calculate map bounds dynamically from real zone coordinates
    val minLat = if (zones.isNotEmpty()) zones.minOf { it.lat } else -23.9000
    val maxLat = if (zones.isNotEmpty()) zones.maxOf { it.lat } else -23.7000
    val minLng = if (zones.isNotEmpty()) zones.minOf { it.lng } else -45.5500
    val maxLng = if (zones.isNotEmpty()) zones.maxOf { it.lng } else -45.2500

    fun projectToCanvas(lat: Double, lng: Double, width: Float, height: Float): Offset {
        val latRange = (maxLat - minLat).coerceAtLeast(0.01)
        val lngRange = (maxLng - minLng).coerceAtLeast(0.01)
        val x = ((lng - minLng) / lngRange * (width - 160f) + 80f).toFloat()
        val y = ((maxLat - lat) / latRange * (height - 160f) + 80f).toFloat()
        return Offset(x, y)
    }

    val demandsMap = remember(mobilityData) {
        mobilityData?.zoneDemand?.associateBy { it.zoneId } ?: emptyMap()
    }

    val selectedDemand = demandsMap[selectedZoneId]
    val selectedZone = zones.find { it.id == selectedZoneId } ?: zones.firstOrNull()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkSlate)
    ) {
        // Top App Bar
        TopAppBar(
            title = {
                Column {
                    Text(
                        text = "Mapa de Mobilidade em Tempo Real",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Text(
                        text = "São Sebastião • Coordenadas Reais GPS",
                        color = TextSecondary,
                        fontSize = 11.sp
                    )
                }
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Voltar", tint = EmeraldGreen)
                }
            },
            actions = {
                IconButton(onClick = onRefresh) {
                    Icon(
                        Icons.Default.Refresh,
                        contentDescription = "Atualizar",
                        tint = if (isLoading) Color.Gray else EmeraldGreen
                    )
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = SurfaceSlate)
        )

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .background(Color(0xFF020617))
        ) {
            val cameraPositionState = rememberCameraPositionState {
                position = CameraPosition.fromLatLngZoom(LatLng(-23.8078, -45.4058), 12f)
            }
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraPositionState,
                properties = MapProperties(
                    mapStyleOptions = MapStyleOptions("""[{"elementType":"geometry","stylers":[{"color":"#212121"}]},{"elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#757575"}]},{"elementType":"labels.text.stroke","stylers":[{"color":"#212121"}]},{"featureType":"administrative","elementType":"geometry","stylers":[{"color":"#757575"}]},{"featureType":"administrative.country","elementType":"labels.text.fill","stylers":[{"color":"#9e9e9e"}]},{"featureType":"administrative.land_parcel","stylers":[{"visibility":"off"}]},{"featureType":"administrative.locality","elementType":"labels.text.fill","stylers":[{"color":"#bdbdbd"}]},{"featureType":"poi","elementType":"labels.text.fill","stylers":[{"color":"#757575"}]},{"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#181818"}]},{"featureType":"poi.park","elementType":"labels.text.fill","stylers":[{"color":"#616161"}]},{"featureType":"poi.park","elementType":"labels.text.stroke","stylers":[{"color":"#1b1b1b"}]},{"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#2c2c2c"}]},{"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#8a8a8a"}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#373737"}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#3c3c3c"}]},{"featureType":"road.highway.controlled_access","elementType":"geometry","stylers":[{"color":"#4e4e4e"}]},{"featureType":"road.local","elementType":"labels.text.fill","stylers":[{"color":"#616161"}]},{"featureType":"transit","elementType":"labels.text.fill","stylers":[{"color":"#757575"}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#000000"}]},{"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#3d3d3d"}]}]"""),
                    isMyLocationEnabled = true
                )
            ) {
                // Marker drawing logic here if needed based on selectedZone
                if (selectedZone != null) {
                    Marker(state = MarkerState(position = LatLng(selectedZone.lat, selectedZone.lng)))
                }
            }

            // Interactive Zone Click Overlay
            zones.forEach { zone ->
                val demand = demandsMap[zone.id]
                val isSurge = demand?.isSurgeActive == true
                val isSelected = zone.id == selectedZoneId

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                ) {
                    // Position overlay card near selected zone
                    if (isSelected) {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = SurfaceSlate.copy(alpha = 0.95f)),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, if (isSurge) Color(0xFFF59E0B) else EmeraldGreen),
                            modifier = Modifier
                                .align(Alignment.TopCenter)
                                .padding(top = 16.dp, start = 16.dp, end = 16.dp)
                                .fillMaxWidth()
                        ) {
                            // ... existing card content ...
                            Row(
                                modifier = Modifier
                                    .padding(14.dp)
                                    .fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = zone.name,
                                            color = Color.White,
                                            fontWeight = FontWeight.Black,
                                            fontSize = 16.sp
                                        )
                                        if (isSurge) {
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Badge(containerColor = Color(0xFFF59E0B)) {
                                                Text(
                                                    text = "⚡ ${demand?.multiplier ?: 1.0}x",
                                                    color = Color.Black,
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "${demand?.onlineDrivers ?: 0} motorista(s) ativo(s) • ${demand?.activeRequests ?: 0} chamada(s) • ~${demand?.estimatedPickupMin ?: 5} min busca",
                                        color = TextSecondary,
                                        fontSize = 12.sp
                                    )
                                }

                                Badge(
                                    containerColor = if (isSurge) Color(0xFF78350F) else Color(0xFF065F46)
                                ) {
                                    Text(
                                        text = if (isSurge) "ALTA DEMANDA" else "NORMAL",
                                        color = if (isSurge) Color(0xFFFDE68A) else Color(0xFFA7F3D0),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Loading Indicator
            if (isLoading) {
                CircularProgressIndicator(
                    color = EmeraldGreen,
                    modifier = Modifier
                        .align(Alignment.Center)
                        .size(36.dp)
                )
            }
        }

        // Horizontal Zone Selection Row at Bottom
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(SurfaceSlate)
                .padding(vertical = 12.dp, horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Selecione a Região de São Sebastião:",
                color = TextSecondary,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(zones) { zone ->
                    val demand = demandsMap[zone.id]
                    val isSurge = demand?.isSurgeActive == true
                    val isSelected = zone.id == selectedZoneId

                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) EmeraldGreen.copy(alpha = 0.25f) else DarkSlate
                        ),
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(
                            1.dp,
                            if (isSelected) EmeraldGreen else if (isSurge) Color(0xFFF59E0B) else Color.Transparent
                        ),
                        modifier = Modifier.clickable { selectedZoneId = zone.id }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = zone.name,
                                color = if (isSelected) Color.White else Color.LightGray,
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                            if (isSurge) {
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "⚡",
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
