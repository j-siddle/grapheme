#!/usr/bin/env ruby

require("json");
require("set");

# Read the list of group IDs and names
group_array = []
File.open( "raw_groups.csv" ).each do |line|

	puts line

	fields = line.split(',')

	if fields.size != 2
		next
	end

	group_array << { :name => fields[0], :id => fields[1].strip }

end

# Read the list of nodes and their group assignments
node_groups = {}
File.open( "raw_nodes.csv" ).each do |line|

	fields = line.split(',')

	if fields.size != 2
		next
	end

	node_groups[fields[0]] = fields[1].strip

end


# Read the triples
raw_triples = []

File.open( "raw_facts.csv" ).each do |line|
	raw_triples << line
end

triples = []
nodes = Set.new
predicates = Set.new

raw_triples.each do |triple|

	fields = triple.split(',')

	if fields.size != 3
		next
	end
	
	subject = fields[0]
	predicate = fields[1]
	object = fields[2].strip

	triple = { :source => subject, :pred => predicate, :target => object.strip, :value => 2 }
	triples << triple

	nodes.add( { :name => subject, :group => node_groups[subject] } )
	nodes.add( { :name => object, :group => node_groups[object] } ) 

	predicates.add( { :name => predicate, :id => predicate } )
end

full_data = { :links => triples, :nodes => nodes.to_a, :predicates => predicates.to_a, :groups => group_array }

obj = JSON.dump(full_data);
puts obj
