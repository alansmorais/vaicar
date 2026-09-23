package com.vaicar.app

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * IncomingRideAlertActivity
 * Full-screen pop-up modal displayed over lockscreen and closed app
 * with continuous loud alarm and vibration to WAKE UP the driver ("acordar o motorista").
 */
class IncomingRideAlertActivity : ComponentActivity() {

    companion object {
        const val EXTRA_RIDE_ID = "extra_ride_id"
        const val EXTRA_PASSENGER_NAME = "extra_passenger_name"
        const val EXTRA_PASSENGER_PHONE = "extra_passenger_phone"
        const val EXTRA_ORIGIN_ADDRESS = "extra_origin_address"
        const val EXTRA_DEST_ADDRESS = "extra_dest_address"
        const val EXTRA_FARE = "extra_fare"
        const val EXTRA_NOTES = "extra_notes"
        const val EXTRA_DRIVER_ID = "extra_driver_id"

        fun createIntent(
            context: Context,
            rideId: String,
            passengerName: String,
            passengerPhone: String,
            originAddress: String,
            destAddress: String,
            fare: Double,
            notes: String,
            driverId: String
        ): Intent {
            return Intent(context, IncomingRideAlertActivity::class.java).apply {
                putExtra(EXTRA_RIDE_ID, rideId)
                putExtra(EXTRA_PASSENGER_NAME, passengerName)
                putExtra(EXTRA_PASSENGER_PHONE, passengerPhone)
                putExtra(EXTRA_ORIGIN_ADDRESS, originAddress)
                putExtra(EXTRA_DEST_ADDRESS, destAddress)
                putExtra(EXTRA_FARE, fare)
                putExtra(EXTRA_NOTES, notes)
                putExtra(EXTRA_DRIVER_ID, driverId)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Wake screen, bypass keyguard, keep awake over lockscreen
        turnOnScreenAndShowOverLockscreen()

        val rideId = intent.getStringExtra(EXTRA_RIDE_ID) ?: ""
        val passengerName = intent.getStringExtra(EXTRA_PASSENGER_NAME) ?: "Passageiro"
        val passengerPhone = intent.getStringExtra(EXTRA_PASSENGER_PHONE) ?: ""
        val originAddress = intent.getStringExtra(EXTRA_ORIGIN_ADDRESS) ?: "Origem"
        val destAddress = intent.getStringExtra(EXTRA_DEST_ADDRESS) ?: "Destino"
        val fare = intent.getDoubleExtra(EXTRA_FARE, 0.0)
        val notes = intent.getStringExtra(EXTRA_NOTES) ?: ""
        val driverId = intent.getStringExtra(EXTRA_DRIVER_ID) ?: SecurityUtils.getDriverId(this)

        setContent {
            VaiCarTheme {
                IncomingRidePopUpScreen(
                    rideId = rideId,
                    passengerName = passengerName,
                    passengerPhone = passengerPhone,
                    originAddress = originAddress,
                    destAddress = destAddress,
                    fare = fare,
                    notes = notes,
                    driverId = driverId,
                    onAccept = {
                        acceptRide(rideId, driverId)
                    },
                    onDismiss = {
                        dismissAlert()
                    }
                )
            }
        }
    }

    private fun turnOnScreenAndShowOverLockscreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
            keyguardManager?.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
    }

    private fun acceptRide(rideId: String, driverId: String) {
        // 1. Immediately silence wake-up alarm sound
        SoundAlertHelper.stopAlarm(this)

        // 2. Accept ride via API
        if (rideId.isNotBlank()) {
            ApiService.updateRideStatus(
                rideId = rideId,
                status = "ACCEPTED",
                driverId = driverId,
                onSuccess = {
                    Toast.makeText(this, "Corrida aceita com sucesso!", Toast.LENGTH_SHORT).show()
                    openMainActivityInDriverMode()
                },
                onError = { err ->
                    Toast.makeText(this, "Aviso: ${err.message}", Toast.LENGTH_SHORT).show()
                    openMainActivityInDriverMode()
                }
            )
        } else {
            openMainActivityInDriverMode()
        }
    }

    private fun dismissAlert() {
        SoundAlertHelper.stopAlarm(this)
        finish()
    }

    private fun openMainActivityInDriverMode() {
        val mainIntent = Intent(this, MainActivity::class.java).apply {
            putExtra("initial_screen", "DRIVER")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        startActivity(mainIntent)
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        SoundAlertHelper.stopAlarm(this)
    }
}

@Composable
fun IncomingRidePopUpScreen(
    rideId: String,
    passengerName: String,
    passengerPhone: String,
    originAddress: String,
    destAddress: String,
    fare: Double,
    notes: String,
    driverId: String,
    onAccept: () -> Unit,
    onDismiss: () -> Unit
) {
    var isAccepting by remember { mutableStateOf(false) }

    // Pulsing animation for siren icon and border
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(600),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    Surface(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF090D16)),
        color = Color(0xFF090D16)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Top Emergency Banner with animated siren badge
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(top = 16.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .scale(pulseScale)
                            .size(72.dp)
                            .background(Color(0xFFEF4444).copy(alpha = 0.2f), CircleShape)
                            .border(2.dp, Color(0xFFEF4444), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Alarm,
                            contentDescription = "Alerta Sonoro",
                            tint = Color(0xFFEF4444),
                            modifier = Modifier.size(40.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "🚨 NOVO CHAMADO DE CORRIDA! 🚨",
                        color = Color(0xFF10B981),
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 20.sp,
                        textAlign = TextAlign.Center
                    )

                    Text(
                        text = "ACORDE! UM PASSAGEIRO ESTÁ SOLICITANDO SUA VIAGEM",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Ride Card Details
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.5.dp, Color(0xFF10B981).copy(alpha = 0.6f), RoundedCornerShape(16.dp)),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        // Passenger info
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .background(Color(0xFF10B981).copy(alpha = 0.2f), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFF10B981))
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = passengerName,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 18.sp
                                )
                                if (passengerPhone.isNotBlank()) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Phone, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(12.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(
                                            text = passengerPhone,
                                            color = Color(0xFF94A3B8),
                                            fontSize = 13.sp
                                        )
                                    }
                                }
                            }
                        }

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(1.dp)
                                .background(Color(0xFF334155))
                        )

                        // Origin (Embarque)
                        Row(verticalAlignment = Alignment.Top) {
                            Icon(
                                Icons.Default.LocationOn,
                                contentDescription = "Embarque",
                                tint = Color(0xFF10B981),
                                modifier = Modifier.size(20.dp).padding(top = 2.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = "EMBARQUE (ONDE BUSCAR):",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = originAddress,
                                    color = Color.White,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 15.sp
                                )
                            }
                        }

                        // Destination (Desembarque)
                        Row(verticalAlignment = Alignment.Top) {
                            Icon(
                                Icons.Default.Navigation,
                                contentDescription = "Desembarque",
                                tint = Color(0xFF38BDF8),
                                modifier = Modifier.size(20.dp).padding(top = 2.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = "DESEMBARQUE (DESTINO):",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = destAddress,
                                    color = Color.White,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 15.sp
                                )
                            }
                        }

                        if (notes.isNotBlank()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFF0F172A), RoundedCornerShape(8.dp))
                                    .padding(8.dp)
                            ) {
                                Text(
                                    text = "Obs: $notes",
                                    color = Color(0xFFFDE047),
                                    fontSize = 12.sp
                                )
                            }
                        }

                        // Estimated Fare
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFF0F172A), RoundedCornerShape(12.dp))
                                .padding(12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "VALOR ESTIMADO DA CORRIDA",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = if (fare > 0) "R$ ${"%.2f".format(fare)}" else "A Combinar / Taxímetro",
                                    color = Color(0xFF10B981),
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 28.sp
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Action Buttons
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // HUGE ACCEPT BUTTON
                    Button(
                        onClick = {
                            if (!isAccepting) {
                                isAccepting = true
                                onAccept()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(60.dp)
                    ) {
                        if (isAccepting) {
                            CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(28.dp))
                        } else {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.Black, modifier = Modifier.size(24.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "ACEITAR CORRIDA AGORA",
                                    color = Color.Black,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 17.sp
                                )
                            }
                        }
                    }

                    // SILENCE / DISMISS BUTTON
                    OutlinedButton(
                        onClick = onDismiss,
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF94A3B8)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Close, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Silenciar / Recusar",
                                color = Color(0xFF94A3B8),
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        }
                    }
                }
            }
        }
    }
}
