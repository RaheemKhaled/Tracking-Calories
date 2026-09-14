package com.example.appediet

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class StepCounterService : Service(), SensorEventListener {

    private lateinit var sensorManager: SensorManager
    private var stepSensor: Sensor? = null
    private lateinit var prefs: SharedPreferences

    private var initialBootSteps: Float = -1f
    private var lastRawBootSteps: Float = -1f
    private var rebootAccumulator: Int = 0
    private var currentSessionSteps: Int = 0

    companion object {
        const val CHANNEL_ID = "step_counter_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_STEP_UPDATE = "com.example.appediet.STEP_UPDATE"
        const val EXTRA_STEPS = "extra_steps"

        const val PREFS_NAME = "step_tracker_prefs"
        const val KEY_SAVED_DATE = "saved_date"
        const val KEY_BOOT_BASELINE = "boot_baseline"
        const val KEY_LAST_RAW_BOOT = "last_raw_boot_steps"
        const val KEY_REBOOT_ACCUMULATOR = "reboot_accumulator"
        const val KEY_TODAY_STEPS = "today_steps"

        fun getSavedTodaySteps(context: Context): Int {
            val p = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val savedDate = p.getString(KEY_SAVED_DATE, null)
            return if (savedDate == todayStr) {
                p.getInt(KEY_TODAY_STEPS, 0)
            } else {
                0
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)

        loadPersistedState()
        createNotificationChannel()
    }

    private fun getTodayDateStr(): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    }

    private fun loadPersistedState() {
        val today = getTodayDateStr()
        val savedDate = prefs.getString(KEY_SAVED_DATE, null)

        if (savedDate != today) {
            // New day: reset today's baseline counters
            initialBootSteps = -1f
            lastRawBootSteps = -1f
            rebootAccumulator = 0
            currentSessionSteps = 0

            prefs.edit().apply {
                putString(KEY_SAVED_DATE, today)
                putFloat(KEY_BOOT_BASELINE, -1f)
                putFloat(KEY_LAST_RAW_BOOT, -1f)
                putInt(KEY_REBOOT_ACCUMULATOR, 0)
                putInt(KEY_TODAY_STEPS, 0)
                apply()
            }
        } else {
            // Restore within same day
            initialBootSteps = prefs.getFloat(KEY_BOOT_BASELINE, -1f)
            lastRawBootSteps = prefs.getFloat(KEY_LAST_RAW_BOOT, -1f)
            rebootAccumulator = prefs.getInt(KEY_REBOOT_ACCUMULATOR, 0)
            currentSessionSteps = prefs.getInt(KEY_TODAY_STEPS, 0)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        loadPersistedState()

        val notification = buildNotification("خطوات اليوم: $currentSessionSteps خطوة 👟")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH
                } else {
                    0
                }
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        // Register the sensor listener with batching delay to minimize battery consumption
        stepSensor?.let {
            // 10,000,000 microseconds = 10 sec max batching latency for sensor hub FIFO
            val batchLatencyUs = 10_000_000
            val registered = sensorManager.registerListener(
                this,
                it,
                SensorManager.SENSOR_DELAY_UI,
                batchLatencyUs
            )
            if (!registered) {
                // Fallback to standard registration if batching is unsupported
                sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI)
            }
        }

        // Broadcast current cached steps immediately
        broadcastStepUpdate(currentSessionSteps)

        return START_STICKY
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type == Sensor.TYPE_STEP_COUNTER) {
            val totalStepsSinceBoot = event.values[0]
            val today = getTodayDateStr()
            val savedDate = prefs.getString(KEY_SAVED_DATE, null)

            // Day change detection (midnight rollover)
            if (savedDate != today) {
                initialBootSteps = totalStepsSinceBoot
                lastRawBootSteps = totalStepsSinceBoot
                rebootAccumulator = 0
                currentSessionSteps = 0
                prefs.edit().apply {
                    putString(KEY_SAVED_DATE, today)
                    putFloat(KEY_BOOT_BASELINE, initialBootSteps)
                    putFloat(KEY_LAST_RAW_BOOT, lastRawBootSteps)
                    putInt(KEY_REBOOT_ACCUMULATOR, 0)
                    putInt(KEY_TODAY_STEPS, 0)
                    apply()
                }
            } else {
                // Initial baseline on first reading of the day
                if (initialBootSteps < 0) {
                    initialBootSteps = totalStepsSinceBoot
                }

                // Reboot resilience: if counter dropped below previous raw reading, phone restarted
                if (lastRawBootSteps > 0 && totalStepsSinceBoot < lastRawBootSteps) {
                    val stepsBeforeReboot = (lastRawBootSteps - initialBootSteps).toInt()
                    if (stepsBeforeReboot > 0) {
                        rebootAccumulator += stepsBeforeReboot
                    }
                    initialBootSteps = totalStepsSinceBoot
                }

                val currentDelta = (totalStepsSinceBoot - initialBootSteps).toInt()
                currentSessionSteps = Math.max(0, currentDelta + rebootAccumulator)
                lastRawBootSteps = totalStepsSinceBoot

                // Persist current state
                prefs.edit().apply {
                    putString(KEY_SAVED_DATE, today)
                    putFloat(KEY_BOOT_BASELINE, initialBootSteps)
                    putFloat(KEY_LAST_RAW_BOOT, lastRawBootSteps)
                    putInt(KEY_REBOOT_ACCUMULATOR, rebootAccumulator)
                    putInt(KEY_TODAY_STEPS, currentSessionSteps)
                    apply()
                }
            }

            updateNotification("خطوات اليوم: $currentSessionSteps خطوة 👟")
            broadcastStepUpdate(currentSessionSteps)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun broadcastStepUpdate(steps: Int) {
        val broadcastIntent = Intent(ACTION_STEP_UPDATE).apply {
            putExtra(EXTRA_STEPS, steps)
            setPackage(packageName)
        }
        sendBroadcast(broadcastIntent)
    }

    private fun buildNotification(contentText: String): Notification {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("تتبع خطوات كوتش رحيم (تلقائي)")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun updateNotification(contentText: String) {
        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(NOTIFICATION_ID, buildNotification(contentText))
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "تتبع الخطوات التلقائي - Raheem Coach",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "عرض عداد الخطوات المباشر في شريط الإشعارات"
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            sensorManager.unregisterListener(this)
        } catch (e: Exception) {
            // Ignored
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
