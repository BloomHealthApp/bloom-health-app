import ExpoModulesCore
import HealthKit

public class BloomStepsModule: Module {
  private let store = HKHealthStore()
  private let stepType = HKQuantityType(.stepCount)

  public func definition() -> ModuleDefinition {
    Name("BloomSteps")

    AsyncFunction("isAvailable") { () -> Bool in
      return HKHealthStore.isHealthDataAvailable()
    }

    AsyncFunction("requestPermission") { () async throws -> Bool in
      guard HKHealthStore.isHealthDataAvailable() else { return false }
      try await self.store.requestAuthorization(toShare: [], read: [self.stepType])
      return true
    }

    AsyncFunction("getDailyTotals") { (dates: [String]) async -> [[String: Any]] in
      guard HKHealthStore.isHealthDataAvailable() else { return [] }
      var totals: [[String: Any]] = []
      for date in dates {
        if let steps = await self.total(on: date) {
          totals.append(["date": date, "steps": steps])
        }
      }
      return totals
    }
  }

  private func total(on date: String) async -> Int? {
    let parts = date.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else { return nil }
    let calendar = Calendar.current
    guard
      let start = calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2])),
      let end = calendar.date(byAdding: .day, value: 1, to: start)
    else { return nil }
    let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
    return await withCheckedContinuation { continuation in
      // A statistics query removes overlap between sources such as a phone and a watch.
      let query = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, stats, _ in
        continuation.resume(returning: stats?.sumQuantity().map { Int($0.doubleValue(for: .count())) })
      }
      store.execute(query)
    }
  }
}
