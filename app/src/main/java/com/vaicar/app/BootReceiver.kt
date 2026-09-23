package com.vaicar.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * BootReceiver
 * Restores driver background service if the device restarts and driver was online.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            Log.i("BootReceiver", "Device boot or package replaced, checking driver online status...")
            val isOnline = SecurityUtils.isDriverOnline(context)
            val isLoggedIn = SecurityUtils.isDriverLoggedIn(context)
            if (isOnline && isLoggedIn) {
                Log.i("BootReceiver", "Driver was online before reboot. Restarting DriverBackgroundService...")
                DriverBackgroundService.startService(context)
            }
        }
    }
}
