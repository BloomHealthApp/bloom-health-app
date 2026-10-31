import ExpoModulesCore
#if canImport(AlarmKit)
import AlarmKit
import SwiftUI
#endif

struct AlarmInput: Record {
  @Field var id: String = ""
  @Field var hour: Int = 0
  @Field var minute: Int = 0
  @Field var title: String = ""
  @Field var body: String = ""
}

public class BloomAlarmModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BloomAlarm")

    AsyncFunction("getAvailability") { () -> String in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        return BloomAlarmKit.availability()
      }
      #endif
      return "unavailable"
    }

    AsyncFunction("requestPermission") { () async throws in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        _ = try await AlarmManager.shared.requestAuthorization()
      }
      #endif
    }

    AsyncFunction("canUseFullScreen") { () -> Bool in
      return true
    }

    AsyncFunction("openFullScreenSettings") { () in
    }

    AsyncFunction("getScheduledIds") { () -> [String] in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        return BloomAlarmKit.scheduledIds()
      }
      #endif
      return []
    }

    AsyncFunction("schedule") { (input: AlarmInput) async throws in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        try await BloomAlarmKit.schedule(input)
      }
      #endif
    }

    AsyncFunction("cancel") { (id: String) in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        BloomAlarmKit.cancel(id)
      }
      #endif
    }
  }
}

#if canImport(AlarmKit)
@available(iOS 26.0, *)
nonisolated struct BloomAlarmMetadata: AlarmMetadata {}

@available(iOS 26.0, *)
enum BloomAlarmKit {
  private static let idsKey = "bloom.alarm.ids"
  private static let everyDay: [Locale.Weekday] = [.sunday, .monday, .tuesday, .wednesday, .thursday, .friday, .saturday]

  static func availability() -> String {
    switch AlarmManager.shared.authorizationState {
    case .authorized: return "granted"
    case .denied: return "denied"
    case .notDetermined: return "needsPermission"
    @unknown default: return "unavailable"
    }
  }

  static func scheduledIds() -> [String] {
    let live = Set(((try? AlarmManager.shared.alarms) ?? []).map { $0.id })
    return storedIds().compactMap { live.contains($0.value) ? $0.key : nil }
  }

  // No snooze: its countdown state needs a widget extension, and without one Apple warns alarms may be dismissed and not alert.
  static func schedule(_ input: AlarmInput) async throws {
    let alert = AlarmPresentation.Alert(
      title: LocalizedStringResource(String.LocalizationValue(input.title)),
      stopButton: AlarmButton(text: "Stop", textColor: .white, systemImageName: "stop.circle"),
      secondaryButton: nil,
      secondaryButtonBehavior: nil
    )
    let attributes = AlarmAttributes<BloomAlarmMetadata>(
      presentation: AlarmPresentation(alert: alert),
      metadata: BloomAlarmMetadata(),
      tintColor: Color(red: 0.84, green: 0.36, blue: 0.60)
    )
    let schedule = Alarm.Schedule.relative(.init(
      time: Alarm.Schedule.Relative.Time(hour: input.hour, minute: input.minute),
      repeats: .weekly(everyDay)
    ))
    let configuration = AlarmManager.AlarmConfiguration<BloomAlarmMetadata>(
      countdownDuration: nil,
      schedule: schedule,
      attributes: attributes,
      stopIntent: nil,
      secondaryIntent: nil
    )
    var ids = storedIds()
    let uuid = ids[input.id] ?? UUID()
    try? AlarmManager.shared.cancel(id: uuid)
    _ = try await AlarmManager.shared.schedule(id: uuid, configuration: configuration)
    ids[input.id] = uuid
    save(ids)
  }

  static func cancel(_ id: String) {
    var ids = storedIds()
    guard let uuid = ids[id] else { return }
    try? AlarmManager.shared.cancel(id: uuid)
    ids[id] = nil
    save(ids)
  }

  private static func storedIds() -> [String: UUID] {
    let raw = UserDefaults.standard.dictionary(forKey: idsKey) as? [String: String] ?? [:]
    return raw.compactMapValues { UUID(uuidString: $0) }
  }

  private static func save(_ ids: [String: UUID]) {
    UserDefaults.standard.set(ids.mapValues { $0.uuidString }, forKey: idsKey)
  }
}
#endif
