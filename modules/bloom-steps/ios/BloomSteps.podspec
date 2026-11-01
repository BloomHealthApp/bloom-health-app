Pod::Spec.new do |s|
  s.name           = 'BloomSteps'
  s.version        = '1.0.0'
  s.summary        = 'Daily step totals for Bloom Health'
  s.description    = 'Reads daily step totals from HealthKit.'
  s.license        = { type: 'Proprietary' }
  s.author         = 'Bloom Health'
  s.homepage       = 'https://github.com/BloomHealthApp'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.frameworks     = 'HealthKit'

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
end
