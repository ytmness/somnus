#!/usr/bin/env ruby
# frozen_string_literal: true

# Parchea ios/App/App.xcodeproj sin necesidad de abrir Xcode.
# La gema `xcodeproj` viene instalada con CocoaPods en los runners macOS
# de Codemagic, asi que no hay que instalar nada extra.
#
# Idempotente: se puede correr en cada build sobre un proyecto recien generado.

require 'xcodeproj'

ROOT = File.expand_path('..', __dir__)
PROJECT_PATH = File.join(ROOT, 'ios', 'App', 'App.xcodeproj')

BUNDLE_ID = ENV.fetch('BUNDLE_ID', 'live.somnus.app')
DEPLOYMENT_TARGET = ENV.fetch('IOS_DEPLOYMENT_TARGET', '15.0')
ENTITLEMENTS_RELATIVE = 'App/App.entitlements'

abort("ERROR: no existe #{PROJECT_PATH}. Ejecuta 'npx cap add ios' antes.") unless Dir.exist?(PROJECT_PATH)

project = Xcodeproj::Project.open(PROJECT_PATH)
target = project.targets.find { |t| t.name == 'App' }
abort('ERROR: no se encontro el target "App" en App.xcodeproj') if target.nil?

app_group = project.main_group['App'] || project.main_group
unless app_group.files.any? { |f| f.path == 'App.entitlements' }
  app_group.new_reference('App.entitlements')
  puts '  + App.entitlements agregado al proyecto'
end

team_id = ENV['DEVELOPMENT_TEAM'] || ENV['APPLE_DEVELOPMENT_TEAM'] || '757NQ675N5'

target.build_configurations.each do |config|
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = BUNDLE_ID
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = ENTITLEMENTS_RELATIVE
  config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = DEPLOYMENT_TARGET
  config.build_settings['CURRENT_PROJECT_VERSION'] ||= '1'
  config.build_settings['MARKETING_VERSION'] = ENV['MARKETING_VERSION'] if ENV['MARKETING_VERSION']
  # El firmado lo resuelve `xcode-project use-profiles` de Codemagic.
  config.build_settings['CODE_SIGN_STYLE'] = 'Manual'
  config.build_settings['DEVELOPMENT_TEAM'] = team_id
end

project.build_configurations.each do |config|
  config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = DEPLOYMENT_TARGET
end

project.save
puts "  + bundle id: #{BUNDLE_ID}"
puts "  + entitlements: #{ENTITLEMENTS_RELATIVE}"
puts "  + deployment target: #{DEPLOYMENT_TARGET}"
