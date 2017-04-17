'use strict';
(function () {
		function d3CheckBox () {//taken from https://bl.ocks.org/Lulkafe/c77a36d5efb603e788b03eb749a4a714 and modified

		var size = 20,
		    x = 0,
		    y = 0,
		    rx = 0,
		    ry = 0,
		    markStrokeWidth = 1,
		    boxStrokeWidth = 1,
		    checked = false,
		    clickEvent;

		function checkBox (selection) {

		    var g = selection.append("g"),
		        box = g.append("rect")
		        .attr("width", size)
		        .attr("height", size)
		        .attr("x", x)
		        .attr("y", y)
		        .attr("rx", rx)
		        .attr("ry", ry)
		        .style({
		            "fill-opacity": 0,
		            "stroke-width": boxStrokeWidth,
		            "stroke": "black"
		        });
				g.append("text").attr("x", "730px").attr("y", 75)
				.text(function(d) { return "Frozen"; });

		    //Data to represent the check mark
		    var coordinates = [
		        {x: x + (size / 8), y: y + (size / 3)},
		        {x: x + (size / 2.2), y: (y + size) - (size / 4)},
		        {x: (x + size) - (size / 8), y: (y + (size / 10))}
		    ];

		    var line = d3.svg.line()
		            .x(function(d){ return d.x; })
		            .y(function(d){ return d.y; })
		            .interpolate("basic");

		    var mark = g.append("path")
		        .attr("d", line(coordinates))
		        .style({
		            "stroke-width" : markStrokeWidth,
		            "stroke" : "black",
		            "fill" : "none",
		            "opacity": (checked)? 1 : 0
		        });

		    g.on("click", function () {
		        checked = !checked;
		        mark.style("opacity", (checked)? 1 : 0);

		        if(clickEvent)
		            clickEvent();

		        d3.event.stopPropagation();
		    });

		}

		checkBox.size = function (val) {
		    size = val;
		    return checkBox;
		}

		checkBox.x = function (val) {
		    x = val;
		    return checkBox;
		}

		checkBox.y = function (val) {
		    y = val;
		    return checkBox;
		}

		checkBox.rx = function (val) {
		    rx = val;
		    return checkBox;
		}

		checkBox.ry = function (val) {
		    ry = val;
		    return checkBox;
		}

		checkBox.markStrokeWidth = function (val) {
		    markStrokeWidth = val;
		    return checkBox;
		}

		checkBox.boxStrokeWidth = function (val) {
		    boxStrokeWidth = val;
		    return checkBox;
		}

		checkBox.checked = function (val) {

		    if(val === undefined) {
		        return checked;
		    } else {
		        checked = val;
		        return checkBox;
		    }
		}

		checkBox.clickEvent = function (val) {
		    clickEvent = val;
		    return checkBox;
		}

		return checkBox;
	}

    function DataFetcher(urlFactory, delay) {
        var self = this;

        self.repeat = false;
        self.delay = delay;
        self.timer = null;
        self.requestObj = null;

        function getNext() {
            self.requestObj = $.ajax({
                    url: urlFactory()
                }).done(function(response) {
                    $(self).trigger("stateFetchingSuccess", {
                        result: response
                    });
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    $(self).trigger("stateFetchingFailure", {
                        error: textStatus
                    });
                }).always(function() {
                    if (self.repeat && _.isNumber(self.delay)) {
                        self.timer = setTimeout(getNext, self.delay);
                    }
                });
        }

        self.start = function(shouldRepeat) {
            self.repeat = shouldRepeat;
            getNext();
        };

        self.stop = function() {
            self.repeat = false;
            clearTimeout(self.timer);
        };

        self.repeatOnce = function() {
            getNext();
        };

        self.setDelay = function(newDelay) {
            this.delay = newDelay;
        };
    }

    function addNewEntry($container, contentHTML) {
        var $innerSpan = $("<p/>").text(contentHTML),
            $newEntry = $("<li/>").append($innerSpan);

        $container.append($newEntry);
    }

    var $trafficStatusList = $("#mockTrafficStat"),
        df2 = new DataFetcher(function() {
            return "/traffic_status";
        }),
		df1 = new DataFetcher(function() {
            return "/traffic_status/frozen";
        });

	function Graph(){
		this.parse = function(data){
			var nodes = {};
			var thisgraph = this;
			thisgraph.trafficedges = [];
			thisgraph.packetedges = [];
			var types = new Set();
			data.forEach(function(element){
				nodes[element.srcObj] = element.srcType;
				nodes[element.destObj] = element.destType;
				thisgraph.trafficedges.push({"source": element.srcObj,
								"target": element.destObj,
								"value": element.traffic});
				thisgraph.packetedges.push({"source": element.srcObj,
								"target": element.destObj,
								"value": element.packets});
				types.add(element.srcType);
				types.add(element.destType);
			});
			var len = Object.keys(nodes).length;
			var typemap = {}, i = 1;
			for (let elem of types){
				typemap[elem] = len+i;
				i++;
			}
			this.nodes = [];
			for(var id in nodes){
				if (nodes.hasOwnProperty(id)) {
					this.nodes.push({"type" : nodes[id], "id" : id, "parent" : typemap[nodes[id]], "name" : id});
				}
			}
			for(var type in typemap){
				if (typemap.hasOwnProperty(type)) {
					this.nodes.push({"type" : type, "id" : typemap[type], "parent" : null, "name" : type});
				}
			}
			this.types = Array.from(types);
		};
	};

	var graph2;
	var res = initialize();

	function clearchart(){
		document.getElementById("links").innerHTML = "";
		document.getElementById("nodes").innerHTML = "";
		document.getElementById("collapsers").innerHTML = "";
	};

	function create_biHiSankey(){
					var biHiSankey = d3.biHiSankey();
			// Set the biHiSankey diagram properties
			biHiSankey
			  .nodeWidth(NODE_WIDTH)
			  .nodeSpacing(10)
			  .linkSpacing(4)
			  .arrowheadScaleFactor(0.5) // Specifies that 0.5 of the link's stroke WIDTH should be allowed for the marker at the end of the link.
			  .size([WIDTH, HEIGHT]);
		return biHiSankey;
	};

	var frozen = false;
	function toggle(){
		var svg = d3.select("svg g");
		var demoSwitch = {
		gtX: 350,
		gtY: 8,
		id: "deomswitch",
		swpos: "left",
		leftTxt: "Traffic",
		rightTxt: "Packet",
		label: "Choose Traffic or Packet visualization"
		},
		switchElement = sP.swtch.newSwtch(demoSwitch, {oW:1,aR:1,oH:1,nW:2,nH:1}); // not passing anything in for pym will default to 1.
		sP.swtch.renderSwtch(svg, switchElement);

		var switchListener = svg.select("#" + demoSwitch.id)
			.on("click", function() {
				sP.swtch.toggleSwitch(svg,demoSwitch, {oW:1,aR:1,oH:1,nW:2,nH:1}) // again not passing any pym info in will default to 1.
				if(d3.select(this).attr("swpos") == "left")
					d3.select(this).attr("swpos", "right");
				else
					d3.select(this).attr("swpos", "left");
				clearchart();
				var biHiSankey = create_biHiSankey();
				var tempgraph = jQuery.extend(true, {}, graph2);
				var colorScale = d3.scale.ordinal().domain(tempgraph.types).range(TYPE_COLORS);
 				var highlightColorScale = d3.scale.ordinal().domain(tempgraph.types).range(TYPE_HIGHLIGHT_COLORS);

				if(demoSwitch.swpos == "right"){
					biHiSankey
					  .nodes(tempgraph.nodes)
					  .links(tempgraph.packetedges)
					  .initializeNodes(function (node) {
							node.state = node.parent ? "contained" : "collapsed";
					  })
					  .layout(LAYOUT_INTERATIONS);
					disableUserInterractions(2 * TRANSITION_DURATION);
					update(biHiSankey, res["svg"], res["tooltip"], colorScale, highlightColorScale, "packets");
				} else {
					biHiSankey
					  .nodes(tempgraph.nodes)
					  .links(tempgraph.trafficedges)
					  .initializeNodes(function (node) {
							node.state = node.parent ? "contained" : "collapsed";
					  })
					  .layout(LAYOUT_INTERATIONS);
					disableUserInterractions(2 * TRANSITION_DURATION);
					update(biHiSankey, res["svg"], res["tooltip"], colorScale, highlightColorScale, "Mb/s");
				}
			});

		var checkBox = new d3CheckBox();

		checkBox.x(700).y(60).checked(false)
			.clickEvent(function(){
				frozen = !frozen;
			});
		res["svg"].call(checkBox);
		var button = res["svg"].append("g").attr("transform", function(d, i) { return "translate(790,60)"; });
		button.append("rect").attr("x", 0).attr("y", 0).attr("width", 70).attr("height", 30).attr("fill", "rgba(59, 176, 132, 0.498039)").style("stroke", "rgb(35, 35, 35)").style("stroke-width", 1).attr("ry", 6);
		button.append("text").attr("x", 35).attr("y", 18).attr("text-anchor", "middle").text("Reload");
		button.on({
			      "mouseover": function(d) {
				        d3.select(this).style("cursor", "pointer")
			      },
			      "mouseout": function(d) {
				        d3.select(this).style("cursor", "default")
			      },
				"click": function(){
					if(frozen){
						console.log("frozen");
						df1.start();
					}
					else{
						console.log("Not frozen");
					    df2.start();
					}
				}
			});
	};
	toggle();

	function stateFetchingSuccess(event, data){
			d3.select("#error").remove();
			var graph = new Graph();
			graph.parse(data.result.data);
			graph2 = jQuery.extend(true, {}, graph);
			clearchart();
				var biHiSankey = create_biHiSankey();

				if(res["svg"].select("#deomswitch").attr("swpos") == "left"){
					biHiSankey
					  .nodes(graph.nodes)
					  .links(graph.trafficedges)
					  .initializeNodes(function (node) {
							node.state = node.parent ? "contained" : "collapsed";
					  })
					  .layout(LAYOUT_INTERATIONS);
					console.log("traffic");
				}else{
					biHiSankey
					  .nodes(graph.nodes)
					  .links(graph.packetedges)
					  .initializeNodes(function (node) {
							node.state = node.parent ? "contained" : "collapsed";
					  })
					  .layout(LAYOUT_INTERATIONS);
					console.log("packet");
				}
				disableUserInterractions(2 * TRANSITION_DURATION);
				var colorScale = d3.scale.ordinal().domain(graph.types).range(TYPE_COLORS);
 				var highlightColorScale = d3.scale.ordinal().domain(graph.types).range(TYPE_HIGHLIGHT_COLORS);
				update(biHiSankey, res["svg"], res["tooltip"], colorScale, highlightColorScale, res["svg"].select("#deomswitch").attr("swpos") == "left" ? "Mb/s" : "packets");
	}

	function stateFetchingFailure(event, data){
			clearchart();
			if(d3.select("#error").empty()){
				res["svg"].append("text")
					.attr("x", 50)
					.attr("y", 10)
					.attr("id", "error")
					.attr("dy", ".35em")
					.text(function(d) { return "Hit a snag. Retry after 1 sec..."; });
			}
			console.log("failure");
            //addNewEntry($trafficStatusList, JSON.stringify(data.error));
            //addNewEntry($trafficStatusList, "Hit a snag. Retry after 1 sec...");
            setTimeout(function() {
                $trafficStatusList.html("");
				if(frozen){
	                df1.repeatOnce();
					console.log("frozen");
				}
				else{
	                df2.repeatOnce();
					console.log("Not frozen");
				}
            }, 1000);
	}

    $(df2).on({
        "stateFetchingSuccess": stateFetchingSuccess,
        "stateFetchingFailure": stateFetchingFailure
    });

    $(df1).on({
        "stateFetchingSuccess": stateFetchingSuccess,
        "stateFetchingFailure": stateFetchingFailure
    });

	if(frozen){
		df1.start();
		console.log("frozen");
	}
	else{
		df2.start();
		console.log("Not frozen");
	}
})();
