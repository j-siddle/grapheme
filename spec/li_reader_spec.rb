require_relative '../data/linkedin_reader'

describe LinkedInReader do

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

  it "should create correct triples for studies" do

    li_educations = [
      {
        'degree' => 'Master of Science (MSc)',
        'fieldOfStudy' => 'Software Engineering',
        'schoolName' => 'University of Oxford',
      },
      {
        'degree' => 'BSc, 1st class',
        'fieldOfStudy' => 'Computing',
        'schoolName' => 'Loughborough University',
      }
    ]

    lir = LinkedInReader.new
    lir.process_educations(li_educations)

    lir.triples.size.should == 10

    lir.triples[0].should == { :source => "Student", :pred => "attended", :target => "University of Oxford", :value => 2 }
    lir.triples[1].should == { :source => "Student", :pred => "awarded", :target => "Master of Science (MSc) - Software Engineering", :value => 2 }
    lir.triples[2].should == { :source => "University of Oxford", :pred => "taught", :target => "Master of Science (MSc) - Software Engineering", :value => 2 }    
    lir.triples[3].should == { :source => "University of Oxford", :pred => "is_a", :target => "School", :value => 2 }    
    lir.triples[4].should == { :source => "Master of Science (MSc) - Software Engineering", :pred => "is_a", :target => "Qualification", :value => 2 }    

    lir.triples[5].should == { :source => "Student", :pred => "attended", :target => "Loughborough University", :value => 2 }
    lir.triples[6].should == { :source => "Student", :pred => "awarded", :target => "BSc, 1st class - Computing", :value => 2 }
    lir.triples[7].should == { :source => "Loughborough University", :pred => "taught", :target => "BSc, 1st class - Computing", :value => 2 }    
    lir.triples[8].should == { :source => "Loughborough University", :pred => "is_a", :target => "School", :value => 2 }
    lir.triples[9].should == { :source => "BSc, 1st class - Computing", :pred => "is_a", :target => "Qualification", :value => 2 }    

  end


  li_profile = 
    {
     'skills' => { 'values' => 
        [ 
          { 'skill' => { 'name' => "Pubic topiary"} } 
        ] 
      },
     'educations' => { 'values' => 
        [ 
          {
          'degree' => 'Master of Science (MSc)',
          'fieldOfStudy' => 'Software Engineering',
          'schoolName' => 'University of Oxford'
          }
        ] 
      },
     'patents' => { 'values' => [] }
    }


  it "should create full hash from decoded LinkedIn profile" do

  	prof = LinkedInReader.new.process_li_profile( li_profile )

    prof[:groups].size.should == 3
    prof[:predicates].size.should == 4
    prof[:nodes].size.should == 10
    prof[:links].size.should == 10

    # All groups are included by default
    prof[:groups][0].should == { :name => "Persona", :id => '1', :color => "darkorange" }
    prof[:groups][1].should == { :name => "Entity", :id => '2', :color => "lightskyblue" }
    prof[:groups][2].should == { :name => "Class", :id => '3', :color => "purple" }

    # All predicates are included by default
    prof[:predicates][0].should == { :name => "skilled_in", :id => "skilled_in" }
    prof[:predicates][1].should == { :name => "is_a", :id => "is_a" }
    prof[:predicates][2].should == { :name => "invented", :id => "invented" }
    prof[:predicates][3].should == { :name => "attended", :id => "attended" }
    prof[:predicates][4].should == { :name => "awarded", :id => "awarded" }
    prof[:predicates][5].should == { :name => "taught", :id => "taught" }

    # Standard nodes ...
    prof[:nodes][0].should == { :name => "Persona", :group => 3 }
    prof[:nodes][1].should == { :name => "Skill", :group => 3 }
    prof[:nodes][2].should == { :name => "Patent", :group => 3 }
    prof[:nodes][3].should == { :name => "Qualification", :group => 3 }
    prof[:nodes][4].should == { :name => "Professional", :group => 1 }
    prof[:nodes][5].should == { :name => "Inventor", :group => 1 }
    prof[:nodes][6].should == { :name => "Student", :group => 1 }
    # # + sample of profile specific nodes
    # prof[:nodes][7].should == { :name => "Pubic topiary", :group => 2 }
    # prof[:nodes][8].should == { :name => "University of Oxford", :group => 2 }


    # Standard links ...
    prof[:links][0].should == { :source => "Professional", :pred => "is_a", :target => "Persona", :value => 2 }
    prof[:links][1].should == { :source => "Inventor", :pred => "is_a", :target => "Persona", :value => 2 }
    prof[:links][2].should == { :source => "Student", :pred => "is_a", :target => "Persona", :value => 2 }
    # # + sample of profile specific links
    # prof[:links][3].should == { :source => "Professional", :pred => "skilled_in", :target => "Pubic topiary", :value => 2 }
    # prof[:links][4].should == { :source => "Pubic topiary", :pred => "is_a", :target => "Skill", :value => 2 }
    # prof[:links][5].should == { :source => "Student", :pred => "attended", :target => "University of Oxford", :value => 2 }
    # prof[:links][6].should == { :source => "University of Oxford", :pred => "is_a", :target => "School", :value => 2 }


  end

  # Test that each type of LI field is processed

end
