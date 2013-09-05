#!/usr/bin/env ruby

require 'net/https'
require 'uri'
require 'json'
require 'set'

# Define LinkedIn URI
li_access_token = ARGV[0]

uri_str = 
	"https://"+
	"api.linkedin.com/"+
	"v1/people/"+
	"~"+
	":(skills,courses,associations,publications,patents,interests,certifications,educations,three-current-positions,three-past-positions,num-recommenders,recommendations-received,member-url-resources)"+
	"?oauth2_access_token="+li_access_token+
	"&format=json"

uri = URI.parse( uri_str )

# Read the profile from LinkedIn
request = Net::HTTP::Get.new( uri.request_uri )

http = Net::HTTP.new( uri.host,uri.port )
http.use_ssl = true
http.verify_mode = OpenSSL::SSL::VERIFY_NONE

resp = http.request(request).body

# Parse and process the response
triples = []
nodes = Set.new
predicates = Set.new
group_array = []

# Define groups
group_array << { :name => "Persona", :id => "1", :color => "darkorange" }
group_array << { :name => "Entity", :id => "2", :color => "lightskyblue" }
group_array << { :name => "Class", :id => "3", :color => "purple" }

# Define personas, classes, predicates
nodes.add( { :name => "Persona", :group => 3 } )
nodes.add( { :name => "Skill", :group => 3 } )
nodes.add( { :name => "Professional", :group => 1 } )

triples << { :source => "Professional", :pred => "is_a", :target => "Persona", :value => 2 }

predicates.add ( { :name => "skilled_in", :id => "skilled_in" } )
predicates.add ( { :name => "is_a", :id => "is_a" } )

# Parse the JSON, extract facts
profile = JSON.parse(resp);
profile['skills']['values'].each do |skill|

	skill_name = skill['skill']['name']
	nodes.add( { :name => skill_name,  :group => 2 } )

	triples << { :source => "Professional", :pred => "skilled_in", :target => skill_name, :value => 2 }
	triples << { :source => skill_name, :pred => "is_a", :target => "Skill", :value => 2 }

end

# Output the JSON
full_data = { :links => triples, :nodes => nodes.to_a, :predicates => predicates.to_a, :groups => group_array }

obj = JSON.dump(full_data);
puts obj
