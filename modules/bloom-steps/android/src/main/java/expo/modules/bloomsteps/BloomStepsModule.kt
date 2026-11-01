package expo.modules.bloomsteps

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.time.LocalDate
import java.time.ZoneId
import kotlinx.coroutines.CompletableDeferred

private const val PERMISSION_REQUEST = 7301
private val READ_STEPS = HealthPermission.getReadPermission(StepsRecord::class)

class BloomStepsModule : Module() {
  private var pendingPermission: CompletableDeferred<Unit>? = null

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private fun available() = HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE

  private suspend fun granted(client: HealthConnectClient) =
    client.permissionController.getGrantedPermissions().contains(READ_STEPS)

  override fun definition() = ModuleDefinition {
    Name("BloomSteps")

    AsyncFunction("isAvailable") {
      available()
    }

    AsyncFunction("requestPermission") Coroutine { ->
      if (!available()) return@Coroutine false
      val client = HealthConnectClient.getOrCreate(context)
      if (granted(client)) return@Coroutine true
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      val intent = PermissionController.createRequestPermissionResultContract().createIntent(context, setOf(READ_STEPS))
      val result = CompletableDeferred<Unit>()
      pendingPermission = result
      activity.startActivityForResult(intent, PERMISSION_REQUEST)
      result.await()
      granted(client)
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode == PERMISSION_REQUEST) {
        pendingPermission?.complete(Unit)
        pendingPermission = null
      }
    }

    AsyncFunction("getDailyTotals") Coroutine { dates: List<String> ->
      if (!available()) return@Coroutine emptyList<Map<String, Any>>()
      val client = HealthConnectClient.getOrCreate(context)
      if (!granted(client)) return@Coroutine emptyList<Map<String, Any>>()
      val zone = ZoneId.systemDefault()
      dates.mapNotNull { date ->
        val day = LocalDate.parse(date)
        // aggregate() removes overlap between sources such as a phone and a watch.
        val response = client.aggregate(
          AggregateRequest(
            metrics = setOf(StepsRecord.COUNT_TOTAL),
            timeRangeFilter = TimeRangeFilter.between(day.atStartOfDay(zone).toInstant(), day.plusDays(1).atStartOfDay(zone).toInstant()),
          ),
        )
        response[StepsRecord.COUNT_TOTAL]?.let { mapOf<String, Any>("date" to date, "steps" to it) }
      }
    }
  }
}
