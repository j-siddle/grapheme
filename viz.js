  var width = 960,
      height = 700;

  var hover_trans_ms = 200;

  var force = d3.layout.force()
      .charge(-220)
      .linkDistance(60)
      .size([width, height]);

  var svg = d3.select("#viz").append("svg")
      .attr("width", width)
      .attr("height", height);

  // The complete data...
  var orig_graph = null;
  var all_nodes = {};
  var all_groups = {};
  var node_details = {};
  var views = {};

  // User selections
  var active_groups = {};
  var active_predicates = {};
  var active_personas = {};
  var singletons = true;
  var hide_options = true;

  // The selected data, displayed in the graph
  var curr_links = null;
  var curr_nodes = null;


  /* Prepare data model, create selection buttons and 
     behaviour, request initial filter */
  function init() {

    d3.json("data/profile.json", function(error, json_data) {

      // Store original graph data
      orig_graph = json_data;

      // Compute distinct nodes objects from the link source/target,
      // then update nodes and link objects to refer to each other
      orig_graph.links.forEach(function(link) {
        link.source = all_nodes[link.source] || (all_nodes[link.source] = {name: link.source, links: []});
        link.target = all_nodes[link.target] || (all_nodes[link.target] = {name: link.target, links: []});

        link.source.links.push(link);
        link.target.links.push(link);

      });

      // Copy additional attributes from input JSON into derived node object
      orig_graph.nodes.forEach(function(node) {
        all_nodes[node.name]["group"] = node["group"];
      });

      $("#options").append("<br>")

      // Deduce list of groups, and create group buttons (disabled initially)
      $.each(json_data.groups, function(index, group) {

        all_groups[group.id] = group;
        active_groups = {}

        button_id = "group_selector_" + group.id;

        $("#options").append(
          "<input class='group_selector' type='checkbox' id='"+button_id+"' value='"+group.id+"'>"
          +group.name
          )
        $("#"+button_id).change( function() {

          sel_grp = $(this).val();
          $(this).is(":checked") ? active_groups[sel_grp] = true : delete active_groups[sel_grp] ;

          refresh();
        });
      });


      // Provide predicate selectors (enable all initially)
      $("#options").append("<br><br>")

      $.each(json_data.predicates, function(index, predicate) {

        active_predicates[predicate.id] = true;

        $("#options").append(
          "<input class='predicate_selector' type='checkbox' checked id='"+predicate.id+"' value='"+predicate.id+"'>"
          +predicate.name)

        $("#"+predicate.id).change( function() {

          sel_pred = $(this).val();
          $(this).is(":checked") ? active_predicates[sel_pred] = true : delete active_predicates[sel_pred] ;

          refresh();
        });
        
      });

    });

    // Set initial state of singleton button, add click logic
    $("#singletonChoice")
      .prop("checked", singletons)
      .click( function() {
        // Update state according to checkboxes, etc
        singletons = $("#singletonChoice").is(":checked")

        refresh();       
      } );

    // Attach show/hide behaviour
    $("#optionToggle").click(function() {     

        toggler = $(this);
        options = $("#options");

        options.toggle("fade", {}, 400, function() {
          if ( $(options).is(":visible") ) {
            toggler.text("... less")
          } else {
            toggler.text("More ...")
          }
        });

    });

    // Read node details
    $.getJSON("data/node_details.json", function(data) {
      node_details = data;
    });

    // Read views, create view buttons and behaviour
    $.getJSON("data/views.json", function(data) {

      $.each(data, function(index, view) {

        views[view.id] = view;

        $("#views").append("<input type='button' id='"+view.id+"' value='"+view.name+"'>")

        $("#"+view.id).click( function() {

          active_groups = {}
          $.each(view.groups, function(index, group) {
            active_groups[group] = true
          });

          if (view.predicates) { 
            active_predicates = {}
            $.each(view.predicates, function(index, pred) {
              active_predicates[pred] = true
            });
          } else {
            $.each(orig_graph.predicates, function(index, predicate) {
              active_predicates[predicate.id] = true;
            });
          }

          singletons = (view.singletons == true);

          refresh();
          updateSelectors();
       });

      });

    });

  }


  // Re-filter data, then update the vizualization
  function refresh() {
    filterData(active_groups, active_personas, active_predicates);
    updateViz();
  }

  /* Given the selected groups, personas, and predicates,
     filter viz data to find current nodes and links */
  function filterData(sel_groups, sel_personas, sel_predicates) {

    // Clear lists of nodes and links
    curr_nodes = [];
    curr_links = [];

    // Define the links to include
    var connected_set = {}

    $.each(orig_graph.links, function(index, link) {

      nodes_allowed = 
        (link.source.group in sel_groups && link.target.group in sel_groups) ||
        (link.source.group in sel_groups && link.target.name in sel_personas) ||
        (link.source.name in sel_personas && link.target.group in sel_groups);

      if (nodes_allowed && link.pred in sel_predicates) {
        curr_links.push(link); 
        connected_set[link.source.name] = link.source;
        connected_set[link.target.name] = link.target;
      }

    });

    // Define nodes ... either according to selected groups / personas
    // or according to the connected set
    if (singletons) {

      $.each(all_nodes, function(index, node) {

        if (node.group == 1 && node.name in sel_personas) {
          curr_nodes.push(node); 
        }
        else if (node.group in sel_groups ) {
          curr_nodes.push(node); 
        } 

      });

    } else {

      for (var key in connected_set) {
        curr_nodes.push(connected_set[key]);
      }

    }

  }


  /* Create visualization elements, define hover behaviour,
     define force graph tick behaviour */
  function updateViz() {

    $(".node").remove();
    $(".link").remove();
    $(".label").remove();
    $(".shadow").remove();

    // Use the force
    force
        .nodes(curr_nodes)
        .links(curr_links)
        .start(); 

    // Create line selection from links, then initialize
    var lines = svg.selectAll(".lines")
        .data( curr_links );

    lines.enter()
        .append("line")
        .attr("class", "link")
    //    .style("stroke-width", function(d) { return Math.sqrt(d.value); }); // Why sqrt?
    

    // Create circle elements, initialize via enter
    var circles = svg.selectAll(".circles")
        .data( curr_nodes );

    circles.enter()
        .append("circle")
        .attr("class", "node")
        .attr("id", function(d) { return d.name; } )
        .attr("r", function(d) { return 5 + d.links.length; } )
        .style("fill", function(d) { return all_groups[d.group].color })
        .call(force.drag);

    circles.on("mouseover", function() { 
      selectNode(d3.select(this)) 
    });



    //var tooldiv = d3.select("#tooltip");

    // $(".node").mousemove(
    //
    //   function(e) {
    //
    //     node_id = $(this).attr('id');
    //     node_pos = $(this).position();
    //     node_summary = "Cupidatat irure consectetur, intelligentsia Brooklyn gluten-free farm-to-table bitters";
    //
    //     tool_text = "<b>"+node_id + "</b>" + "<p>" + node_summary + "</p>";
    //
    //     tooldiv.html( tool_text )
    //     .style("left", e.pageX + "px")
    //     .style("top", e.pageY + "px")
    //     .style("opacity", .9);  
    //   }
    // );



    // Create one SVG group per node element, for labels
    var labels = svg.append("svg:g").selectAll(".labels")
        .data( curr_nodes )
        .enter().append("svg:g");

    labels.append("svg:text")
        .attr("x", 8)
        .attr("y", ".31em")
        .attr("class", "shadow")
        .text(function(d) { return d.name; });

    labels.append("svg:text")
        .attr("x", 8)
        .attr("y", ".31em")
        .attr("class", "label")
        .text(function(d) { return d.name; });


    // Define how SVG elements react to force tick events
    force.on("tick", function() {

      lines.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      circles.attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; });

      labels.attr("transform", function(d) {
          return "translate(" + d.x + "," + d.y + ")";
      });

    });

  };


  var focus_circle = null;
  var focus_links = null;

  function selectNode(d3_node_sel) {


    // Reset previous hover highlights
    if (focus_circle != null) {          
      focus_circle.transition().duration(hover_trans_ms)
      .style("stroke-width", "0px");
    }
    if (focus_links != null) {
      focus_links.transition().duration(hover_trans_ms)
        .style("opacity", .6)
        .style("stroke", "#999")
        .style("stroke-width", "1px");
    }

    // Determine focus circle selection, node ID
    focus_circle = d3_node_sel;
    focus_node_id = focus_circle.attr("id");      

    // Determine focus links
    focus_links = d3.selectAll(".link").filter(
      function(d, i) { 
        return (d.source.name == focus_node_id || d.target.name == focus_node_id)  }
    )

    // Transition focus circle style
    focus_circle.transition().duration(hover_trans_ms)
      .style("stroke", "#000")
      .style("stroke-width", "2px");

    // Transition link style
    focus_links.transition().duration(hover_trans_ms)
      .style("opacity", 1)
      .style("stroke", "#000")
      .style("stroke-width", "2px");

    // Update description / link box
    node_description = node_details[focus_node_id] || "<p>Cupidatat irure consectetur, intelligentsia Brooklyn gluten-free farm-to-table bitters fanny pack non Terry Richardson locavore ethnic art party. You probably haven't heard of them Marfa hashtag gluten-free ennui. Art party shoreditch High Life, polaroid fashion axe ad helvetica. Occupy dolore High Life minim. Ethnic artisan Tonx 90's mlkshk lomo.</p>"
    node_link_text = ""

    node_links = all_nodes[focus_node_id].links
    $.each(node_links, function(index, link) {

      if (link.pred in active_predicates &&
          active_groups[link.source.group] && 
          active_groups[link.target.group]) {

        if (link.source.name == focus_node_id) {

        }

        node_link_text += 
          "<a class='" + (link.source.name == focus_node_id ? "node_name" : "node_link") + "' id='"+link.source.name+"'>" + link.source.name + "</a>" + 
          " "   + link.pred + " " + 
          "<a class='" + (link.target.name == focus_node_id ? "node_name" : "node_link") + "' id='"+link.target.name+"'>" + link.target.name + "</a><br>";
      }

    });

    var descdiv = d3.select("#description");
    descdiv.html( 
      "<h2>" + focus_node_id + "</h2>" + 
      "<p>" + node_description + "</p>" + 
      "<p>" + node_link_text + "</p>" );

    $("a.node_link").click( function(e) {

      node_sel = d3.select(".node[id='"+e.currentTarget.id+"']");
      selectNode(node_sel)

    });


  }

  function updateSelectors() {
    $("#singletonChoice").prop("checked", singletons);

    $(".predicate_selector").each( function(index) {
      $(this).prop("checked", active_predicates[$(this).val()] == true);
    });

    $(".group_selector").each( function(index) {
      $(this).prop("checked", active_groups[$(this).val()] == true);
    });


  }

  // Initialize, filter initial data set, then update the viz
  init();
  refresh();




/*

**************
CODE FRAGMENTS
**************


PERSONA SELECTORS - init()

  $("#options").append("<br>")
  
  numeric_node_index = 1;
  $.each(all_nodes, function(index, node) {

    if (node.group == 1) {

      button_id = "persona_selector_" + numeric_node_index;
      numeric_node_index ++;
      $("#options").append(
        "<input type='checkbox' class='persona_selector' id='"+button_id+"' value='"+node.name+"'>"
        +node.name );

      $("#"+button_id).change( function() {

        sel_persona = $(this).val();
        $(this).is(':checked') ? active_personas[sel_persona] = true : delete active_personas[sel_persona] ;

        // Refresh graph data, then update the vizualization
        filterData(active_groups, active_personas, active_predicates);
        updateViz();

      }); 
    }

  });



*/




