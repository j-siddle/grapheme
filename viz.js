  var width = 960,
      height = 700;

  var color = d3.scale.category20();

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

  // User selections
  var active_groups = {};
  var active_predicates = {};
  var active_personas = {};

  // The selected data, displayed in the graph
  var curr_links = null;
  var curr_nodes = null;

  // Selections used for viz management
  var hover_edge_paths = null;
  var hover_edge_labels = null;


  function init() {

    d3.json("data/jimmy.json", function(error, json_data) {

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

      // Deduce list of groups, and create group buttons
      $("#options").append("<br>")

      $.each(json_data.groups, function(index, group) {

        button_id = "group_selector_" + group.id;

        $("#options").append(
          "<input type='checkbox' id='"+button_id+"' value='"+group.id+"'>"
          +group.name
          )
        $("#"+button_id).change( function() {

          sel_grp = $(this).val();
          $(this).is(':checked') ? active_groups[sel_grp] = true : delete active_groups[sel_grp] ;

          // Refresh graph data, then update the vizualization
          filterData(active_groups, active_personas, active_predicates);
          updateViz();

        });
      });

      // Make all predicates active, for now ... 
      $.each(json_data.predicates, function(index, predicate) {
        active_predicates[predicate.id] = true;
      }); 
      

      // Now initialize!
      filterData(active_groups, active_personas, active_predicates);
      updateViz();

    });

  }



  function filterData(sel_groups, sel_personas, sel_predicates) {

    // Initialize the graph. 
    curr_nodes = [];
    curr_links = [];

    $.each(all_nodes, function(index, node) {

      if (node.group == 1 && node.name in sel_personas) {
        curr_nodes.push(node); 
      }
      else if (node.group in sel_groups ) {
        curr_nodes.push(node); 
      } 

    });

    $.each(orig_graph.links, function(index, link) {

      nodes_allowed = 
        (link.source.group in sel_groups && link.target.group in sel_groups) ||
        (link.source.group in sel_groups && link.target.name in sel_personas) ||
        (link.source.name in sel_personas && link.target.group in sel_groups);

      if (nodes_allowed && link.pred in sel_predicates) {
        curr_links.push(link); 
      }

    });
  }



  function updateViz() {

    $('.node').remove();
    $('.link').remove();
    $('.shadow').remove();
    $('.label').remove();

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
        .style("stroke-width", function(d) { return Math.sqrt(d.value); });
    

    // Create circle elements, initialize via enter
    var circles = svg.selectAll(".circles")
        .data( curr_nodes );

    circles.enter()
        .append("circle")
        .attr("class", "node")
        .attr("id", function(d) { return d.name; } )
        .attr("r", 10)
        .style("fill", function(d) { return color(d.group); })
        .call(force.drag);


    var tooldiv = d3.select("body").append("div")   
        .attr("class", "tooltip")               
        .style("opacity", 0);

    $(".node").hover(

          function() {

              node_id = $(this).attr('id');

              hov_links = all_nodes[node_id].links

node_pos = $(this).position()
node_text = "<b>"+node_id + "</b> <p>Cupidatat irure consectetur, intelligentsia Brooklyn gluten-free farm-to-table bitters fanny pack non Terry Richardson locavore ethnic art party. You probably haven't heard of them Marfa hashtag gluten-free ennui. Art party shoreditch High Life, polaroid fashion axe ad helvetica. Occupy dolore High Life minim. Ethnic artisan Tonx 90's mlkshk lomo.</p>"

tooldiv.html( node_text )
.style("left", node_pos.left + "px")
.style("top", node_pos.top + "px");

tooldiv
.transition()        
.duration(100)      
.style("opacity", .9);  




              hover_edge_paths = svg.selectAll(".edgepath")
                    .data( hov_links )
                    .enter()
                    .append('path')
                    .attr({'d': function(d) {return 'M '+d.source.x+' '+d.source.y+' L '+ d.target.x +' '+d.target.y},
                           'class':'edgepath',
                           'fill-opacity':0,
                           'stroke-opacity':0,
                           'fill':'blue',
                           'stroke':'red',
                           'id':function(d,i) {return 'edgepath'+i}})
                    .style("pointer-events", "none");

              // Edge labels and paths - cut and paste coding from:
              // http://bl.ocks.org/jhb/5955887
              hover_edge_labels = svg.selectAll(".edgelabel")
                  .data( hov_links );

              hover_edge_labels.enter()
                  .append('text')
                  .style("pointer-events", "none")
                  .attr({'class':'edgelabel',
                         'id':function(d,i){return 'edgelabel'+i},
                         'dx':20,
                         'dy':0,
                         'font-size':10,
                         'fill':'#aaa'});

              hover_edge_labels.append('textPath')
                    .attr('xlink:href',function(d,i) {return '#edgepath'+i})
                    .style("pointer-events", "none")
                    .text(function(d,i){return d.pred});
          },

          function() { 

tooldiv
.transition()        
.duration(200)      
.style("opacity", .0); 

            $('.edgelabel').remove();
            $('.edgepath').remove();

            hover_edge_labels = null;
            hover_edge_paths = null;

          }
    );

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

      if (hover_edge_paths != null) {

        // Edge labels and paths - C&P from online sample
        hover_edge_paths.attr('d', function(d) { 
            var path='M '+d.source.x+' '+d.source.y+' L '+ d.target.x +' '+d.target.y;
            return path}); 

      }

      if (hover_edge_labels != null) {

        hover_edge_labels.attr('transform',function(d,i) {
            if (d.target.x<d.source.x){
              bbox = this.getBBox();
              rx = bbox.x+bbox.width/2;
              ry = bbox.y+bbox.height/2;
              return 'rotate(180 '+rx+' '+ry+')';
            }
            else {
              return 'rotate(0)';
            }
        });
      }

    });



  };

  function reset() {
    curr_nodes = d3.values(all_nodes);
    curr_links = orig_graph.links;
    updateViz( );
  }

  init();





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




PREDICATE SELECTORS - init()

  options").append("<br>")

  $.each(json_data.predicates, function(index, predicate) {

    active_predicates[predicate.id] = true;

    $("#options").append(
      "<input type='checkbox' checked id='"+predicate.id+"' value='"+predicate.id+"'>"
      +predicate.name
      )
    $("#"+predicate.id).change( function() {

      sel_pred = $(this).val();
      $(this).is(':checked') ? active_predicates[sel_pred] = true : delete active_predicates[sel_pred] ;

      // Refresh graph data, then update the vizualization
      filterData(active_groups, active_personas, active_predicates);
      updateViz();

    });
    
  });




*/




