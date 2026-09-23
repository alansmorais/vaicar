package com.vaicar.app

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.sin

/**
 * SoundAlertHelper
 * Produces bell chime sound ("sinal sonoro de sinos") and device vibration
 * when the driver receives a new ride request / chamado.
 */
object SoundAlertHelper {
    private const val TAG = "SoundAlertHelper"
    private const val SAMPLE_RATE = 44100
    private var lastAlertTimestamp: Long = 0L

    /**
     * Triggers the bell chime sound and vibration for incoming ride calls.
     * Prevents duplicate spamming if called within 2 seconds.
     */
    fun triggerIncomingRideAlert(context: Context) {
        val now = System.currentTimeMillis()
        if (now - lastAlertTimestamp < 2000L) {
            return
        }
        lastAlertTimestamp = now

        CoroutineScope(Dispatchers.IO).launch {
            try {
                // 1. Vibrate device with energetic alert cadence
                vibrateDevice(context)

                // 2. Play synthesized bell chime ("som de sinos")
                playBellChimes(context)
            } catch (e: Exception) {
                Log.e(TAG, "Error triggering ride alert: ${e.message}", e)
                // Fallback: system notification ringtone
                playFallbackNotification(context)
            }
        }
    }

    /**
     * Vibrate the device in a distinctive pattern:
     * Vibrate 350ms, pause 150ms, vibrate 350ms, pause 150ms, vibrate 500ms
     */
    fun vibrateDevice(context: Context) {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator ?: (context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator)
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            }

            if (vibrator != null && vibrator.hasVibrator()) {
                val timings = longArrayOf(0, 350, 150, 350, 150, 500)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val amplitudes = intArrayOf(0, 255, 0, 255, 0, 255)
                    val effect = VibrationEffect.createWaveform(timings, amplitudes, -1)
                    vibrator.vibrate(effect)
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(timings, -1)
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Vibration failed: ${e.message}")
        }
    }

    /**
     * Synthesizes a 3-strike Westminster bell chime ("sinos")
     * Strike 1: A5 (880 Hz) - 450ms
     * Strike 2: D6 (1174.66 Hz) - 450ms
     * Strike 3: F#6 (1479.98 Hz) - 700ms
     * With natural exponential decay and harmonic overtones.
     */
    fun playBellChimes(context: Context) {
        try {
            val pcmData = generateBellChimeAudioData()
            val bufferSize = pcmData.size * 2

            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            val audioFormat = AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(SAMPLE_RATE)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .build()

            val audioTrack = AudioTrack.Builder()
                .setAudioAttributes(audioAttributes)
                .setAudioFormat(audioFormat)
                .setBufferSizeInBytes(bufferSize)
                .setTransferMode(AudioTrack.MODE_STATIC)
                .build()

            audioTrack.write(pcmData, 0, pcmData.size)
            audioTrack.play()

            // Automatically release after playing
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    // Total duration is approx 1.6 seconds
                    kotlinx.coroutines.delay(2000L)
                    audioTrack.stop()
                    audioTrack.release()
                } catch (_: Exception) {}
            }
        } catch (e: Exception) {
            Log.w(TAG, "AudioTrack synthesis failed, falling back to RingtoneManager: ${e.message}")
            playFallbackNotification(context)
        }
    }

    /**
     * Fallback using standard Android notification sound if AudioTrack cannot initialize
     */
    private fun playFallbackNotification(context: Context) {
        try {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            val ringtone = RingtoneManager.getRingtone(context.applicationContext, uri)
            ringtone?.play()
        } catch (e: Exception) {
            Log.e(TAG, "Fallback notification ringtone failed: ${e.message}")
        }
    }

    /**
     * Generates PCM 16-bit audio buffer for 3 successive bell chime strikes
     */
    private fun generateBellChimeAudioData(): ShortArray {
        // Strike definitions: Pair(Frequency in Hz, Duration in seconds)
        val strikes = listOf(
            Pair(880.0, 0.45),    // Strike 1: A5 bell chime
            Pair(1174.66, 0.45),  // Strike 2: D6 bell chime
            Pair(1479.98, 0.70)   // Strike 3: F#6 bell chime
        )

        val totalSamples = (strikes.sumOf { it.second } * SAMPLE_RATE).toInt()
        val buffer = ShortArray(totalSamples)
        var bufferIndex = 0

        for ((baseFreq, duration) in strikes) {
            val strikeSamples = (duration * SAMPLE_RATE).toInt()
            val attackSamples = (0.005 * SAMPLE_RATE).toInt() // 5ms attack to avoid audio clicks
            val decayRate = 4.5 / duration // Exponential decay factor

            for (i in 0 until strikeSamples) {
                if (bufferIndex >= totalSamples) break
                val t = i.toDouble() / SAMPLE_RATE

                // Envelope: quick linear rise, then smooth exponential bell ring decay
                val envelope = if (i < attackSamples) {
                    i.toDouble() / attackSamples
                } else {
                    exp(-decayRate * t)
                }

                // Bell harmonic series: fundamental + 2nd harmonic + 3rd harmonic + metallic inharmonic
                val sampleValue = (
                    1.00 * sin(2.0 * PI * baseFreq * t) +
                    0.45 * sin(2.0 * PI * (baseFreq * 2.0) * t) +
                    0.20 * sin(2.0 * PI * (baseFreq * 3.0) * t) +
                    0.15 * sin(2.0 * PI * (baseFreq * 4.2) * t)
                ) * envelope

                // Scale to 16-bit signed PCM range (max volume ~28000 to prevent clipping)
                val clamped = (sampleValue * 28000.0).coerceIn(-32767.0, 32767.0).toInt().toShort()
                buffer[bufferIndex++] = clamped
            }
        }

        return buffer
    }
}
