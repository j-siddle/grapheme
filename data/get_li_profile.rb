#!/usr/bin/env ruby

require_relative 'linkedin_reader'

puts "Enter LinkedIn access token: "
li_access_token = gets.chomp

json_prof = LinkedInReader.new.read_profile(li_access_token)
puts json_prof


