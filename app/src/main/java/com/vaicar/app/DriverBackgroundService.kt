package com.vaicar.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * DriverBackgroundService
 * Runs continuously as a Foreground Service while the driver is ONLINE.
 * Even if the app is CLOSED or the device is LOCKED/ASLEEP, this service
 * monitors for incoming ride calls and triggers:
 * 1. Screen wake-up (WakeLock)
 * 2. Pop-up activity (IncomingRideAlertActivity / Full Screen Intent)
 * 3. Continuous loud alarm sound and vibration to WAKE UP the driver ("acordar o motorista")
 */
class DriverBackgroundService : Service() {

    companion object {
        private const val TAG = "DriverBgService"
        const val FOREGROUND_NOTIFICATION_ID = 9001
        const val RIDE_ALERT_NOTIFICATION_ID = 9002

        const val CHANNEL_ID_SERVICE = "vaicar_driver_radar_service"
        const val CHANNEL_ID_ALARM = "vaicar_incoming_ride_alarm"

        const val ACTION_START = "com.vaicar.app.ACTION_START_RADAR"
        const val ACTION_STOP = "com.vaicar.app.ACTION_STOP_RADAR"
        const val ACTION_ACCEPT_RIDE = "com.vaicar.app.ACTION_ACCEPT_RIDE"
        const val ACTION_DISMISS_RIDE = "com.vaicar.app.ACTION_DISMISS_RIDE"

        fun startService(context: Context) {
            val intent = Intent(context, DriverBackgroundService::class.java).apply {
                action = ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, DriverBackgroundService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }

    private var serviceJob: Job? = null
    private val seenRideIds = mutableSetOf<String>()
    private var isRunning = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "DriverBackgroundService created")
        createNotificationChannels()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START

        when (action) {
            ACTION_STOP -> {
                Log.i(TAG, "Stopping DriverBackgroundService")
                stopRadarService()
                return START_NOT_STICKY
            }
            ACTION_ACCEPT_RIDE -> {
                val rideId = intent?.getStringExtra("ride_id") ?: ""
                val driverId = SecurityUtils.getDriverId(this)
                SoundAlertHelper.stopAlarm(this)
                clearRideAlertNotification()
                if (rideId.isNotBlank()) {
                    ApiService.updateRideStatus(
                        rideId = rideId,
                        status = "ACCEPTED",
                        driverId = driverId,
                        onSuccess = {},
                        onError = {}
                    )
                }
                return START_STICKY
            }
            ACTION_DISMISS_RIDE -> {
                SoundAlertHelper.stopAlarm(this)
                clearRideAlertNotification()
                return START_STICKY
            }
            else -> {
                startForegroundWithNotification()
                startPollingForRides()
                return START_STICKY
            }
        }
    }

    private fun startForegroundWithNotification() {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).apply {
                putExtra("initial_screen", "DRIVER")
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID_SERVICE)
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle("VaiCar • Radar Noturno Ativo")
            .setContentText("Aguardando chamados. Você será acordado com pop-up e som alto.")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                FOREGROUND_NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            )
        } else {
            startForeground(FOREGROUND_NOTIFICATION_ID, notification)
        }
    }

    private fun startPollingForRides() {
        if (isRunning) return
        isRunning = true

        val driverId = SecurityUtils.getDriverId(this)
        if (driverId.isNotBlank()) {
            DriverLocationManager.startTracking(this, driverId)
        }

        serviceJob?.cancel()
        serviceJob = CoroutineScope(Dispatchers.IO).launch {
            Log.i(TAG, "Started background ride polling loop (running even with app closed)...")
            while (isActive && isRunning) {
                try {
                    val isDriverOnline = SecurityUtils.isDriverOnline(this@DriverBackgroundService)
                    val driverPhone = SecurityUtils.getDriverPhone(this@DriverBackgroundService)
                    val driverId = SecurityUtils.getDriverId(this@DriverBackgroundService)

                    if (isDriverOnline) {
                        ApiService.fetchRides(
                            onSuccess = { rides ->
                                handleIncomingRides(rides, driverId, driverPhone)
                            },
                            onError = { err ->
                                Log.w(TAG, "Polling rides error: ${err.message}")
                            }
                        )
                    }
                } catch (e: CancellationException) {
                    break
                } catch (e: Exception) {
                    Log.e(TAG, "Unexpected error in service loop: ${e.message}")
                }

                // Poll every 3 seconds for fast ride dispatch
                delay(3000L)
            }
        }
    }

    private fun handleIncomingRides(rides: List<Ride>, driverId: String, driverPhone: String) {
        // Filter for rides matching this driver that are REQUESTED
        val requestedRides = rides.filter { ride ->
            val matches = (driverId.isNotBlank() && (
                ride.driverId == driverId ||
                ride.matchedDriverId == driverId
            )) || (driverPhone.isNotBlank() && (
                ride.driverPhone == driverPhone ||
                ride.driverPhone?.replace("+", "") == driverPhone.replace("+", "")
            ))
            matches && ride.status == "REQUESTED"
        }

        for (ride in requestedRides) {
            if (!seenRideIds.contains(ride.id)) {
                seenRideIds.add(ride.id)
                Log.w(TAG, "🚨 NEW RIDE REQUEST DETECTED: ${ride.id}. Triggering wake-up alarm and pop-up!")
                triggerDriverWakeUpAlert(ride, driverId)
                break
            }
        }
    }

    /**
     * Wakes up the screen, plays loud alarm sound & vibration,
     * launches full-screen pop-up activity and displays high-priority notification!
     */
    private fun triggerDriverWakeUpAlert(ride: Ride, driverId: String) {
        // 1. Wake screen up even if phone is asleep / locked
        wakeDeviceScreen()

        // 2. Start continuous loud alarm sound to WAKE UP the driver ("acordar o motorista")
        SoundAlertHelper.startLoudWakeUpAlarm(this)

        // 3. Prepare Intent for the Pop-up Activity
        val popUpIntent = IncomingRideAlertActivity.createIntent(
            context = this,
            rideId = ride.id,
            passengerName = ride.passengerName,
            passengerPhone = ride.passengerPhone,
            originAddress = ride.originAddress ?: "Origem",
            destAddress = ride.destinationAddress ?: "Destino",
            fare = ride.estimatedPrice,
            notes = ride.notes ?: "",
            driverId = driverId
        )

        // 4. Build Full Screen Intent PendingIntent
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            ride.id.hashCode(),
            popUpIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Action: Accept directly from notification
        val acceptIntent = Intent(this, DriverBackgroundService::class.java).apply {
            action = ACTION_ACCEPT_RIDE
            putExtra("ride_id", ride.id)
        }
        val acceptPendingIntent = PendingIntent.getService(
            this,
            1,
            acceptIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Action: Dismiss directly from notification
        val dismissIntent = Intent(this, DriverBackgroundService::class.java).apply {
            action = ACTION_DISMISS_RIDE
        }
        val dismissPendingIntent = PendingIntent.getService(
            this,
            2,
            dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 5. Build High-Priority Heads-Up & Full Screen Notification
        val originStr = ride.originAddress ?: "Origem"
        val destStr = ride.destinationAddress ?: "Destino"
        val notification = NotificationCompat.Builder(this, CHANNEL_ID_ALARM)
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle("🚨 NOVO CHAMADO: ${ride.passengerName}")
            .setContentText("De: ${originStr.take(40)} • R$ ${"%.2f".format(ride.estimatedPrice)}")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("🚨 NOVO CHAMADO DE CORRIDA!\nPassageiro: ${ride.passengerName}\nEmbarque: $originStr\nDestino: $destStr\nValor: R$ ${"%.2f".format(ride.estimatedPrice)}")
            )
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .addAction(R.drawable.ic_launcher, "ACEITAR CORRIDA", acceptPendingIntent)
            .addAction(R.drawable.ic_launcher, "SILENCIAR", dismissPendingIntent)
            .setAutoCancel(false)
            .setOngoing(true)
            .build()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        notificationManager?.notify(RIDE_ALERT_NOTIFICATION_ID, notification)

        // 6. Directly launch Pop-up Activity over lockscreen/other apps
        try {
            startActivity(popUpIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting IncomingRideAlertActivity directly: ${e.message}")
        }
    }

    private fun wakeDeviceScreen() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (powerManager != null) {
                @Suppress("DEPRECATION")
                val wakeLock = powerManager.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                    PowerManager.ACQUIRE_CAUSES_WAKEUP or
                    PowerManager.ON_AFTER_RELEASE,
                    "vaicar:driver_wakeup_alert"
                )
                wakeLock.acquire(30000L) // Keep awake 30s
            }
        } catch (e: Exception) {
            Log.w(TAG, "WakeLock error: ${e.message}")
        }
    }

    private fun clearRideAlertNotification() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        notificationManager?.cancel(RIDE_ALERT_NOTIFICATION_ID)
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

            // Channel 1: Service Status (Low importance, quiet)
            val serviceChannel = NotificationChannel(
                CHANNEL_ID_SERVICE,
                "Radar de Chamados (Segundo Plano)",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Notificação contínua mantendo o radar do motorista ativo em segundo plano"
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(serviceChannel)

            // Channel 2: High Priority Alarm Channel (Loud, heads-up, full-screen)
            val alarmChannel = NotificationChannel(
                CHANNEL_ID_ALARM,
                "Chamados Urgentes de Corrida (Alarme)",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alerta urgente para acordar o motorista com pop-up e som alto"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 800, 200, 800, 200, 1000)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
                val audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
                setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), audioAttributes)
            }
            notificationManager.createNotificationChannel(alarmChannel)
        }
    }

    private fun stopRadarService() {
        isRunning = false
        serviceJob?.cancel()
        serviceJob = null
        DriverLocationManager.stopTracking()
        SoundAlertHelper.stopAlarm(this)
        clearRideAlertNotification()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "DriverBackgroundService destroyed")
        stopRadarService()
    }
}
