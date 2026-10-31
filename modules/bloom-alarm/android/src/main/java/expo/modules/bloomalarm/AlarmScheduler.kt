package expo.modules.bloomalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

data class StoredAlarm(val id: String, val hour: Int, val minute: Int, val title: String, val body: String)

/** The schedule has to live natively: alarms must be restored after a reboot without starting React Native. */
object AlarmStore {
  private const val PREFS = "bloom_alarms"
  private const val KEY = "alarms"

  fun all(context: Context): List<StoredAlarm> {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null) ?: return emptyList()
    val array = JSONArray(raw)
    return List(array.length()) { i ->
      val o = array.getJSONObject(i)
      StoredAlarm(o.getString("id"), o.getInt("hour"), o.getInt("minute"), o.getString("title"), o.getString("body"))
    }
  }

  fun get(context: Context, id: String) = all(context).firstOrNull { it.id == id }

  fun put(context: Context, alarm: StoredAlarm) = write(context, all(context).filter { it.id != alarm.id } + alarm)

  fun remove(context: Context, id: String) = write(context, all(context).filter { it.id != id })

  private fun write(context: Context, alarms: List<StoredAlarm>) {
    val array = JSONArray()
    alarms.forEach {
      array.put(JSONObject().put("id", it.id).put("hour", it.hour).put("minute", it.minute).put("title", it.title).put("body", it.body))
    }
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, array.toString()).apply()
  }
}

object AlarmScheduler {
  private const val ACTION_FIRE = "expo.modules.bloomalarm.FIRE"
  const val EXTRA_ID = "id"
  const val EXTRA_TITLE = "title"
  const val EXTRA_BODY = "body"
  private const val SNOOZE_MINUTES = 10

  fun canSchedule(context: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.S || manager(context).canScheduleExactAlarms()

  fun schedule(context: Context, alarm: StoredAlarm) {
    val at = nextOccurrence(alarm.hour, alarm.minute, System.currentTimeMillis())
    set(context, at, firePendingIntent(context, alarm.id, alarm.title, alarm.body, snooze = false))
  }

  fun snooze(context: Context, id: String, title: String, body: String) {
    val at = System.currentTimeMillis() + SNOOZE_MINUTES * 60_000L
    set(context, at, firePendingIntent(context, id, title, body, snooze = true))
  }

  fun cancel(context: Context, id: String) {
    manager(context).cancel(firePendingIntent(context, id, "", "", snooze = false))
    manager(context).cancel(firePendingIntent(context, id, "", "", snooze = true))
  }

  fun restoreAll(context: Context) {
    if (!canSchedule(context)) return
    AlarmStore.all(context).forEach { schedule(context, it) }
  }

  fun nextOccurrence(hour: Int, minute: Int, now: Long): Long {
    val calendar = Calendar.getInstance().apply {
      timeInMillis = now
      set(Calendar.HOUR_OF_DAY, hour)
      set(Calendar.MINUTE, minute)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }
    if (calendar.timeInMillis <= now) calendar.add(Calendar.DAY_OF_YEAR, 1)
    return calendar.timeInMillis
  }

  private fun set(context: Context, at: Long, operation: PendingIntent) {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val show = launch?.let { PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE) }
    manager(context).setAlarmClock(AlarmManager.AlarmClockInfo(at, show), operation)
  }

  private fun firePendingIntent(context: Context, id: String, title: String, body: String, snooze: Boolean): PendingIntent {
    val intent = Intent(context, AlarmFireReceiver::class.java)
      .setAction(ACTION_FIRE)
      .setData(Uri.parse("bloomalarm://${if (snooze) "snooze" else "fire"}/$id"))
      .putExtra(EXTRA_ID, id)
      .putExtra(EXTRA_TITLE, title)
      .putExtra(EXTRA_BODY, body)
    return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun manager(context: Context) = context.getSystemService(AlarmManager::class.java)
}
