package expo.modules.bloomalarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.drawable.Icon
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import kotlin.math.roundToInt

/** Keeps ringing after the app and screen are gone, which a notification sound cannot do. */
class AlarmRingService : Service() {
  private var player: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private var restoreVolume: Int? = null
  private var currentId = ""
  private var currentTitle = ""
  private var currentBody = ""
  private var currentVolume = 1.0
  private val handler = Handler(Looper.getMainLooper())
  private val autoStop = Runnable { finish() }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_RING -> {
        currentId = intent.getStringExtra(AlarmScheduler.EXTRA_ID).orEmpty()
        currentTitle = intent.getStringExtra(AlarmScheduler.EXTRA_TITLE).orEmpty()
        currentBody = intent.getStringExtra(AlarmScheduler.EXTRA_BODY).orEmpty()
        currentVolume = intent.getDoubleExtra(AlarmScheduler.EXTRA_VOLUME, 1.0)
        begin()
      }
      ACTION_SNOOZE -> {
        try {
          if (currentId.isNotEmpty()) AlarmScheduler.snooze(this, currentId, currentTitle, currentBody, currentVolume)
        } catch (e: SecurityException) {
          Log.w(TAG, "Could not snooze", e)
        }
        finish()
      }
      ACTION_DISMISS -> finish()
      else -> stopSelf()
    }
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    stopRinging()
    AlarmActivity.closeCurrent()
    super.onDestroy()
  }

  private fun begin() {
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    if (player == null) startRinging()
    handler.removeCallbacks(autoStop)
    handler.postDelayed(autoStop, AUTO_STOP_MS)
  }

  private fun finish() {
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  @Suppress("DEPRECATION")
  private fun startRinging() {
    val audio = getSystemService(AudioManager::class.java)
    try {
      restoreVolume = audio.getStreamVolume(AudioManager.STREAM_ALARM)
      val max = audio.getStreamMaxVolume(AudioManager.STREAM_ALARM)
      audio.setStreamVolume(AudioManager.STREAM_ALARM, (max * currentVolume).roundToInt().coerceIn(1, max), 0)
    } catch (e: SecurityException) {
      restoreVolume = null
      Log.w(TAG, "Could not raise the alarm volume", e)
    }
    val attributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()
    // The tone expo-notifications bundles, so the alarm sounds like the preview in Settings.
    val tone = resources.getIdentifier("alarm", "raw", packageName)
    val uri = if (tone != 0) Uri.parse("android.resource://$packageName/$tone")
    else RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
    try {
      player = MediaPlayer().apply {
        setWakeMode(this@AlarmRingService, PowerManager.PARTIAL_WAKE_LOCK)
        setAudioAttributes(attributes)
        setDataSource(this@AlarmRingService, uri)
        isLooping = true
        prepare()
        start()
      }
    } catch (e: Exception) {
      Log.w(TAG, "Could not play the alarm sound; vibrating only", e)
    }
    vibrator = (getSystemService(Context.VIBRATOR_SERVICE) as Vibrator).also {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        it.vibrate(VibrationEffect.createWaveform(VIBRATION, 0), attributes)
      } else {
        it.vibrate(VIBRATION, 0, attributes)
      }
    }
  }

  private fun stopRinging() {
    handler.removeCallbacks(autoStop)
    player?.run {
      runCatching { stop() }
      release()
    }
    player = null
    vibrator?.cancel()
    vibrator = null
    restoreVolume?.let { volume ->
      runCatching { getSystemService(AudioManager::class.java).setStreamVolume(AudioManager.STREAM_ALARM, volume, 0) }
    }
    restoreVolume = null
  }

  @Suppress("DEPRECATION")
  private fun buildNotification(): Notification {
    val manager = getSystemService(NotificationManager::class.java)
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      // The service plays the sound, so the channel itself stays silent.
      val channel = NotificationChannel(CHANNEL_ID, "Loud alarms", NotificationManager.IMPORTANCE_HIGH).apply {
        setSound(null, null)
        enableVibration(false)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }
      manager.createNotificationChannel(channel)
      Notification.Builder(this, CHANNEL_ID)
    } else {
      Notification.Builder(this).setPriority(Notification.PRIORITY_MAX)
    }
    val screen = Intent(this, AlarmActivity::class.java)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      .putExtra(AlarmScheduler.EXTRA_TITLE, currentTitle)
      .putExtra(AlarmScheduler.EXTRA_BODY, currentBody)
    val fullScreen = PendingIntent.getActivity(this, 0, screen, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val namedIcon = resources.getIdentifier("notification_icon", "drawable", packageName)
    val smallIcon = if (namedIcon != 0) namedIcon else applicationInfo.icon
    return builder
      .setSmallIcon(smallIcon)
      .setContentTitle(currentTitle)
      .setContentText(currentBody)
      .setCategory(Notification.CATEGORY_ALARM)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setContentIntent(fullScreen)
      .setFullScreenIntent(fullScreen, true)
      .addAction(action("Snooze", ACTION_SNOOZE, smallIcon))
      .addAction(action("Dismiss", ACTION_DISMISS, smallIcon))
      .build()
  }

  private fun action(label: String, action: String, icon: Int): Notification.Action {
    val pending = PendingIntent.getService(this, action.hashCode(), command(this, action), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    return Notification.Action.Builder(Icon.createWithResource(this, icon), label, pending).build()
  }

  companion object {
    const val ACTION_RING = "expo.modules.bloomalarm.RING"
    const val ACTION_SNOOZE = "expo.modules.bloomalarm.SNOOZE"
    const val ACTION_DISMISS = "expo.modules.bloomalarm.DISMISS"
    private const val TAG = "BloomAlarm"
    private const val CHANNEL_ID = "bloom_loud_alarms"
    private const val NOTIFICATION_ID = 4107
    private const val AUTO_STOP_MS = 15 * 60_000L
    private val VIBRATION = longArrayOf(0, 800, 500)

    fun command(context: Context, action: String): Intent = Intent(context, AlarmRingService::class.java).setAction(action)
  }
}
