package com.vaicar.app

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun LivePassengerMapView(
    ride: Ride,
    liveLocation: DriverLocation?,
    onCancelRide: () -> Unit
) {
    val context = LocalContext.current

    // Pulsing animation for the passenger pickup marker
    val infiniteTransition = rememberInfiniteTransition(label = "markerPulse")
    val pulseRadius by infiniteTransition.animateFloat(
        initialValue = 10f,
        targetValue = 28f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "pulseRadius"
    )
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "pulseAlpha"
    )

    // Smooth coordinate interpolation for car marker
    val animatedCarX by animateFloatAsState(
        targetValue = if (liveLocation != null) 0.65f else 0.75f,
        animationSpec = tween(durationMillis = 800, easing = LinearEasing),
        label = "carX"
    )
    val animatedCarY by animateFloatAsState(
        targetValue = if (liveLocation != null) 0.45f else 0.60f,
        animationSpec = tween(durationMillis = 800, easing = LinearEasing),
        label = "carY"
    )

    // Calculate real waiting timer if driver arrived
    var elapsedSeconds by remember { mutableStateOf(0L) }
    LaunchedEffect(ride.arrivedAt, ride.status) {
        while (ride.status == "ARRIVED" || (ride.arrivedAt != null && ride.status != "COMPLETED")) {
            val arrivedTimeMs = try {
                if (!ride.arrivedAt.isNullOrBlank()) {
                    val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                        timeZone = TimeZone.getTimeZone("UTC")
                    }
                    format.parse(ride.arrivedAt.substring(0, 19))?.time ?: System.currentTimeMillis()
                } else {
                    System.currentTimeMillis()
                }
            } catch (e: Exception) {
                System.currentTimeMillis()
            }
            elapsedSeconds = ((System.currentTimeMillis() - arrivedTimeMs) / 1000).coerceAtLeast(0)
            delay(1000)
        }
    }

    val elapsedMinutes = (elapsedSeconds / 60).toInt()
    val remSeconds = (elapsedSeconds % 60).toInt()
    val isFreeWait = elapsedMinutes < 4
    val freeWaitRemainingSec = if (isFreeWait) (4 * 60) - elapsedSeconds.toInt() else 0
    val freeWaitMinutes = freeWaitRemainingSec / 60
    val freeWaitSecs = freeWaitRemainingSec % 60
    val waitingFeeAccrued = if (isFreeWait) 0.0 else (elapsedMinutes - 4) * 0.50

    val isDriverArrived = ride.status == "ARRIVED" || ride.status == "DRIVER_ARRIVING"
    val isInTrip = ride.status == "IN_PROGRESS"

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // =========================================================================
        // 1. REAL-TIME MAP CANVAS (WITH DRIVER CAR & PASSENGER PINS)
        // =========================================================================
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
            border = BorderStroke(1.dp, Color(0xFF334155)),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(260.dp)
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                // Vector Map Drawing
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val w = size.width
                    val h = size.height

                    // Background Grid / Coastline styling for São Sebastião
                    drawRect(
                        brush = Brush.verticalGradient(
                            colors = listOf(Color(0xFF0B1329), Color(0xFF0F172A), Color(0xFF06202A))
                        )
                    )

                    // Road Network lines
                    val roadColor = Color(0xFF1E293B)
                    drawLine(roadColor, Offset(0f, h * 0.35f), Offset(w, h * 0.40f), strokeWidth = 14f)
                    drawLine(roadColor, Offset(w * 0.25f, 0f), Offset(w * 0.30f, h), strokeWidth = 12f)
                    drawLine(roadColor, Offset(w * 0.15f, h * 0.70f), Offset(w * 0.85f, h * 0.25f), strokeWidth = 16f)

                    // Route Trajectory Line (Emerald Neon)
                    val pickupOffset = Offset(w * 0.30f, h * 0.65f)
                    val destOffset = Offset(w * 0.80f, h * 0.25f)
                    val driverOffset = if (isDriverArrived) {
                        pickupOffset
                    } else if (isInTrip) {
                        Offset(w * 0.55f, h * 0.45f)
                    } else {
                        Offset(w * animatedCarX, h * animatedCarY)
                    }

                    // Draw route path
                    val routePath = Path().apply {
                        moveTo(driverOffset.x, driverOffset.y)
                        if (!isDriverArrived && !isInTrip) {
                            lineTo(pickupOffset.x, pickupOffset.y)
                        } else {
                            lineTo(destOffset.x, destOffset.y)
                        }
                    }

                    drawPath(
                        path = routePath,
                        color = EmeraldGreen,
                        style = Stroke(
                            width = 6f,
                            pathEffect = PathEffect.dashPathEffect(floatArrayOf(20f, 15f), 0f)
                        )
                    )

                    // Draw Passenger Pickup Marker (Green)
                    drawCircle(
                        color = EmeraldGreen.copy(alpha = pulseAlpha),
                        radius = pulseRadius,
                        center = pickupOffset
                    )
                    drawCircle(
                        color = Color(0xFF065F46),
                        radius = 12f,
                        center = pickupOffset
                    )
                    drawCircle(
                        color = EmeraldGreen,
                        radius = 6f,
                        center = pickupOffset
                    )

                    // Draw Destination Marker (Cyan)
                    drawCircle(
                        color = Color(0xFF0284C7),
                        radius = 12f,
                        center = destOffset
                    )
                    drawCircle(
                        color = Color(0xFF38BDF8),
                        radius = 6f,
                        center = destOffset
                    )

                    // Draw Driver Vehicle Marker (Bright Car Pin with bearing)
                    drawCircle(
                        color = Color.Black,
                        radius = 18f,
                        center = driverOffset
                    )
                    drawCircle(
                        color = EmeraldGreen,
                        radius = 14f,
                        center = driverOffset
                    )
                    drawCircle(
                        color = Color(0xFF022C22),
                        radius = 8f,
                        center = driverOffset
                    )
                }

                // Map Overlay Badges & Labels
                // Top Live GPS Badge
                Row(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(12.dp)
                        .background(Color(0xFF0B1329).copy(alpha = 0.9f), RoundedCornerShape(8.dp))
                        .border(1.dp, if (liveLocation?.isStale == true) Color(0xFFF59E0B) else EmeraldGreen, RoundedCornerShape(8.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(if (liveLocation?.isStale == true) Color(0xFFF59E0B) else EmeraldGreen, CircleShape)
                    )
                    Text(
                        text = if (liveLocation == null) {
                            "Aguardando GPS do Motorista..."
                        } else if (liveLocation.isStale) {
                            "⚠️ Sinal GPS pausado (${liveLocation.secondsAgo ?: 30}s atrás)"
                        } else {
                            "GPS AO VIVO • Motorista em tempo real"
                        },
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // ETA Pill on Map
                if (liveLocation?.distanceKm != null || liveLocation?.etaMinutes != null) {
                    Row(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(12.dp)
                            .background(Color(0xFF065F46).copy(alpha = 0.95f), RoundedCornerShape(10.dp))
                            .border(1.dp, EmeraldGreen, RoundedCornerShape(10.dp))
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Default.Schedule, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                        Text(
                            text = if (isDriverArrived) {
                                "MOTORISTA NO LOCAL"
                            } else {
                                "Distância: ${liveLocation.distanceKm ?: 1.0} km • Chegada em ~${liveLocation.etaMinutes ?: 3} min"
                            },
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
            }
        }

        // =========================================================================
        // 2. LIVE STATUS & ARRIVAL NOTIFICATION CARD
        // =========================================================================
        Card(
            colors = CardDefaults.cardColors(
                containerColor = if (isDriverArrived) Color(0xFF022C22) else SurfaceSlate
            ),
            border = BorderStroke(1.dp, if (isDriverArrived) EmeraldGreen else Color(0xFF334155)),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Status Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(
                            imageVector = if (isDriverArrived) Icons.Default.CheckCircle else Icons.Default.DirectionsCar,
                            contentDescription = null,
                            tint = EmeraldGreen,
                            modifier = Modifier.size(22.dp)
                        )
                        Text(
                            text = when (ride.status) {
                                "ACCEPTED", "EN_ROUTE" -> "Seu motorista está a caminho 🚗"
                                "ARRIVED", "DRIVER_ARRIVING" -> "Seu motorista chegou! 📍"
                                "IN_PROGRESS" -> "Viagem em andamento rumo ao destino 🏁"
                                else -> "Corrida em andamento"
                            },
                            color = Color.White,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                // Driver & Vehicle Details
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(ride.driverName ?: "Motorista Parceiro", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text(
                            "${ride.driverVehicle} ${if (!ride.driverLicensePlate.isNullOrBlank()) "• Placa: ${ride.driverLicensePlate}" else ""}",
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                    }

                    val contactPhone = ride.driverPhone ?: ""
                    if (contactPhone.isNotBlank()) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            IconButton(
                                onClick = {
                                    val digits = contactPhone.replace("\\D".toRegex(), "")
                                    val cleanNum = if (digits.startsWith("55")) digits else "55$digits"
                                    val uri = Uri.parse("https://api.whatsapp.com/send?phone=$cleanNum&text=${Uri.encode("Olá motorista, sou o passageiro ${ride.passengerName} da corrida VaiCar.")}")
                                    context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                                },
                                modifier = Modifier
                                    .size(36.dp)
                                    .background(Color(0xFF065F46), CircleShape)
                            ) {
                                Icon(Icons.Default.Chat, contentDescription = "WhatsApp", tint = EmeraldGreen, modifier = Modifier.size(18.dp))
                            }

                            IconButton(
                                onClick = {
                                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$contactPhone"))
                                    context.startActivity(intent)
                                },
                                modifier = Modifier
                                    .size(36.dp)
                                    .background(Color(0xFF1E293B), CircleShape)
                            ) {
                                Icon(Icons.Default.Phone, contentDescription = "Ligar", tint = Color.White, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }

                // =========================================================================
                // 3. WAITING TIMER & FREE PERIOD DISPLAY (SECTION 9 & 10)
                // =========================================================================
                if (isDriverArrived) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF0B1329)),
                        border = BorderStroke(1.dp, if (isFreeWait) EmeraldGreen else AccentRed),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = if (isFreeWait) "Tolerância Grátis de Espera ⏳" else "Tempo Adicional de Espera 🕒",
                                color = if (isFreeWait) EmeraldGreen else AccentRed,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                            Text(
                                text = if (isFreeWait) "%02d:%02d".format(freeWaitMinutes, freeWaitSecs) else "+%02d:%02d".format(elapsedMinutes - 4, remSeconds),
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 22.sp
                            )
                            Text(
                                text = if (isFreeWait) "4 minutos gratuitos para seu embarque com segurança." else "Taxa de espera: R$ ${"%.2f".format(waitingFeeAccrued)} (R$ 0,50/min)",
                                color = TextSecondary,
                                fontSize = 11.sp
                            )
                        }
                    }
                }

                // Google Maps Direct Route Button
                Button(
                    onClick = {
                        val dLat = liveLocation?.lat ?: -23.8078
                        val dLng = liveLocation?.lng ?: -45.4058
                        val origLat = ride.originLat ?: -23.8078
                        val origLng = ride.originLng ?: -45.4058
                        val uri = Uri.parse("https://www.google.com/maps/dir/?api=1&origin=$dLat,$dLng&destination=$origLat,$origLng&travelmode=driving")
                        context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                    border = BorderStroke(1.dp, Color(0xFF38BDF8)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Place, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Abrir Trajeto no Google Maps 🗺", color = Color(0xFF38BDF8), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }

                // Cancel button before trip start
                if (ride.status == "ACCEPTED" || ride.status == "ARRIVED") {
                    OutlinedButton(
                        onClick = onCancelRide,
                        border = BorderStroke(1.dp, AccentRed),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Cancelar Viagem", color = AccentRed, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
