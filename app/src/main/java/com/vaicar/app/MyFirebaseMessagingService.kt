package com.vaicar.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.i("FCM", "New FCM token generated: $token")
        SecurityUtils.setFcmToken(applicationContext, token)
        val driverId = SecurityUtils.getDriverId(applicationContext)
        if (driverId.isNotBlank()) {
            ApiService.updateDriverFcmToken(
                driverId = driverId,
                fcmToken = token,
                onSuccess = { Log.i("FCM", "FCM token updated on server successfully.") },
                onError = { e -> Log.e("FCM", "Failed to update FCM token on server: ${e.message}") }
            )
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.i("FCM", "Message received from FCM: data=${remoteMessage.data}, notification=${remoteMessage.notification?.body}")

        // Extract ride details
        val data = remoteMessage.data
        val rideId = data["rideId"] ?: data["id"] ?: ""
        val passengerName = data["passengerName"] ?: data["passenger"] ?: "Passageiro"
        val passengerPhone = data["passengerPhone"] ?: ""
        val originAddress = data["originAddress"] ?: "Endereço de Origem"
        val destAddress = data["destAddress"] ?: "Endereço de Destino"
        val fareString = data["fare"] ?: "0.0"
        val notes = data["notes"] ?: ""
        val fare = fareString.toDoubleOrNull() ?: 0.0

        if (rideId.isBlank()) {
            Log.w("FCM", "Received FCM without rideId. Ignoring.")
            return
        }

        // 1. Play continuous loud wake-up alarm and vibration via SoundAlertHelper!
        SoundAlertHelper.startLoudWakeUpAlarm(applicationContext)

        // 2. Launch the full-screen alert activity IncomingRideAlertActivity
        try {
            val alertIntent = IncomingRideAlertActivity.createIntent(
                context = applicationContext,
                rideId = rideId,
                passengerName = passengerName,
                passengerPhone = passengerPhone,
                originAddress = originAddress,
                destAddress = destAddress,
                fare = fare,
                notes = notes,
                driverId = SecurityUtils.getDriverId(applicationContext)
            )
            startActivity(alertIntent)
        } catch (e: Exception) {
            Log.e("FCM", "Error starting IncomingRideAlertActivity: ${e.message}", e)
        }

        // 3. Show Heads-up / System Notification in Notification Center
        showHeadsUpNotification(rideId, passengerName, originAddress, destAddress, fare)
    }

    private fun showHeadsUpNotification(
        rideId: String,
        passengerName: String,
        originAddress: String,
        destAddress: String,
        fare: Double
    ) {
        val channelId = "nova_corrida_channel"
        val channelName = "NOVA CORRIDA"
        val notificationId = (System.currentTimeMillis() % 100000).toInt()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                channelName,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notificações de novas chamadas de corridas do VaiCar"
                enableLights(true)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 200, 500, 200, 500)
            }
            notificationManager.createNotificationChannel(channel)
        }

        // Tapping the notification opens MainActivity with DRIVER screen
        val openIntent = Intent(this, MainActivity::class.java).apply {
            putExtra("initial_screen", "DRIVER")
            putExtra("rideId", rideId)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            notificationId,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Direct Accept action
        val acceptIntent = Intent(this, IncomingRideAlertActivity::class.java).apply {
            putExtra(IncomingRideAlertActivity.EXTRA_RIDE_ID, rideId)
            putExtra(IncomingRideAlertActivity.EXTRA_DRIVER_ID, SecurityUtils.getDriverId(this@MyFirebaseMessagingService))
            action = "com.vaicar.app.ACTION_ACCEPT"
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val acceptPendingIntent = PendingIntent.getActivity(
            this,
            notificationId + 1,
            acceptIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle("Nova Corrida Disponível!")
            .setContentText("De: $originAddress para $destAddress")
            .setStyle(NotificationCompat.BigTextStyle()
                .bigText("Passageiro: $passengerName\nOrigem: $originAddress\nDestino: $destAddress\nValor: R$ ${String.format("%.2f", fare)}"))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setFullScreenIntent(pendingIntent, true)
            .addAction(R.drawable.ic_launcher, "Aceitar Chamado", acceptPendingIntent)

        notificationManager.notify(notificationId, notificationBuilder.build())
    }
}
