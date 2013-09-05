#!/usr/bin/env ruby

require 'net/https'
require 'uri'
require 'json'
require 'set'

class LinkedInReader

	attr_reader :group_id
	attr_reader :nodes
	attr_reader :triples

	# Parse and process the response
	def initialize
		@group_id = {
			"Persona" => 1,
			"Entity" => 2,
			"Class" => 3
		}
		@group_array = []
		@triples = []
		@nodes = Set.new
		@predicates = Set.new
	end

	def read_profile(li_access_token)

		uri = make_uri(li_access_token)

		# Read the profile from LinkedIn
		request = Net::HTTP::Get.new( uri.request_uri )

		http = Net::HTTP.new( uri.host,uri.port )
		http.use_ssl = true
		http.verify_mode = OpenSSL::SSL::VERIFY_NONE

		resp = http.request(request).body

		full_data = process_li_profile(resp)

		JSON.dump(full_data);

	end

	def make_uri(access_token) 

		# Define LinkedIn URI
		uri_str = 
			"https://"+
			"api.linkedin.com/"+
			"v1/people/"+
			"~"+
			":(skills,courses,associations,publications,patents,interests,certifications,educations,three-current-positions,three-past-positions,num-recommenders,recommendations-received,member-url-resources)"+
			"?oauth2_access_token="+access_token+
			"&format=json"

		URI.parse( uri_str )

	end

	def process_li_profile(li_json_profile)

		# Define groups
		@group_array << { :name => "Persona", :id => group_id["Persona"].to_s, :color => "darkorange" }
		@group_array << { :name => "Entity", :id => group_id["Entity"].to_s, :color => "lightskyblue" }
		@group_array << { :name => "Class", :id => group_id["Class"].to_s, :color => "purple" }

		# Define personas, classes, predicates
		@nodes.add( { :name => "Persona", :group => group_id["Class"] } )
		@nodes.add( { :name => "Skill", :group => group_id["Class"] } )
		@nodes.add( { :name => "Professional", :group => group_id["Persona"] } )

		@triples << { :source => "Professional", :pred => "is_a", :target => "Persona", :value => 2 }

		@predicates.add ( { :name => "skilled_in", :id => "skilled_in" } )
		@predicates.add ( { :name => "is_a", :id => "is_a" } )

		# Parse the JSON, extract facts
		profile = JSON.parse(li_json_profile);
		process_skills( profile['skills']['values'] )

		# Return the processed profile
		{ :links => @triples, :nodes => @nodes.to_a, :predicates => @predicates.to_a, :groups => @group_array }

	end

	def process_skills(li_skills)

		li_skills.each do |skill|

			skill_name = skill['skill']['name']
			@nodes.add( { :name => skill_name,  :group => group_id['Entity'] } )
			@triples << { :source => "Professional", :pred => "skilled_in", :target => skill_name, :value => 2 }
			@triples << { :source => skill_name, :pred => "is_a", :target => "Skill", :value => 2 }

		end

	end

end

