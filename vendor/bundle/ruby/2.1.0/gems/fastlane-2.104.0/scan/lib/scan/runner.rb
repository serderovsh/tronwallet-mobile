require 'open3'
require 'fileutils'
require 'terminal-table'
require 'shellwords'

require 'fastlane_core/env'
require 'fastlane_core/device_manager'
require_relative 'module'
require_relative 'xcpretty_reporter_options_generator'
require_relative 'test_result_parser'
require_relative 'slack_poster'
require_relative 'test_command_generator'
require_relative 'error_handler'

module Scan
  class Runner
    def initialize
      @test_command_generator = TestCommandGenerator.new
    end

    def run
      handle_results(test_app)
    end

    def test_app
      # We call this method, to be sure that all other simulators are killed
      # And a correct one is freshly launched. Switching between multiple simulator
      # in case the user specified multiple targets works with no issues
      # This way it's okay to just call it for the first simulator we're using for
      # the first test run
      open_simulator_for_device(Scan.devices.first) if Scan.devices
      command = @test_command_generator.generate
      prefix_hash = [
        {
          prefix: "Running Tests: ",
          block: proc do |value|
            value.include?("Touching")
          end
        }
      ]
      exit_status = 0
      FastlaneCore::CommandExecutor.execute(command: command,
                                          print_all: true,
                                      print_command: true,
                                             prefix: prefix_hash,
                                            loading: "Loading...",
                                              error: proc do |error_output|
                                                begin
                                                  exit_status = $?.exitstatus
                                                  ErrorHandler.handle_build_error(error_output)
                                                rescue => ex
                                                  SlackPoster.new.run({
                                                    build_errors: 1
                                                  })
                                                  raise ex
                                                end
                                              end)
      exit_status
    end

    def handle_results(tests_exit_status)
      result = TestResultParser.new.parse_result(test_results)
      SlackPoster.new.run(result)

      if result[:failures] > 0
        failures_str = result[:failures].to_s.red
      else
        failures_str = result[:failures].to_s.green
      end

      puts(Terminal::Table.new({
        title: "Test Results",
        rows: [
          ["Number of tests", result[:tests]],
          ["Number of failures", failures_str]
        ]
      }))
      puts("")

      copy_simulator_logs

      if result[:failures] > 0
        UI.test_failure!("Tests have failed")
      end

      unless tests_exit_status == 0
        UI.test_failure!("Test execution failed. Exit status: #{tests_exit_status}")
      end

      zip_build_products

      if !Helper.ci? && Scan.cache[:open_html_report_path]
        `open --hide '#{Scan.cache[:open_html_report_path]}'`
      end
    end

    def zip_build_products
      return unless Scan.config[:should_zip_build_products]

      # Gets :derived_data_path/Build/Products directory for zipping zip
      derived_data_path = Scan.config[:derived_data_path]
      path = File.join(derived_data_path, "Build/Products")

      # Gets absolute path of output directory
      output_directory = File.absolute_path(Scan.config[:output_directory])
      output_path = File.join(output_directory, "build_products.zip")

      # Caching path for action to put into lane_context
      Scan.cache[:zip_build_products_path] = output_path

      # Zips build products and moves it to output directory
      UI.message("Zipping build products")
      FastlaneCore::Helper.zip_directory(path, output_path, contents_only: true, overwrite: true, print: false)
      UI.message("Succesfully zipped build products: #{output_path}")
    end

    def test_results
      temp_junit_report = Scan.cache[:temp_junit_report]
      return File.read(temp_junit_report) if temp_junit_report && File.file?(temp_junit_report)

      # Something went wrong with the temp junit report for the test success/failures count.
      # We'll have to regenerate from the xcodebuild log, like we did before version 2.34.0.
      UI.message("Generating test results. This may take a while for large projects.")

      reporter_options_generator = XCPrettyReporterOptionsGenerator.new(false, [], [], "", false)
      reporter_options = reporter_options_generator.generate_reporter_options
      cmd = "cat #{@test_command_generator.xcodebuild_log_path.shellescape} | xcpretty #{reporter_options.join(' ')} &> /dev/null"
      system(cmd)
      File.read(Scan.cache[:temp_junit_report])
    end

    def copy_simulator_logs
      return unless Scan.config[:include_simulator_logs]

      UI.header("Collecting system logs")
      Scan.devices.each do |device|
        log_identity = "#{device.name}_#{device.os_type}_#{device.os_version}"
        FastlaneCore::Simulator.copy_logs(device, log_identity, Scan.config[:output_directory])
      end
    end

    def open_simulator_for_device(device)
      return unless FastlaneCore::Env.truthy?('FASTLANE_EXPLICIT_OPEN_SIMULATOR')

      UI.message("Killing all running simulators")
      `killall Simulator &> /dev/null`

      FastlaneCore::Simulator.launch(device)
    end
  end
end
