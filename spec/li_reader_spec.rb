require_relative '../data/linkedin_reader'

describe LinkedInReader do

  blank_li_profile = '{ "skills": { "values": [] } }'

  it "should create a URI correctly" do

  	uri = LinkedInReader.new.make_uri("sometoken")

  	uri.to_s.should == 
		"https://api.linkedin.com/v1/people/~"+
		":(skills,courses,associations,publications,patents,interests,certifications,educations,three-current-positions,three-past-positions,num-recommenders,recommendations-received,member-url-resources)"+
		"?oauth2_access_token=sometoken&format=json"

  end

  it "should have correct group IDs" do
  	lir = LinkedInReader.new
  	lir.group_id["Persona"].should == 1
  	lir.group_id["Entity"].should == 2
  	lir.group_id["Class"].should == 3
  end

  it "should create correct triples from a LinkedIn skill" do

  	li_skills = [ 
  		{ 'skill' => { 'name' => "Pubic topiary"} },
  		{ 'skill' => { 'name' => "Tidying up"} } ] # Equivalent to parsed JSON

    lir = LinkedInReader.new
    lir.process_skills(li_skills)

    lir.triples.size.should == 4
    lir.triples[0].should == { :source => "Professional", :pred => "skilled_in", :target => "Pubic topiary", :value => 2 }
    lir.triples[1].should == { :source => "Pubic topiary", :pred => "is_a", :target => "Skill", :value => 2 }
    lir.triples[2].should == { :source => "Professional", :pred => "skilled_in", :target => "Tidying up", :value => 2 }
    lir.triples[3].should == { :source => "Tidying up", :pred => "is_a", :target => "Skill", :value => 2 }

  end

  it "should create full profile hash" do

	prof = LinkedInReader.new.process_li_profile( blank_li_profile )

	# Basic profile elements
	prof[:links].size.should == 1
	prof[:nodes].size.should == 3
	prof[:predicates].size.should == 2
	prof[:groups].size.should == 3

  end



end
