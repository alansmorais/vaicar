package com.vaicar.app

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.sin

/**
 * SoundAlertHelper
 * Produces bell chime sound ("sinal sonoro de sinos"), high-intensity wake-up alarm,
 * and device vibration when the driver receives a new ride request / chamado.
 * Supports persistent continuous looping alarm to WAKE UP the driver ("acordar o motorista").
 */
object SoundAlertHelper {
    private const val TAG = "SoundAlertHelper"
    private const val SAMPLE_RATE = 44100
    private var lastAlertTimestamp: Long = 0L

    @Volatile
    private var isAlarmActive: Boolean = false
    private var alarmJob: Job? = null
    private var activeRingtone: Ringtone? = null

    /**
     * Checks if the loud wake-up alarm is currently playing.
     */
    fun isAlarmPlaying(): Boolean = isAlarmActive

    /**
     * Starts continuous high-volume wake-up alarm and vibration loop
     * specifically engineered to wake up a sleeping driver ("para acordar o motorista").
     * Loops continuously until stopAlarm() is explicitly called (e.g., driver accepts/dismisses).
     */
    fun startLoudWakeUpAlarm(context: Context) {
        if (isAlarmActive) {
            Log.d(TAG, "Loud wake-up alarm is already active.")
            return
        }
        isAlarmActive = true
        Log.i(TAG, "Starting loud wake-up alarm loop for driver...")

        // Maximize alarm stream volume if possible
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            audioManager?.let { am ->
                val maxVol = am.getStreamMaxVolume(AudioManager.STREAM_ALARM)
                // Set to at least 85% of max alarm volume so driver wakes up
                val targetVol = (maxVol * 0.9).toInt().coerceAtLeast(1)
                am.setStreamVolume(AudioManager.STREAM_ALARM, targetVol, 0)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not adjust alarm stream volume: ${e.message}")
        }

        // Launch repeating sound + vibration loop in background coroutine
        alarmJob?.cancel()
        alarmJob = CoroutineScope(Dispatchers.IO).launch {
            try {
                // Pre-generate PCM audio data once to avoid repeated allocations in loop
                val alarmAudio = generateHighIntensityAlarmAudioData()

                // Start continuous vibration waveform
                startAlarmVibration(context)

                while (isActive && isAlarmActive) {
                    playAlarmAudioBuffer(alarmAudio, context)
                    // Short pause between alarm cycles (1.6s cycle + 400ms pause)
                    delay(2000L)
                }
            } catch (e: CancellationException) {
                Log.d(TAG, "Alarm coroutine cancelled.")
            } catch (e: Exception) {
                Log.e(TAG, "Error in alarm loop: ${e.message}", e)
                // Fallback to system ringtone loop
                playSystemAlarmRingtoneLoop(context)
            } finally {
                stopVibration(context)
            }
        }
    }

    /**
     * Stops the wake-up alarm sound and vibration immediately.
     */
    fun stopAlarm(context: Context? = null) {
        Log.i(TAG, "Stopping loud wake-up alarm...")
        isAlarmActive = false
        alarmJob?.cancel()
        alarmJob = null

        try {
            activeRingtone?.stop()
            activeRingtone = null
        } catch (_: Exception) {}

        if (context != null) {
            stopVibration(context)
        }
    }

    /**
     * Single trigger of bell chime sound and vibration (for regular in-app notifications).
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
                vibrateDevice(context)
                playBellChimes(context)
            } catch (e: Exception) {
                Log.e(TAG, "Error triggering ride alert: ${e.message}", e)
                playFallbackNotification(context)
            }
        }
    }

    /**
     * Continuous rhythmic vibration to wake the driver.
     * Vibrate 700ms, pause 200ms, vibrate 700ms, pause 200ms, vibrate 1000ms, pause 500ms
     */
    private fun startAlarmVibration(context: Context) {
        try {
            val vibrator = getVibrator(context) ?: return
            if (!vibrator.hasVibrator()) return

            val timings = longArrayOf(0, 700, 200, 700, 200, 1000, 500)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val amplitudes = intArrayOf(0, 255, 0, 255, 0, 255, 0)
                // repeat index 0 -> continuous repeat loop
                val effect = VibrationEffect.createWaveform(timings, amplitudes, 0)
                vibrator.vibrate(effect)
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(timings, 0)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Continuous alarm vibration failed: ${e.message}")
        }
    }

    private fun stopVibration(context: Context) {
        try {
            val vibrator = getVibrator(context)
            vibrator?.cancel()
        } catch (e: Exception) {
            Log.w(TAG, "Stop vibration failed: ${e.message}")
        }
    }

    private fun getVibrator(context: Context): Vibrator? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            vm?.defaultVibrator ?: (context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator)
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }

    /**
     * Vibrate device for single notification
     */
    fun vibrateDevice(context: Context) {
        try {
            val vibrator = getVibrator(context) ?: return
            if (vibrator.hasVibrator()) {
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
     * Plays synthesized high-intensity bell/alarm audio buffer using AudioAttributes.USAGE_ALARM
     */
    private fun playAlarmAudioBuffer(pcmData: ShortArray, context: Context) {
        var track: AudioTrack? = null
        try {
            val bufferSize = pcmData.size * 2
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            val audioFormat = AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(SAMPLE_RATE)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .build()

            track = AudioTrack.Builder()
                .setAudioAttributes(audioAttributes)
                .setAudioFormat(audioFormat)
                .setBufferSizeInBytes(bufferSize)
                .setTransferMode(AudioTrack.MODE_STATIC)
                .build()

            track.write(pcmData, 0, pcmData.size)
            track.play()

            // Keep track alive for playback duration
            val durationMs = (pcmData.size.toDouble() / SAMPLE_RATE * 1000).toLong()
            Thread.sleep(durationMs)
        } catch (e: Exception) {
            Log.w(TAG, "Alarm AudioTrack playback error: ${e.message}")
            playSystemAlarmRingtoneLoop(context)
        } finally {
            try {
                track?.stop()
                track?.release()
            } catch (_: Exception) {}
        }
    }

    /**
     * Single chime playback (non-looping)
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

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    delay(2000L)
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
     * Fallback to system ALARM or RINGTONE
     */
    private fun playSystemAlarmRingtoneLoop(context: Context) {
        try {
            if (activeRingtone == null || !activeRingtone!!.isPlaying) {
                val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                activeRingtone = RingtoneManager.getRingtone(context.applicationContext, uri)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    activeRingtone?.audioAttributes = AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                }
                activeRingtone?.play()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Fallback alarm ringtone failed: ${e.message}")
        }
    }

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
     * Generates a loud, penetrating multi-tone alarm chime for waking the driver
     * Strikes:
     * 1. 987.77 Hz (B5) loud attack - 350ms
     * 2. 1318.51 Hz (E6) loud attack - 350ms
     * 3. 1760.00 Hz (A6) high loud siren tone - 450ms
     * 4. 1318.51 Hz (E6) resolving chord - 400ms
     */
    private fun generateHighIntensityAlarmAudioData(): ShortArray {
        val strikes = listOf(
            Pair(987.77, 0.35),
            Pair(1318.51, 0.35),
            Pair(1760.00, 0.45),
            Pair(1318.51, 0.40)
        )

        val totalSamples = (strikes.sumOf { it.second } * SAMPLE_RATE).toInt()
        val buffer = ShortArray(totalSamples)
        var bufferIndex = 0

        for ((baseFreq, duration) in strikes) {
            val strikeSamples = (duration * SAMPLE_RATE).toInt()
            val attackSamples = (0.003 * SAMPLE_RATE).toInt()
            val decayRate = 3.0 / duration

            for (i in 0 until strikeSamples) {
                if (bufferIndex >= totalSamples) break
                val t = i.toDouble() / SAMPLE_RATE

                val envelope = if (i < attackSamples) {
                    i.toDouble() / attackSamples
                } else {
                    exp(-decayRate * t)
                }

                // Piercing harmonic mix to penetrate deep sleep
                val sampleValue = (
                    1.00 * sin(2.0 * PI * baseFreq * t) +
                    0.55 * sin(2.0 * PI * (baseFreq * 2.0) * t) +
                    0.35 * sin(2.0 * PI * (baseFreq * 3.0) * t) +
                    0.25 * sin(2.0 * PI * (baseFreq * 1.5) * t)
                ) * envelope

                val clamped = (sampleValue * 30000.0).coerceIn(-32767.0, 32767.0).toInt().toShort()
                buffer[bufferIndex++] = clamped
            }
        }
        return buffer
    }

    /**
     * Standard 3-strike Westminster bell chime
     */
    private fun generateBellChimeAudioData(): ShortArray {
        val strikes = listOf(
            Pair(880.0, 0.45),
            Pair(1174.66, 0.45),
            Pair(1479.98, 0.70)
        )

        val totalSamples = (strikes.sumOf { it.second } * SAMPLE_RATE).toInt()
        val buffer = ShortArray(totalSamples)
        var bufferIndex = 0

        for ((baseFreq, duration) in strikes) {
            val strikeSamples = (duration * SAMPLE_RATE).toInt()
            val attackSamples = (0.005 * SAMPLE_RATE).toInt()
            val decayRate = 4.5 / duration

            for (i in 0 until strikeSamples) {
                if (bufferIndex >= totalSamples) break
                val t = i.toDouble() / SAMPLE_RATE

                val envelope = if (i < attackSamples) {
                    i.toDouble() / attackSamples
                } else {
                    exp(-decayRate * t)
                }

                val sampleValue = (
                    1.00 * sin(2.0 * PI * baseFreq * t) +
                    0.45 * sin(2.0 * PI * (baseFreq * 2.0) * t) +
                    0.20 * sin(2.0 * PI * (baseFreq * 3.0) * t) +
                    0.15 * sin(2.0 * PI * (baseFreq * 4.2) * t)
                ) * envelope

                val clamped = (sampleValue * 28000.0).coerceIn(-32767.0, 32767.0).toInt().toShort()
                buffer[bufferIndex++] = clamped
            }
        }

        return buffer
    }
}
