Pod::Spec.new do |s|
  s.name           = 'BloomAlarm'
  s.version        = '1.0.0'
  s.summary        = 'Loud alarms for Bloom Health'
  s.description    = 'Schedules AlarmKit alarms on iOS 26 and later.'
  s.license        = { type: 'Proprietary' }
  s.author         = 'Bloom Health'
  s.homepage       = 'https://github.com/BloomHealthApp'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.weak_frameworks = 'AlarmKit'

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
end
