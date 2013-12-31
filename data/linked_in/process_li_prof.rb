#!/usr/bin/env ruby

require_relative 'linkedin_reader'

# ARGV[0] - access token

li_reader = LinkedInReader.new
li_prof_json = li_reader.read_profile(ARGV[0])
li_prof = JSON.parse(li_prof_json)

processed_prof = li_reader.process_li_profile(li_prof)
final_json = JSON.dump(processed_prof);

puts final_json