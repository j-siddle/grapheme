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

	# Todo - add unit tests
	def read_profile(li_access_token)

		uri = make_uri(li_access_token)

		# Read the profile from LinkedIn
		request = Net::HTTP::Get.new( uri.request_uri )

		http = Net::HTTP.new( uri.host,uri.port )
		http.use_ssl = true
		http.verify_mode = OpenSSL::SSL::VERIFY_NONE

		http.request(request).body
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

	def process_li_profile(profile)

		# Define display groups
		@group_array << { :name => "Persona", :id => group_id["Persona"].to_s, :color => "darkorange" }
		@group_array << { :name => "Entity", :id => group_id["Entity"].to_s, :color => "lightskyblue" }
		@group_array << { :name => "Class", :id => group_id["Class"].to_s, :color => "purple" }

		# Define class nodes
		@nodes.add( { :name => "Persona", :group => group_id["Class"] } )
		@nodes.add( { :name => "Skill", :group => group_id["Class"] } )
		@nodes.add( { :name => "Patent", :group => group_id["Class"] } )
		@nodes.add( { :name => "Qualification", :group => group_id["Class"] } )

		@nodes.add( { :name => "Professional", :group => group_id["Persona"] } )
		@nodes.add( { :name => "Inventor", :group => group_id["Persona"] } )
		@nodes.add( { :name => "Student", :group => group_id["Persona"] } )

		# Define persona-class relations
		@triples << { :source => "Professional", :pred => "is_a", :target => "Persona", :value => 2 }
		@triples << { :source => "Inventor", :pred => "is_a", :target => "Persona", :value => 2 }
		@triples << { :source => "Student", :pred => "is_a", :target => "Persona", :value => 2 }

		@predicates.add ( { :name => "skilled_in", :id => "skilled_in" } )
		@predicates.add ( { :name => "is_a", :id => "is_a" } )
		@predicates.add ( { :name => "invented", :id => "invented" } )
		@predicates.add ( { :name => "attended", :id => "attended" } )
		@predicates.add ( { :name => "awarded", :id => "awarded" } )
		@predicates.add ( { :name => "taught", :id => "taught" } )

		# Parse the JSON, extract facts
		process_skills( profile['skills']['values'] )
		process_educations( profile['educations']['values'] )
		process_patents( profile['patents']['values'] )

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

	def process_educations(li_educations)

		li_educations.each do |educ|

			uni_name = educ['schoolName']
			subject = educ['fieldOfStudy']
			degree = educ['degree']

			award = "#{degree} - #{subject}"

			@nodes.add( { :name => uni_name,  :group => group_id['Entity'] } )
			@nodes.add( { :name => award, :group => group_id['Entity'] } )

			@triples << { :source => "Student", :pred => "attended", :target => uni_name, :value => 2 }
			@triples << { :source => "Student", :pred => "awarded", :target => award, :value => 2 }
			@triples << { :source => uni_name, :pred => "taught", :target => award, :value => 2 }

			@triples << { :source => uni_name, :pred => "is_a", :target => "School", :value => 2 }
			@triples << { :source => award, :pred => "is_a", :target => "Qualification", :value => 2 }

		end

	end

	# Todo - add unit tests
	def process_patents(li_patents)

		li_patents.each do |patent|

			patent_title = patent['title']
			@nodes.add( { :name => patent_title,  :group => group_id['Entity'] } )
			@triples << { :source => "Inventor", :pred => "invented", :target => patent_title, :value => 2 }
			@triples << { :source => patent_title, :pred => "is_a", :target => "Patent", :value => 2 }

		end

	end


end

