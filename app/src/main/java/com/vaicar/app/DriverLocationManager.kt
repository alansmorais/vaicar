package com.vaicar.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * DriverLocationManager
 * Authoritative GPS Location tracker for the native Android Driver App.
 * Uses real Android device LocationManager with GPS and Network providers.
 * Throttles stationary duplicate coordinates to save battery, data, and server bandwidth.
 */
object DriverLocationManager {
    private const val TAG = "DriverLocationManager"

    private const val MIN_TIME_MS = 3000L // 3 seconds
    private const val MIN_DISTANCE_M = 5.0f // 5 meters

    private var locationManager: LocationManager? = null
    private var isTracking = false
    private var currentDriverId: String? = null
    private var activeRideId: String? = null

    private var lastSentLocation: Location? = null
    private var lastSentTimestamp: Long = 0L

    private val locationListener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            handleNewLocation(location)
        }

        @Deprecated("Deprecated in Java")
        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
        override fun onProviderEnabled(provider: String) {
            Log.d(TAG, "Location provider enabled: $provider")
        }
        override fun onProviderDisabled(provider: String) {
            Log.d(TAG, "Location provider disabled: $provider")
        }
    }

    fun hasLocationPermission(context: Context): Boolean {
        val fine = ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        return fine || coarse
    }

    @SuppressLint("MissingPermission")
    fun startTracking(context: Context, driverId: String, rideId: String? = null) {
        if (!hasLocationPermission(context)) {
            Log.w(TAG, "Cannot start tracking: Location permission not granted.")
            return
        }

        currentDriverId = driverId
        activeRideId = rideId

        if (isTracking && locationManager != null) {
            Log.d(TAG, "Already tracking. Updated active ride: $rideId")
            return
        }

        try {
            locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            if (locationManager == null) {
                Log.e(TAG, "LocationManager not available.")
                return
            }

            // Register GPS Provider
            if (locationManager?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true) {
                locationManager?.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    MIN_TIME_MS,
                    MIN_DISTANCE_M,
                    locationListener,
                    Looper.getMainLooper()
                )
            }

            // Register Network Provider as fallback
            if (locationManager?.isProviderEnabled(LocationManager.NETWORK_PROVIDER) == true) {
                locationManager?.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    MIN_TIME_MS,
                    MIN_DISTANCE_M,
                    locationListener,
                    Looper.getMainLooper()
                )
            }

            isTracking = true
            Log.i(TAG, "Started real GPS tracking for driver: $driverId (ride: $rideId)")

            // Get last known location for immediate sync
            val lastGps = locationManager?.getLastKnownLocation(LocationManager.GPS_PROVIDER)
            val lastNet = locationManager?.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
            val bestLast = lastGps ?: lastNet
            if (bestLast != null) {
                handleNewLocation(bestLast, force = true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting location tracking: ${e.message}", e)
        }
    }

    fun updateActiveRide(rideId: String?) {
        activeRideId = rideId
    }

    fun stopTracking() {
        if (!isTracking) return
        try {
            locationManager?.removeUpdates(locationListener)
            isTracking = false
            currentDriverId = null
            activeRideId = null
            lastSentLocation = null
            Log.i(TAG, "Stopped real GPS tracking.")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping location tracking: ${e.message}", e)
        }
    }

    private fun handleNewLocation(location: Location, force: Boolean = false) {
        val driverId = currentDriverId ?: return
        val now = System.currentTimeMillis()

        // Filter out duplicate or minor jitter when stationary:
        // If not forced and moved < 3 meters and sent less than 15 seconds ago, skip
        val last = lastSentLocation
        if (!force && last != null) {
            val dist = last.distanceTo(location)
            val elapsed = now - lastSentTimestamp
            if (dist < 3.0f && elapsed < 15000L) {
                return
            }
        }

        lastSentLocation = location
        lastSentTimestamp = now

        val heading = if (location.hasBearing()) location.bearing else null
        val speed = if (location.hasSpeed()) location.speed else null
        val accuracy = if (location.hasAccuracy()) location.accuracy else null

        ApiService.updateDriverLocation(
            driverId = driverId,
            rideId = activeRideId,
            lat = location.latitude,
            lng = location.longitude,
            heading = heading,
            speed = speed,
            accuracy = accuracy,
            onSuccess = {
                Log.d(TAG, "Uploaded driver real GPS location: (${location.latitude}, ${location.longitude})")
            },
            onError = { err ->
                Log.w(TAG, "Failed to upload driver GPS location: ${err.message}")
            }
        )
    }
}
