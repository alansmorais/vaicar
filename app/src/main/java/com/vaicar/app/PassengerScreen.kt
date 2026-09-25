package com.vaicar.app

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Address
import android.location.Geocoder
import android.location.Location
import android.net.Uri
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MapStyleOptions
import com.google.maps.android.compose.*
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.*
import kotlin.math.*

// ==============================================================================
// GEOGRAPHICAL & REVERSE GEOCODING HELPERS (REAL INFRASTRUCTURE)
// ==============================================================================

fun calculateDistanceKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val r = 6371.0 // Earth radius in km
    val dLat = Math.toRadians(lat2 - lat1)
    val dLon = Math.toRadians(lon2 - lon1)
    val a = sin(dLat / 2) * sin(dLat / 2) +
            cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
            sin(dLon / 2) * sin(dLon / 2)
    val c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return r * c * 1.25 // 1.25 winding factor for coastal highway SP-055
}

fun findClosestZone(lat: Double, lng: Double, zones: List<Zone>): Zone? {
    if (zones.isEmpty()) return null
    return zones.minByOrNull { z ->
        val dLat = z.lat - lat
        val dLng = z.lng - lng
        dLat * dLat + dLng * dLng
    }
}

suspend fun reverseGeocodeCoordinate(context: Context, lat: Double, lng: Double, fallbackZoneName: String): String {
    return withContext(Dispatchers.IO) {
        try {
            val geocoder = Geocoder(context, Locale("pt", "BR"))
            val addresses = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                var syncResult: List<Address>? = null
                val lock = Object()
                geocoder.getFromLocation(lat, lng, 1) { addrs ->
                    synchronized(lock) {
                        syncResult = addrs
                        lock.notifyAll()
                    }
                }
                synchronized(lock) {
                    if (syncResult == null) lock.wait(1500)
                }
                syncResult
            } else {
                @Suppress("DEPRECATION")
                geocoder.getFromLocation(lat, lng, 1)
            }

            val addr = addresses?.firstOrNull()
            if (addr != null) {
                val street = addr.thoroughfare ?: ""
                val number = addr.subThoroughfare ?: ""
                val neighborhood = addr.subLocality ?: addr.locality ?: fallbackZoneName
                val parts = listOf(
                    if (street.isNotBlank() && number.isNotBlank()) "$street, $number" else street,
                    neighborhood,
                    "São Sebastião - SP"
                ).filter { it.isNotBlank() }
                if (parts.isNotEmpty()) parts.joinToString(", ") else "$fallbackZoneName, São Sebastião - SP"
            } else {
                "$fallbackZoneName, São Sebastião - SP"
            }
        } catch (_: Exception) {
            "$fallbackZoneName, São Sebastião - SP"
        }
    }
}

suspend fun geocodePlaceQuery(context: Context, query: String, zones: List<Zone>): List<PlaceSearchResult> {
    val results = mutableListOf<PlaceSearchResult>()
    val cleanQuery = query.trim().lowercase(Locale.ROOT)
    if (cleanQuery.isBlank()) return results

    // 1. Match from official São Sebastião municipal zones
    zones.filter { z ->
        z.name.lowercase(Locale.ROOT).contains(cleanQuery) ||
                z.slug.lowercase(Locale.ROOT).contains(cleanQuery)
    }.forEach { z ->
        results.add(
            PlaceSearchResult(
                title = z.name,
                subtitle = "Região / Bairro de São Sebastião • SP",
                lat = z.lat,
                lng = z.lng,
                zone = z,
                isZone = true
            )
        )
    }

    // 2. Query Android Geocoder for street/establishment results
    withContext(Dispatchers.IO) {
        try {
            val geocoder = Geocoder(context, Locale("pt", "BR"))
            val fullQuery = if (!cleanQuery.contains("são sebastião") && !cleanQuery.contains("sao sebastiao")) {
                "$query, São Sebastião, SP"
            } else {
                query
            }
            @Suppress("DEPRECATION")
            val addrs = geocoder.getFromLocationName(fullQuery, 5)
            addrs?.forEach { addr ->
                val line = addr.getAddressLine(0) ?: ""
                val feature = addr.featureName ?: addr.thoroughfare ?: line
                if (feature.isNotBlank() && results.none { it.lat == addr.latitude && it.lng == addr.longitude }) {
                    val matchingZone = findClosestZone(addr.latitude, addr.longitude, zones)
                    results.add(
                        PlaceSearchResult(
                            title = feature,
                            subtitle = line.ifBlank { "São Sebastião - SP" },
                            lat = addr.latitude,
                            lng = addr.longitude,
                            zone = matchingZone,
                            isZone = false
                        )
                    )
                }
            }
        } catch (_: Exception) {}
    }

    return results
}

data class PlaceSearchResult(
    val title: String,
    val subtitle: String,
    val lat: Double,
    val lng: Double,
    val zone: Zone?,
    val isZone: Boolean
)

// ==============================================================================
// NATIVE MAP-FIRST COMPOSABLE (JETPACK COMPOSE)
// ==============================================================================

@Composable
fun NativeInteractivePassengerMap(
    centerLat: Double,
    centerLng: Double,
    pickupLat: Double,
    pickupLng: Double,
    destLat: Double?,
    destLng: Double?,
    pickupAddress: String,
    destAddress: String?,
    zones: List<Zone>,
    activeRide: Ride?,
    liveDriverLocation: DriverLocation?,
    isSelectingDestination: Boolean,
    onMapCenterChanged: (Double, Double) -> Unit,
    onCenterOnGps: () -> Unit,
    modifier: Modifier = Modifier
) {
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(LatLng(centerLat, centerLng), 14f)
    }

    // Update camera when center changes
    LaunchedEffect(centerLat, centerLng) {
        cameraPositionState.position = CameraPosition.fromLatLngZoom(LatLng(centerLat, centerLng), cameraPositionState.position.zoom)
    }

    Box(modifier = modifier.fillMaxSize()) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties = MapProperties(
                mapStyleOptions = MapStyleOptions(
                    """[{"elementType":"geometry","stylers":[{"color":"#212121"}]},{"elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#757575"}]},{"elementType":"labels.text.stroke","stylers":[{"color":"#212121"}]},{"featureType":"administrative","elementType":"geometry","stylers":[{"color":"#757575"}]},{"featureType":"administrative.country","elementType":"labels.text.fill","stylers":[{"color":"#9e9e9e"}]},{"featureType":"administrative.land_parcel","stylers":[{"visibility":"off"}]},{"featureType":"administrative.locality","elementType":"labels.text.fill","stylers":[{"color":"#bdbdbd"}]},{"featureType":"poi","elementType":"labels.text.fill","stylers":[{"color":"#757575"}]},{"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#181818"}]},{"featureType":"poi.park","elementType":"labels.text.fill","stylers":[{"color":"#616161"}]},{"featureType":"poi.park","elementType":"labels.text.stroke","stylers":[{"color":"#1b1b1b"}]},{"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#2c2c2c"}]},{"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#8a8a8a"}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#373737"}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#3c3c3c"}]},{"featureType":"road.highway.controlled_access","elementType":"geometry","stylers":[{"color":"#4e4e4e"}]},{"featureType":"road.local","elementType":"labels.text.fill","stylers":[{"color":"#616161"}]},{"featureType":"transit","elementType":"labels.text.fill","stylers":[{"color":"#757575"}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#000000"}]},{"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#3d3d3d"}]}]"""
                ),
                isMyLocationEnabled = true
            ),
            uiSettings = MapUiSettings(
                zoomControlsEnabled = false,
                myLocationButtonEnabled = false
            ),
            onMapLoaded = {
                onMapCenterChanged(cameraPositionState.position.target.latitude, cameraPositionState.position.target.longitude)
            }
        ) {
            // Draw markers here
            if (pickupLat != 0.0 && pickupLng != 0.0) {
                 Marker(
                    state = MarkerState(position = LatLng(pickupLat, pickupLng)),
                    title = "Embarque"
                )
            }
        }
        
        
        // Centered Pickup Pin Overlay (Active when user is adjusting pickup location)
        if (destLat == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = 70.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Surface(
                        color = Color(0xFF0F172A),
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, Color(0xFF10B981)),
                        shadowElevation = 6.dp
                    ) {
                        Text(
                            text = "📍 Local de Embarque",
                            color = Color(0xFF10B981),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                        )
                    }
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = "Ponto de Embarque Central",
                        tint = Color(0xFF10B981),
                        modifier = Modifier
                            .size(44.dp)
                            .shadow(8.dp, CircleShape)
                    )
                    Box(
                        modifier = Modifier
                            .size(10.dp, 4.dp)
                            .background(Color.Black.copy(alpha = 0.6f), CircleShape)
                    )
                }
            }
        }

        // Floating Map Controls (Top Right)
        Column(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 16.dp, end = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // "Minha Localização" GPS Center Button
            FilledIconButton(
                onClick = onCenterOnGps,
                colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color(0xFF1E293B)),
                modifier = Modifier.size(46.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.MyLocation,
                    contentDescription = "Usar minha localização",
                    tint = Color(0xFF10B981),
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

// ==============================================================================
// MAIN PASSENGER SCREEN (MAP-FIRST ARCHITECTURE)
// ==============================================================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PassengerScreen(zones: List<Zone>, onBack: () -> Unit) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var selectedTab by remember { mutableStateOf(0) } // 0: Viagem, 1: Praias & Zonas, 2: Perfil

    // Progressive Ride Booking Steps:
    // 1: PICKUP_SEARCH (Map centered on pickup pin, [Para onde vamos?])
    // 2: ROUTE_SUMMARY (Pickup + Destination displayed, Distance, Time, Fare, [Continuar])
    // 3: DRIVER_SELECTION (Selected driver details, ETA, Plate, [SOLICITAR CORRIDA])
    var rideBookingStep by remember { mutableStateOf(1) }

    // Real Coordinates State
    var mapCenterLat by remember { mutableStateOf(-23.8078) }
    var mapCenterLng by remember { mutableStateOf(-45.4058) }

    var pickupLat by remember { mutableStateOf(-23.8078) }
    var pickupLng by remember { mutableStateOf(-45.4058) }
    var pickupAddress by remember { mutableStateOf("Centro Histórico, São Sebastião - SP") }
    var originZone by remember { mutableStateOf<Zone?>(zones.find { it.id == "z-centro" } ?: zones.firstOrNull()) }

    var destLat by remember { mutableStateOf<Double?>(null) }
    var destLng by remember { mutableStateOf<Double?>(null) }
    var destAddress by remember { mutableStateOf<String?>(null) }
    var destZone by remember { mutableStateOf<Zone?>(null) }

    // Dialogs & Modals
    var isOriginSearchOpen by remember { mutableStateOf(false) }
    var isDestinationSearchOpen by remember { mutableStateOf(false) }
    var rideErrorDialogMessage by remember { mutableStateOf<String?>(null) }

    // Real Available Drivers & Selection
    var availableDrivers by remember { mutableStateOf<List<SearchResult>>(emptyList()) }
    var selectedDriver by remember { mutableStateOf<SearchResult?>(null) }
    var searchResponse by remember { mutableStateOf<SearchDriversResponse?>(null) }
    var isSearchingDrivers by remember { mutableStateOf(false) }

    // Passenger Profile & Ride state
    var passengerName by remember { mutableStateOf(SecurityUtils.getPassengerName(context).ifBlank { "Alan" }) }
    var passengerPhone by remember { mutableStateOf(SecurityUtils.getPassengerPhone(context).ifBlank { "+551299999999" }) }
    var currentRide by remember { mutableStateOf<Ride?>(null) }
    var liveDriverLocation by remember { mutableStateOf<DriverLocation?>(null) }
    var message by remember { mutableStateOf("") }
    var isSubmittingRide by remember { mutableStateOf(false) }

    // Real GPS Location Manager
    fun updateWithRealGps(loc: Location) {
        pickupLat = loc.latitude
        pickupLng = loc.longitude
        mapCenterLat = loc.latitude
        mapCenterLng = loc.longitude
        val nearest = findClosestZone(loc.latitude, loc.longitude, zones)
        originZone = nearest
        coroutineScope.launch {
            val addr = reverseGeocodeCoordinate(context, loc.latitude, loc.longitude, nearest?.name ?: "São Sebastião")
            pickupAddress = addr
        }
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { perms ->
        val fineGranted = perms[Manifest.permission.ACCESS_FINE_LOCATION] == true
        val coarseGranted = perms[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (fineGranted || coarseGranted) {
            val last = DriverLocationManager.getLastKnownLocation(context)
            if (last != null) {
                updateWithRealGps(last)
            }
        }
    }

    // Refresh route pricing and fetch authorized available drivers from backend
    fun refreshRouteAndDrivers() {
        isSearchingDrivers = true
        ApiService.searchDrivers(
            originId = originZone?.id ?: "z-centro",
            destId = destZone?.id ?: "z-maresias",
            passengerCount = 1,
            onSuccess = { res ->
                isSearchingDrivers = false
                searchResponse = res
                availableDrivers = res.results
                if (selectedDriver == null || !res.results.any { it.driverId == selectedDriver?.driverId }) {
                    selectedDriver = res.results.firstOrNull()
                }
            },
            onError = {
                isSearchingDrivers = false
            }
        )
    }

    // Initialize Real Location and Load Initial Drivers
    LaunchedEffect(Unit) {
        if (DriverLocationManager.hasLocationPermission(context)) {
            val last = DriverLocationManager.getLastKnownLocation(context)
            if (last != null) {
                updateWithRealGps(last)
            }
        } else {
            locationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
        refreshRouteAndDrivers()
    }

    // Active Ride Polling
    val currentRideId = currentRide?.id
    LaunchedEffect(currentRideId) {
        if (currentRideId != null) {
            while (true) {
                ApiService.getRide(
                    rideId = currentRideId,
                    onSuccess = { updated ->
                        currentRide = updated
                        if (updated.driverLocation != null) {
                            liveDriverLocation = updated.driverLocation
                        }
                    },
                    onError = {}
                )
                if (currentRide?.status in listOf("ACCEPTED", "EN_ROUTE", "DRIVER_ARRIVING", "ARRIVED", "IN_PROGRESS")) {
                    ApiService.fetchDriverLocation(
                        rideId = currentRideId,
                        passengerPhone = passengerPhone,
                        onSuccess = { loc, _, _ ->
                            if (loc != null) liveDriverLocation = loc
                        },
                        onError = {}
                    )
                }
                delay(2500)
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "VaiCar Passageiro",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        Text(
                            text = "São Sebastião • Mobilidade Municipal",
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Voltar", tint = Color(0xFF10B981))
                    }
                },
                actions = {
                    IconButton(onClick = {
                        val last = DriverLocationManager.getLastKnownLocation(context)
                        if (last != null) {
                            updateWithRealGps(last)
                            message = "Localização GPS atualizada com sucesso!"
                        } else {
                            message = "GPS indisponível no momento."
                        }
                        refreshRouteAndDrivers()
                    }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Atualizar", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0F172A))
            )
        },
        bottomBar = {
            NavigationBar(containerColor = Color(0xFF0F172A)) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.DirectionsCar, contentDescription = null) },
                    label = { Text("Viagem", fontWeight = FontWeight.Bold, fontSize = 12.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF10B981),
                        selectedTextColor = Color(0xFF10B981),
                        unselectedIconColor = Color(0xFF64748B),
                        unselectedTextColor = Color(0xFF64748B),
                        indicatorColor = Color(0xFF022C22)
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.Place, contentDescription = null) },
                    label = { Text("Zonas & Praias", fontWeight = FontWeight.Bold, fontSize = 12.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF10B981),
                        selectedTextColor = Color(0xFF10B981),
                        unselectedIconColor = Color(0xFF64748B),
                        unselectedTextColor = Color(0xFF64748B),
                        indicatorColor = Color(0xFF022C22)
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Default.Person, contentDescription = null) },
                    label = { Text("Meu Perfil", fontWeight = FontWeight.Bold, fontSize = 12.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF10B981),
                        selectedTextColor = Color(0xFF10B981),
                        unselectedIconColor = Color(0xFF64748B),
                        unselectedTextColor = Color(0xFF64748B),
                        indicatorColor = Color(0xFF022C22)
                    )
                )
            }
        },
        containerColor = Color(0xFF0B132B)
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // TAB 0: VIAGEM (MAP-FIRST REAL EXPERIENCE)
            if (selectedTab == 0) {
                // 1. FULLSCREEN NATIVE MAP (Occupies the majority of the screen)
                NativeInteractivePassengerMap(
                    centerLat = mapCenterLat,
                    centerLng = mapCenterLng,
                    pickupLat = pickupLat,
                    pickupLng = pickupLng,
                    destLat = destLat,
                    destLng = destLng,
                    pickupAddress = pickupAddress,
                    destAddress = destAddress,
                    zones = zones,
                    activeRide = currentRide,
                    liveDriverLocation = liveDriverLocation,
                    isSelectingDestination = destAddress == null,
                    onMapCenterChanged = { newLat, newLng ->
                        mapCenterLat = newLat
                        mapCenterLng = newLng
                        if (destAddress == null) {
                            pickupLat = newLat
                            pickupLng = newLng
                            val nearest = findClosestZone(newLat, newLng, zones)
                            originZone = nearest
                            coroutineScope.launch {
                                pickupAddress = reverseGeocodeCoordinate(
                                    context,
                                    newLat,
                                    newLng,
                                    nearest?.name ?: "São Sebastião"
                                )
                            }
                        }
                    },
                    onCenterOnGps = {
                        val loc = DriverLocationManager.getLastKnownLocation(context)
                        if (loc != null) {
                            updateWithRealGps(loc)
                            message = "Mapa centralizado no seu GPS real."
                        } else {
                            message = "GPS indisponível no momento."
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                )

                // 2. BOTTOM PROGRESSIVE SHEET
                if (currentRide == null) {
                    Surface(
                        color = Color(0xFF0F172A).copy(alpha = 0.98f),
                        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                        border = BorderStroke(1.dp, Color(0xFF1E293B)),
                        shadowElevation = 20.dp,
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier
                                .padding(18.dp)
                                .fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            // Top Drag Handle
                            Box(
                                modifier = Modifier
                                    .size(36.dp, 4.dp)
                                    .background(Color(0xFF334155), CircleShape)
                                    .align(Alignment.CenterHorizontally)
                            )

                            // -------------------------------------------------------------
                            // STEP 1: INITIAL STATE (PICKUP + "PARA ONDE VAMOS?")
                            // -------------------------------------------------------------
                            if (destAddress == null || rideBookingStep == 1) {
                                // Pickup location display card
                                Surface(
                                    onClick = { isOriginSearchOpen = true },
                                    color = Color(0xFF1E293B),
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .padding(horizontal = 14.dp, vertical = 10.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.LocationOn,
                                                contentDescription = null,
                                                tint = Color(0xFF10B981),
                                                modifier = Modifier.size(22.dp)
                                            )
                                            Spacer(modifier = Modifier.width(10.dp))
                                            Column {
                                                Text(
                                                    text = "Local de Embarque",
                                                    color = Color(0xFF94A3B8),
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.SemiBold
                                                )
                                                Text(
                                                    text = pickupAddress,
                                                    color = Color.White,
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }
                                        }

                                        Icon(
                                            imageVector = Icons.Default.Edit,
                                            contentDescription = "Editar local de embarque",
                                            tint = Color(0xFF94A3B8),
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }

                                Text(
                                    text = "💡 Arraste o mapa para mover o pino até o local exato de embarque.",
                                    color = Color(0xFF64748B),
                                    fontSize = 11.sp
                                )

                                // Primary Destination Action Button: "Para onde vamos?"
                                Surface(
                                    onClick = { isDestinationSearchOpen = true },
                                    color = Color(0xFF022C22),
                                    shape = RoundedCornerShape(14.dp),
                                    border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.5f)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(16.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Search,
                                            contentDescription = null,
                                            tint = Color(0xFF10B981),
                                            modifier = Modifier.size(24.dp)
                                        )
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Text(
                                            text = "Para onde vamos?",
                                            color = Color.White,
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }

                                // Usar Minha Localização
                                TextButton(
                                    onClick = {
                                        val loc = DriverLocationManager.getLastKnownLocation(context)
                                        if (loc != null) {
                                            updateWithRealGps(loc)
                                            message = "Localização redefinida para o seu GPS."
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(Icons.Default.MyLocation, contentDescription = null, tint = Color(0xFF10B981))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "Usar minha localização",
                                        color = Color(0xFF10B981),
                                        fontWeight = FontWeight.Bold
                                    )
                                }

                                // Availability representation
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.DirectionsCar,
                                        contentDescription = null,
                                        tint = Color(0xFF10B981),
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = if (availableDrivers.isNotEmpty()) {
                                            "${availableDrivers.size} motorista(s) credenciado(s) disponível(is)"
                                        } else {
                                            "Consultando motoristas credenciados online..."
                                        },
                                        color = Color(0xFF94A3B8),
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }

                            // -------------------------------------------------------------
                            // STEP 2: ROUTE SUMMARY (AFTER DESTINATION IS SELECTED)
                            // -------------------------------------------------------------
                            else if (rideBookingStep == 2) {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    // Route Card
                                    Card(
                                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                                        shape = RoundedCornerShape(14.dp),
                                        border = BorderStroke(1.dp, Color(0xFF334155)),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(
                                            modifier = Modifier.padding(14.dp),
                                            verticalArrangement = Arrangement.spacedBy(10.dp)
                                        ) {
                                            // Pickup row
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(
                                                    Icons.Default.LocationOn,
                                                    contentDescription = null,
                                                    tint = Color(0xFF10B981),
                                                    modifier = Modifier.size(18.dp)
                                                )
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text(
                                                    text = pickupAddress,
                                                    color = Color.White,
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.SemiBold,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }

                                            Divider(color = Color(0xFF334155), thickness = 0.5.dp)

                                            // Destination row
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(
                                                    Icons.Default.Flag,
                                                    contentDescription = null,
                                                    tint = Color(0xFF06B6D4),
                                                    modifier = Modifier.size(18.dp)
                                                )
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text(
                                                    text = destAddress ?: "Destino selecionado",
                                                    color = Color.White,
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.SemiBold,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }
                                        }
                                    }

                                    // Metrics summary (Distance, Estimated Time, Fare)
                                    val distance = searchResponse?.distanceKm
                                        ?: (if (destLat != null && destLng != null) calculateDistanceKm(pickupLat, pickupLng, destLat!!, destLng!!) else 10.0)
                                    val duration = searchResponse?.estimatedDurationMin ?: Math.max(5, (distance * 1.4).toInt())
                                    val estimatedFare = selectedDriver?.fare ?: (searchResponse?.results?.firstOrNull()?.fare ?: 35.0)

                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(Color(0xFF083344))
                                            .padding(vertical = 10.dp, horizontal = 14.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text("Distância e Tempo", color = Color(0xFF67E8F9), fontSize = 11.sp)
                                            Text(
                                                text = "${"%.1f".format(distance)} km • ~$duration min",
                                                color = Color.White,
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text("Tarifa Oficial", color = Color(0xFF67E8F9), fontSize = 11.sp)
                                            Text(
                                                text = "R$ ${"%.2f".format(estimatedFare)}",
                                                color = Color(0xFF10B981),
                                                fontSize = 18.sp,
                                                fontWeight = FontWeight.Black
                                            )
                                        }
                                    }

                                    // Buttons row: [Trocar Destino] and [Continuar]
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        OutlinedButton(
                                            onClick = { isDestinationSearchOpen = true },
                                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF06B6D4)),
                                            border = BorderStroke(1.dp, Color(0xFF06B6D4).copy(alpha = 0.5f)),
                                            shape = RoundedCornerShape(12.dp),
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Text("Trocar Destino", fontWeight = FontWeight.Bold)
                                        }

                                        Button(
                                            onClick = { rideBookingStep = 3 },
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                            shape = RoundedCornerShape(12.dp),
                                            modifier = Modifier.weight(1.2f)
                                        ) {
                                            Text("Continuar", color = Color(0xFF022C22), fontWeight = FontWeight.Black)
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Icon(Icons.Default.ArrowForward, contentDescription = null, tint = Color(0xFF022C22))
                                        }
                                    }
                                }
                            }

                            // -------------------------------------------------------------
                            // STEP 3: DRIVER SELECTION & RIDE CONFIRMATION
                            // -------------------------------------------------------------
                            else if (rideBookingStep == 3) {
                                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text(
                                        text = "Motorista Selecionado",
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp
                                    )

                                    // If multiple drivers available, show quick selector pills
                                    if (availableDrivers.size > 1) {
                                        LazyRow(
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            items(availableDrivers) { drv ->
                                                val isSelected = drv.driverId == selectedDriver?.driverId
                                                Surface(
                                                    onClick = { selectedDriver = drv },
                                                    color = if (isSelected) Color(0xFF022C22) else Color(0xFF1E293B),
                                                    shape = RoundedCornerShape(20.dp),
                                                    border = BorderStroke(
                                                        1.dp,
                                                        if (isSelected) Color(0xFF10B981) else Color(0xFF334155)
                                                    )
                                                ) {
                                                    Text(
                                                        text = "${drv.name} • R$ ${"%.0f".format(drv.fare)}",
                                                        color = if (isSelected) Color(0xFF10B981) else Color(0xFF94A3B8),
                                                        fontSize = 12.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                                    )
                                                }
                                            }
                                        }
                                    }

                                    if (selectedDriver != null) {
                                        val driver = selectedDriver!!
                                        Card(
                                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                                            shape = RoundedCornerShape(16.dp),
                                            border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.4f)),
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
                                                    Column {
                                                        Text(
                                                            text = driver.name,
                                                            color = Color.White,
                                                            fontWeight = FontWeight.Bold,
                                                            fontSize = 18.sp
                                                        )
                                                        Text(
                                                            text = "★ ${"%.1f".format(driver.ratingAverage)} • Categoria: ${driver.professionalCategory}",
                                                            color = Color(0xFF94A3B8),
                                                            fontSize = 12.sp
                                                        )
                                                    }

                                                    Text(
                                                        text = "R$ ${"%.2f".format(driver.fare)}",
                                                        color = Color(0xFF10B981),
                                                        fontWeight = FontWeight.Black,
                                                        fontSize = 22.sp
                                                    )
                                                }

                                                Divider(color = Color(0xFF334155), thickness = 0.5.dp)

                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween
                                                ) {
                                                    Column {
                                                        Text("Veículo", color = Color(0xFF64748B), fontSize = 11.sp)
                                                        Text(
                                                            text = "${driver.vehicle.brand} ${driver.vehicle.model}",
                                                            color = Color.White,
                                                            fontSize = 13.sp,
                                                            fontWeight = FontWeight.SemiBold
                                                        )
                                                        Text(
                                                            text = "Cor: ${driver.vehicle.color} • Placa: ${driver.vehicle.licensePlate}",
                                                            color = Color(0xFF94A3B8),
                                                            fontSize = 12.sp
                                                        )
                                                    }

                                                    Column(horizontalAlignment = Alignment.End) {
                                                        Text("Chegada Estimada", color = Color(0xFF64748B), fontSize = 11.sp)
                                                        Text(
                                                            text = "~${driver.arrivalTimeMin} min",
                                                            color = Color(0xFF38BDF8),
                                                            fontSize = 16.sp,
                                                            fontWeight = FontWeight.Bold
                                                        )
                                                    }
                                                }
                                            }
                                        }

                                        // Action buttons: [Voltar] and [SOLICITAR CORRIDA]
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                                        ) {
                                            OutlinedButton(
                                                onClick = { rideBookingStep = 2 },
                                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                                                border = BorderStroke(1.dp, Color(0xFF334155)),
                                                shape = RoundedCornerShape(12.dp)
                                            ) {
                                                Text("Voltar")
                                            }

                                            Button(
                                                onClick = {
                                                    isSubmittingRide = true
                                                    message = ""
                                                    ApiService.createRide(
                                                        passengerName = passengerName.ifBlank { "Passageiro" },
                                                        passengerPhone = passengerPhone.ifBlank { "+551299999999" },
                                                        originId = originZone?.id ?: "z-centro",
                                                        destId = destZone?.id ?: "z-maresias",
                                                        passengerCount = 1,
                                                        driverId = driver.driverId,
                                                        fare = driver.fare,
                                                        notes = null,
                                                        originAddress = pickupAddress,
                                                        destAddress = destAddress,
                                                        originLat = pickupLat,
                                                        originLng = pickupLng,
                                                        destinationLat = destLat,
                                                        destinationLng = destLng,
                                                        onSuccess = { ride ->
                                                            isSubmittingRide = false
                                                            currentRide = ride
                                                            message = "Corrida solicitada com sucesso! Aguardando o motorista aceitar."
                                                        },
                                                        onError = { err ->
                                                            isSubmittingRide = false
                                                            rideErrorDialogMessage = err.message ?: "Falha ao solicitar corrida. Verifique os dados ou conexão."
                                                        }
                                                    )
                                                },
                                                enabled = !isSubmittingRide,
                                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                                shape = RoundedCornerShape(12.dp),
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                if (isSubmittingRide) {
                                                    CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(20.dp))
                                                } else {
                                                    Text(
                                                        text = "SOLICITAR CORRIDA 🚗",
                                                        color = Color(0xFF022C22),
                                                        fontWeight = FontWeight.Black,
                                                        fontSize = 15.sp
                                                    )
                                                }
                                            }
                                        }
                                    } else {
                                        Text(
                                            text = "Nenhum motorista disponível no momento para esta rota. Tente novamente em instantes.",
                                            color = Color(0xFFF59E0B),
                                            fontSize = 13.sp,
                                            textAlign = TextAlign.Center,
                                            modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)
                                        )

                                        Button(
                                            onClick = { rideBookingStep = 2 },
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155)),
                                            shape = RoundedCornerShape(12.dp),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Text("Voltar ao Resumo", color = Color.White)
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // -------------------------------------------------------------
                    // ACTIVE RIDE OVERLAY CARD (ACCEPTED / ARRIVING / IN PROGRESS)
                    // -------------------------------------------------------------
                    Surface(
                        color = Color(0xFF0F172A).copy(alpha = 0.98f),
                        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                        border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.4f)),
                        shadowElevation = 24.dp,
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier
                                .padding(18.dp)
                                .fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = when (currentRide!!.status) {
                                            "REQUESTED" -> "Aguardando Confirmação do Motorista ⏳"
                                            "ACCEPTED", "EN_ROUTE" -> "Corrida Aceita! Motorista a caminho 🚗"
                                            "DRIVER_ARRIVING", "ARRIVED" -> "Motorista Chegou ao Local! 📍"
                                            "IN_PROGRESS" -> "Viagem em Andamento 🛣️"
                                            "COMPLETED" -> "Viagem Finalizada com Sucesso! 🏁"
                                            else -> currentRide!!.status
                                        },
                                        color = Color(0xFF10B981),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp
                                    )
                                    Text(
                                        text = "Motorista: ${currentRide!!.driverName ?: "Profissional VaiCar"}",
                                        color = Color.White,
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 13.sp
                                    )
                                }

                                Text(
                                    text = "R$ ${"%.2f".format(if (currentRide!!.fareBrl > 0) currentRide!!.fareBrl else currentRide!!.estimatedPrice)}",
                                    color = Color(0xFF10B981),
                                    fontWeight = FontWeight.Black,
                                    fontSize = 18.sp
                                )
                            }

                            Text(
                                text = "Veículo: ${currentRide!!.driverVehicle ?: "Veículo Autorizado"}${if (!currentRide!!.driverLicensePlate.isNullOrBlank()) " • Placa: ${currentRide!!.driverLicensePlate}" else ""}",
                                color = Color(0xFF94A3B8),
                                fontSize = 12.sp
                            )

                            // WAITING TIMER IF DRIVER ARRIVED (4 minutes free)
                            if (currentRide!!.status == "ARRIVED" || currentRide!!.status == "DRIVER_ARRIVING") {
                                Surface(
                                    color = Color(0xFF022C22),
                                    shape = RoundedCornerShape(8.dp),
                                    border = BorderStroke(1.dp, Color(0xFF10B981)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = "⏱️ Motorista aguardando no embarque. Você possui 4 minutos de tolerância gratuita.",
                                        color = Color(0xFFA7F3D0),
                                        fontSize = 12.sp,
                                        modifier = Modifier.padding(10.dp)
                                    )
                                }
                            }

                            // CONTACT DRIVER VIA WHATSAPP / PHONE
                            if (!currentRide!!.driverPhone.isNullOrBlank()) {
                                OutlinedButton(
                                    onClick = {
                                        val cleanPhone = currentRide!!.driverPhone!!.replace(Regex("[^0-9]"), "")
                                        val url = "https://wa.me/$cleanPhone?text=${Uri.encode("Olá motorista, sou o passageiro ${passengerName} da corrida VaiCar.")}"
                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                        context.startActivity(intent)
                                    },
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF10B981)),
                                    border = BorderStroke(1.dp, Color(0xFF10B981)),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(Icons.Default.Phone, contentDescription = null, tint = Color(0xFF10B981))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Falar com Motorista no WhatsApp", fontWeight = FontWeight.Bold)
                                }
                            }

                            // COMPLETED OR CANCEL ACTIONS
                            if (currentRide!!.status == "COMPLETED") {
                                Button(
                                    onClick = {
                                        val pdfUrl = "${NetworkConfig.PRODUCTION_URL}/api/v1/rides/${currentRide!!.id}/receipt/pdf"
                                        val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(pdfUrl))
                                        context.startActivity(browserIntent)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(Icons.Default.Download, contentDescription = null, tint = Color.Black)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Baixar Comprovante Oficial PDF", color = Color.Black, fontWeight = FontWeight.Bold)
                                }

                                Button(
                                    onClick = {
                                        currentRide = null
                                        destAddress = null
                                        destLat = null
                                        destLng = null
                                        rideBookingStep = 1
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155)),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Fazer Nova Viagem", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            } else {
                                Button(
                                    onClick = {
                                        ApiService.updateRideStatus(
                                            rideId = currentRide!!.id,
                                            status = "CANCELLED_BY_PASSENGER",
                                            onSuccess = { currentRide = it },
                                            onError = { message = "Falha ao cancelar corrida." }
                                        )
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Cancelar Corrida", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }

            // TAB 1: PRAIAS E ZONAS MUNICIPAIS
            if (selectedTab == 1) {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    item {
                        Text(
                            text = "Praias e Regiões de São Sebastião",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                    }
                    items(zones) { z ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .padding(14.dp)
                                    .fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(z.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Text("${z.distanceFromCenterKm} km do Centro Histórico", color = Color(0xFF94A3B8), fontSize = 11.sp)
                                }
                                Text("Atendido", color = Color(0xFF10B981), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // TAB 2: MEU PERFIL
            if (selectedTab == 2) {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(18.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Text("Perfil do Passageiro", color = Color(0xFF10B981), fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                OutlinedTextField(
                                    value = passengerName,
                                    onValueChange = { passengerName = it },
                                    label = { Text("Nome Completo") },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        focusedBorderColor = Color(0xFF10B981)
                                    ),
                                    modifier = Modifier.fillMaxWidth()
                                )
                                OutlinedTextField(
                                    value = passengerPhone,
                                    onValueChange = { passengerPhone = it },
                                    label = { Text("Telefone / WhatsApp") },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        focusedBorderColor = Color(0xFF10B981)
                                    ),
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Button(
                                    onClick = {
                                        SecurityUtils.registerPassenger(context, passengerName, passengerPhone, "")
                                        message = "Perfil salvo com sucesso!"
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Salvar Perfil", color = Color.Black, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }

            // ==============================================================================
            // ORIGIN SEARCH MODAL ("DE ONDE VOCÊ VAI?")
            // ==============================================================================
            if (isOriginSearchOpen) {
                Dialog(
                    onDismissRequest = { isOriginSearchOpen = false },
                    properties = DialogProperties(usePlatformDefaultWidth = false)
                ) {
                    var query by remember { mutableStateOf("") }
                    var searchResults by remember { mutableStateOf<List<PlaceSearchResult>>(emptyList()) }
                    var isSearchingPlaces by remember { mutableStateOf(false) }

                    LaunchedEffect(query) {
                        if (query.isNotBlank()) {
                            isSearchingPlaces = true
                            val res = geocodePlaceQuery(context, query, zones)
                            searchResults = res
                            isSearchingPlaces = false
                        } else {
                            searchResults = emptyList()
                        }
                    }

                    Surface(
                        color = Color(0xFF0F172A),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp)
                        ) {
                            // Header
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                IconButton(onClick = { isOriginSearchOpen = false }) {
                                    Icon(Icons.Default.ArrowBack, contentDescription = "Voltar", tint = Color.White)
                                }
                                Text(
                                    text = "De onde você vai?",
                                    color = Color.White,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.weight(1f)
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // Search Input Field
                            OutlinedTextField(
                                value = query,
                                onValueChange = { query = it },
                                placeholder = { Text("Digite endereço, rua ou local...", color = Color(0xFF64748B)) },
                                leadingIcon = {
                                    Icon(Icons.Default.Search, contentDescription = null, tint = Color(0xFF10B981))
                                },
                                trailingIcon = {
                                    if (query.isNotBlank()) {
                                        IconButton(onClick = { query = "" }) {
                                            Icon(Icons.Default.Close, contentDescription = "Limpar", tint = Color.White)
                                        }
                                    }
                                },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF10B981),
                                    unfocusedBorderColor = Color(0xFF334155),
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(16.dp))

                            if (isSearchingPlaces) {
                                Box(
                                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(color = Color(0xFF10B981))
                                }
                            } else {
                                LazyColumn(
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.fillMaxSize()
                                ) {
                                    if (searchResults.isNotEmpty()) {
                                        items(searchResults) { place ->
                                            Surface(
                                                onClick = {
                                                    pickupLat = place.lat
                                                    pickupLng = place.lng
                                                    pickupAddress = "${place.title}, São Sebastião - SP"
                                                    originZone = place.zone ?: findClosestZone(place.lat, place.lng, zones)
                                                    mapCenterLat = place.lat
                                                    mapCenterLng = place.lng
                                                    isOriginSearchOpen = false
                                                    refreshRouteAndDrivers()
                                                },
                                                color = Color(0xFF1E293B),
                                                shape = RoundedCornerShape(12.dp),
                                                border = BorderStroke(1.dp, Color(0xFF334155)),
                                                modifier = Modifier.fillMaxWidth()
                                            ) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    modifier = Modifier.padding(14.dp)
                                                ) {
                                                    Icon(
                                                        imageVector = if (place.isZone) Icons.Default.Place else Icons.Default.LocationOn,
                                                        contentDescription = null,
                                                        tint = Color(0xFF06B6D4),
                                                        modifier = Modifier.size(24.dp)
                                                    )
                                                    Spacer(modifier = Modifier.width(12.dp))
                                                    Column {
                                                        Text(
                                                            text = place.title,
                                                            color = Color.White,
                                                            fontWeight = FontWeight.Bold,
                                                            fontSize = 14.sp
                                                        )
                                                        Text(
                                                            text = place.subtitle,
                                                            color = Color(0xFF94A3B8),
                                                            fontSize = 12.sp
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    } else if (query.isNotBlank()) {
                                        item {
                                            Text(
                                                text = "Nenhum local encontrado para \"$query\".",
                                                color = Color(0xFF94A3B8),
                                                fontSize = 13.sp,
                                                textAlign = TextAlign.Center,
                                                modifier = Modifier.fillMaxWidth().padding(top = 24.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ==============================================================================
            // DESTINATION SEARCH MODAL ("PARA ONDE VAMOS?")
            // ==============================================================================
            if (isDestinationSearchOpen) {
                Dialog(
                    onDismissRequest = { isDestinationSearchOpen = false },
                    properties = DialogProperties(usePlatformDefaultWidth = false)
                ) {
                    var query by remember { mutableStateOf("") }
                    var searchResults by remember { mutableStateOf<List<PlaceSearchResult>>(emptyList()) }
                    var isSearchingPlaces by remember { mutableStateOf(false) }

                    LaunchedEffect(query) {
                        if (query.isNotBlank()) {
                            isSearchingPlaces = true
                            val res = geocodePlaceQuery(context, query, zones)
                            searchResults = res
                            isSearchingPlaces = false
                        } else {
                            searchResults = emptyList()
                        }
                    }

                    Surface(
                        color = Color(0xFF0F172A),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp)
                        ) {
                            // Header
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                IconButton(onClick = { isDestinationSearchOpen = false }) {
                                    Icon(Icons.Default.ArrowBack, contentDescription = "Voltar", tint = Color.White)
                                }
                                Text(
                                    text = "Para Onde Vamos?",
                                    color = Color.White,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.weight(1f)
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // Search Input Field
                            OutlinedTextField(
                                value = query,
                                onValueChange = { query = it },
                                placeholder = { Text("Digite praia, rua, bairro ou hotel...", color = Color(0xFF64748B)) },
                                leadingIcon = {
                                    Icon(Icons.Default.Search, contentDescription = null, tint = Color(0xFF10B981))
                                },
                                trailingIcon = {
                                    if (query.isNotBlank()) {
                                        IconButton(onClick = { query = "" }) {
                                            Icon(Icons.Default.Close, contentDescription = "Limpar", tint = Color.White)
                                        }
                                    }
                                },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF10B981),
                                    unfocusedBorderColor = Color(0xFF334155),
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(16.dp))

                            if (isSearchingPlaces) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(24.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(color = Color(0xFF10B981))
                                }
                            } else {
                                LazyColumn(
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.fillMaxSize()
                                ) {
                                    if (searchResults.isNotEmpty()) {
                                        items(searchResults) { place ->
                                            Surface(
                                                onClick = {
                                                    destLat = place.lat
                                                    destLng = place.lng
                                                    destAddress = "${place.title}, São Sebastião - SP"
                                                    destZone = place.zone ?: findClosestZone(place.lat, place.lng, zones)
                                                    mapCenterLat = (pickupLat + place.lat) / 2.0
                                                    mapCenterLng = (pickupLng + place.lng) / 2.0
                                                    rideBookingStep = 2 // Proceed to Step 2: Route Summary
                                                    isDestinationSearchOpen = false
                                                    refreshRouteAndDrivers()
                                                },
                                                color = Color(0xFF1E293B),
                                                shape = RoundedCornerShape(12.dp),
                                                border = BorderStroke(1.dp, Color(0xFF334155)),
                                                modifier = Modifier.fillMaxWidth()
                                            ) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    modifier = Modifier.padding(14.dp)
                                                ) {
                                                    Icon(
                                                        imageVector = if (place.isZone) Icons.Default.Place else Icons.Default.LocationOn,
                                                        contentDescription = null,
                                                        tint = Color(0xFF06B6D4),
                                                        modifier = Modifier.size(24.dp)
                                                    )
                                                    Spacer(modifier = Modifier.width(12.dp))
                                                    Column {
                                                        Text(
                                                            text = place.title,
                                                            color = Color.White,
                                                            fontWeight = FontWeight.Bold,
                                                            fontSize = 14.sp
                                                        )
                                                        Text(
                                                            text = place.subtitle,
                                                            color = Color(0xFF94A3B8),
                                                            fontSize = 12.sp
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    } else if (query.isNotBlank()) {
                                        item {
                                            Text(
                                                text = "Nenhum local encontrado para \"$query\". Verifique a digitação ou selecione uma praia próxima.",
                                                color = Color(0xFF94A3B8),
                                                fontSize = 13.sp,
                                                textAlign = TextAlign.Center,
                                                modifier = Modifier.fillMaxWidth().padding(top = 24.dp)
                                            )
                                        }
                                    } else {
                                        // Quick suggestions for popular destinations in São Sebastião
                                        item {
                                            Text(
                                                text = "Destinos Populares em São Sebastião",
                                                color = Color(0xFF64748B),
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(vertical = 8.dp)
                                            )
                                        }
                                        items(zones.take(8)) { z ->
                                            Surface(
                                                onClick = {
                                                    destLat = z.lat
                                                    destLng = z.lng
                                                    destAddress = "${z.name}, São Sebastião - SP"
                                                    destZone = z
                                                    mapCenterLat = (pickupLat + z.lat) / 2.0
                                                    mapCenterLng = (pickupLng + z.lng) / 2.0
                                                    rideBookingStep = 2 // Proceed to Step 2
                                                    isDestinationSearchOpen = false
                                                    refreshRouteAndDrivers()
                                                },
                                                color = Color(0xFF1E293B),
                                                shape = RoundedCornerShape(12.dp),
                                                modifier = Modifier.fillMaxWidth()
                                            ) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    modifier = Modifier.padding(14.dp)
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Default.Place,
                                                        contentDescription = null,
                                                        tint = Color(0xFF10B981),
                                                        modifier = Modifier.size(20.dp)
                                                    )
                                                    Spacer(modifier = Modifier.width(12.dp))
                                                    Column {
                                                        Text(
                                                            text = z.name,
                                                            color = Color.White,
                                                            fontWeight = FontWeight.Bold,
                                                            fontSize = 14.sp
                                                        )
                                                        Text(
                                                            text = "${z.distanceFromCenterKm} km do Centro Histórico",
                                                            color = Color(0xFF94A3B8),
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
                    }
                }
            }

            // ==============================================================================
            // ERROR EXPLANATION DIALOG (FOR DIAGNOSING "FALHA AO SOLICITAR CORRIDA")
            // ==============================================================================
            if (rideErrorDialogMessage != null) {
                AlertDialog(
                    onDismissRequest = { rideErrorDialogMessage = null },
                    icon = {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = null,
                            tint = Color(0xFFF59E0B),
                            modifier = Modifier.size(32.dp)
                        )
                    },
                    title = {
                        Text(
                            text = "Aviso da Solicitação",
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                    },
                    text = {
                        Text(
                            text = rideErrorDialogMessage ?: "",
                            color = Color(0xFFE2E8F0),
                            fontSize = 14.sp
                        )
                    },
                    confirmButton = {
                        Button(
                            onClick = { rideErrorDialogMessage = null },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                        ) {
                            Text("Entendi", color = Color(0xFF022C22), fontWeight = FontWeight.Bold)
                        }
                    },
                    containerColor = Color(0xFF1E293B)
                )
            }

            // SNACKBAR MESSAGE
            if (message.isNotBlank()) {
                Snackbar(
                    action = {
                        TextButton(onClick = { message = "" }) {
                            Text("OK", color = Color(0xFF10B981))
                        }
                    },
                    containerColor = Color(0xFF1E293B),
                    contentColor = Color.White,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp)
                ) {
                    Text(message)
                }
            }
        }
    }
}
