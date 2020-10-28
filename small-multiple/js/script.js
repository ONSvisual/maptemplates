var pymChild = null;

// onload check to see if the web browser can handle 'inline svg'
if (Modernizr.svg == true) {
	d3.select("#")

  d3.queue()
    .defer(d3.json, "data/geog.json")
    .defer(d3.csv, "data/data.csv")
    .await(ready);

} // else leave fallback
else {
  //use pym to create iframe containing fallback image (which is set as default)
  pymChild = new pym.Child();
  if (pymChild) {
    pymChild.sendHeight();
  }
} // end else ...

function ready(error, geog, data) {

  pymChild.sendHeight();
}

// var height;
// var dvc = {}; // global object variable to contain all variables prefixed with 'dvc.'
// var headers = [];
// var mapScale;
//
// dvc.data;
//
// var numFormat = d3.format(".1f");
//
//
// listnames = [];
//
// function setupdropdown() {
//
//   d3.select("#chosensel").selectAll("*").remove();
//   variables = [];
//
//   for (var column in dvc.data[0]) {
//     if (column == 'AREACD') continue;
//     if (column == 'AREANM') continue;
//     variables.push(column);
//   }
//
//   // var optns = d3.select("#chosensel");
//   //
//   // optns.append("option")
//   //     .attr("value","first")
//   //     .text("");
//   //
//   // optns.selectAll("p").data(variables).enter().append("option")
//   //     .attr("value", function(d,i){ return i})
//   //     .text(function(d){ return d});
//
//   console.log(variables)
//
//   var optns = d3.select("#chosensel").append("div").attr("id", "sel").append("select")
//     .attr("id", "selectmenu")
//     .attr("style", "width:98%")
//     .attr("multiple", true)
//     .attr("class", "chosen-select");
//
//   optns.append("option")
//     .attr("value", "first")
//     .text("");
//
//   optns.selectAll("p").data(variables).enter().append("option")
//     .attr("value", function(d, i) {
//       return i
//     })
//     .text(function(d) {
//       return d
//     });
//
//
//   $('#selectmenu').chosen({
//     width: "98%",
//     max_selected_options: 6,
//     placeholder_text_multiple: "Type some names, or choose an option.",
//     /*, allow_single_deselect:true*/
//   }).on('change', function(evt, params) {
//
//     if (typeof params.selected != 'undefined') {
//       var allselections = $(this).val();
//       console.log(params)
//       var lastselection = params.selected;
//
//
//       var svgSel = d3.select("#svg" + lastselection)
//       var parentDiv = d3.select("#svg" + lastselection).select(function() {
//         return this.parentNode;
//       })
//
//       if ($(".container-fluid").width() < 600) {
//         parentDiv.classed("col-xs-10", true)
//       } else if ($(".container-fluid").width() < 750) {
//         parentDiv.classed("col-sm-4", true)
//       } else if ($(".container-fluid").width() < 945) {
//         parentDiv.classed("col-md-3", true)
//       }
//
//       drawGraphic2(lastselection);
//       svgSel.classed("hide", false);
//       d3.select(".zoom-container").classed("hide", false)
//       listnames.push(lastselection);
//
//       console.log(listnames)
//
//       d3.selectAll(".search-choice-close").attr("aria-label", function(d, i) {
//         return "close selection - " + variables[listnames[i]]
//       })
//
//       if (pymChild) {
//         setTimeout(function() {
//           pymChild.sendHeight();
//         }, 300);
//       }
//
//     } else {
//
//       var deselection = params.deselected;
//
//       var parentDiv = d3.select("#svg" + deselection).select(function() {
//         return this.parentNode;
//       })
//       d3.select("#svg" + deselection).classed("hide", true);
//
//       if ($(".container-fluid").width() < 600) {
//         parentDiv.classed("col-xs-10", false)
//       } else if ($(".container-fluid").width() < 750) {
//         parentDiv.classed("col-sm-4", false)
//       } else if ($(".container-fluid").width() < 945) {
//         parentDiv.classed("col-md-3", false)
//       }
//
//
//       var index = listnames.indexOf(deselection);
//       listnames.splice(index, 1);
//
//       if (listnames.length < 1) {
//         d3.select(".zoom-container").classed("hide", true)
//       }
//
//     }
//     //
//
//     //
//     // drawGraphic2(lastselection);
//     // svgSel.classed("hide", false);
//     // d3.select(".zoom-container").classed("hide", false)
//     // listnames.push(lastselection);
//     //
//     // window.location.hash = listnames;
//
//
//     // } else {
//     //
//     //
//     //
//     // 	var allselections = $(this).val();
//     // 	var lastselection =e.params.data.id
//     //
//     //
//     // 	var svgSel = d3.select("#svg"+lastselection)
//     // 	svgSel.classed("hide",true);
//     // 	if(allselections ==null){
//     // 		d3.select(".zoom-container").classed("hide", true)
//     // 	}
//     //
//     // 	var parentDiv = d3.select("#svg"+lastselection).select(function() { return this.parentNode; })
//     //
//     // 	if($(".container-fluid").width()<600){
//     // 		parentDiv.classed("col-xs-10", false)
//     // 	} else if($(".container-fluid").width()<750){
//     // 		parentDiv.classed("col-sm-4", false)
//     // 	} else if($(".container-fluid").width()<945){
//     // 		parentDiv.classed("col-md-3", false)
//     // 	}
//     //
//     // 	var index = listnames.indexOf(lastselection);
//     //
//     //
//     //
//     //
//     // 	if (index > -1) {
//     // 			listnames.splice(index, 1);
//     //
//     // 	}
//     //
//     // 	window.location.hash = listnames;
//     //
//     //
//     //
//     //}
//   })
//
//
//   d3.select('.container-fluid').selectAll("*").attr('aria-hidden', 'true')
//
// }
//
//
// function createStructure() {
//
//   setupdropdown();
//
//   d3.select("#new").selectAll("*").remove();
//
//   d3.select("#new").selectAll("div")
//     .data(headers)
//     .enter()
//     .append("div")
//     .attr("class", "graphic col-xs-10 col-sm-4 col-md-3")
//
//   var threshold_md = 750;
//   var threshold_sm = 600;
//
//   if ($(".container-fluid").width() < 600) {
//     var mapScale = 3500;
//   } else {
//     var mapScale = 2300;
//   }
//
//   margin = {
//     top: +dvc.essential.margins[0],
//     right: +dvc.essential.margins[1],
//     bottom: +dvc.essential.margins[2],
//     left: +dvc.essential.margins[3]
//   };
//   chart_width = parseInt(d3.select('.graphic').style("width")) - margin.left - margin.right;
//
//   //				if ($(".container-fluid").width()< threshold_sm) {
//   //					height = (Math.ceil((chart_width * dvc.essential.aspectRatio[0][1]) / dvc.essential.aspectRatio[0][0]) - margin.top - margin.bottom);
//   //				} else if ($(".container-fluid").width()< threshold_md){
//   //					height = (Math.ceil((chart_width * dvc.essential.aspectRatio[1][1]) / dvc.essential.aspectRatio[1][0]) - margin.top - margin.bottom);
//   //				} else {
//   height = (Math.ceil((chart_width * dvc.essential.aspectRatio[1]) / dvc.essential.aspectRatio[0]) - margin.top - margin.bottom);
//   //				}
//
//
//   d3.selectAll(".graphic").append("svg")
//     .attr("id", function(d, i) {
//       return "svg" + i
//     })
//     .attr("class", "hide graphUnitSVGs")
//   //		.append("g")
//   //		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
//
//   d3.selectAll(".graphic").classed("col-xs-10", false);
//   d3.selectAll(".graphic").classed("col-sm-4", false);
//   d3.selectAll(".graphic").classed("col-md-3", false);
//
//
//
//
//   zoom = d3.behavior.zoom()
//     .scaleExtent([0.1, 12])
//     .on("zoom", zoomed);
//
//   projection = d3.geo.albers()
//     .center([0.4, 54.2])
//     .rotate([3.2, 1])
//     .parallels([50, 60])
//     .scale(mapScale)
//     .translate([chart_width / 2, height / 2]);
//
//
//   // Set up a scaling variable effectively tells D3 how to interpret your lat - long coordinates into pixel positions.
//   path = d3.geo.path().projection(projection);
//
//   // clear out existing graphics
//   //				graphic.empty();
//   //				keypoints.empty();
//   //				footer.empty();
//
//   d3.select("#footer").append("p").text("LQ > 1.0 indicates a relative concentration of the industry in the geographic area");
//   //d3.selectAll(".graphUnitSVGs").remove();
//   checkUrl()
// } //end createStructure()
//
//
// function drawGraphic2(params) {
//
//   rateById = {};
//   dvc.data.forEach(function(d, i) {
//     rateById[d.AREACD] = [d[headers[params]]];
//   });
//
//   var values = dvc.data.map(function(d) {
//     return +d[headers[params]];
//   }).filter(function(d) {
//     return !isNaN(d)
//   }).sort(d3.ascending);
//   //console.log(values)
//
//   if (dvc.essential.breaksAll == "jenks") {
//     breaks = ss.jenks(values, dvc.essential.breakDivisions);
//     var fmt = d3.format(".1f")
//     breaks[breaks.length - 1] = fmt((breaks[breaks.length - 1]) + 0.1)
//   } else {
//     breaks = dvc.essential.breaksAll;
//   }
//
//
//   color = d3.scale.threshold()
//     .domain(breaks)
//     .range(dvc.essential.colour);
//
//   d3.select("#svg" + params).selectAll("*").remove();
//
//
//   g = d3.select("#svg" + params)
//     .attr("width", chart_width + margin.left + margin.right)
//     .attr("height", height + margin.top + margin.bottom)
//     .append("g").attr("id", "group_" + params);
//
//
//   d3.select("#svg" + params)
//     .append("g")
//     .append("rect")
//     .attr("class", "white_rect")
//     .attr("width", "52px")
//     .attr("height", height)
//     .attr("x", -1)
//     .attr("y", -1)
//     .attr("fill", "white")
//
//   d3.select("#svg" + params)
//     .append("g")
//     .append("rect")
//     .attr("class", "white_rect")
//     .attr("width", chart_width + 10)
//     .attr("height", "35px")
//     .attr("x", 0)
//     .attr("y", -1)
//     .attr("fill", "white")
//
//   zoomed();
//
//
//
//   g.attr("class", "pcon")
//     .selectAll("path")
//     .data(topojson.feature(dvc.pcon, dvc.pcon.objects.la2019EW).features)
//     .enter()
//     .append("path")
//     .attr("id", function(d, i) {
//       return "reg" + d.properties.AREACD
//     })
//     .attr("class", function(d, i) {
//       return "reg" + d.properties.AREACD
//     })
//     .attr("data-nm", function(d) {
//       return d.properties.AREANM
//     })
//     .attr("data_val", function(d) {
//       return rateById[d.properties.AREACD]
//     })
//     .attr("d", path)
//     .style("stroke", function(d) {
//       if (rateById[d.properties.AREACD] == ".." || rateById[d.properties.AREACD] == undefined) {
//         return "#ccc"
//       } else {
//         return "#ccc";
//       }
//     })
//     .style("fill", function(d) {
//       if (rateById[d.properties.AREACD] == ".." || rateById[d.properties.AREACD] == undefined) {
//         return "white"
//       } else {
//         return color(rateById[d.properties.AREACD]);
//       }
//     })
//     .on("mouseout", unhighlight)
//     .on("mouseover", function(d) {
//       //console.log($(this).parent().attr("id"));
//       highlight(d.properties.AREACD);
//       plot($(this).parent().attr("id"), d.properties.AREACD);
//     });
//
//   //					// draw text in upper right corner of each graph with the associated title from data.csv
//   //						cards.append("rect")/*
//   //							.data(headers)*/
//   //							.attr("x", 0)
//   //							.attr("y", 0 )
//   //							.attr("height",18)
//   //							.attr("width", 40)
//   //							.style("fill", "#fff")
//   //							.style("stroke","none")
//   //							.style("opacity",0.8);
//
//
//
//
//   // draw text in upper right corner of each graph with the associated value from data.csv
//   //						d3.select("#svg"+params).append("text")
//   ////							.data(headers)
//   //							.attr("x" , chart_width-5)
//   //							.attr("y" , 15 )
//   //							.style("display" , "inline")
//   //							.attr("class", "svgValue")
//   //						.attr("id", "areanm")
//   //							.style("pointer-events" , "none")
//   //							.style("text-anchor","end")
//   //							.text(function(){
//   //								var fmt = d3.format(".2f")
//   //								if(linevalues[0][vals[i]]=="null"||[vals[i]]=="undefined"){
//   //									return headers[i].substr(2, 5);
//   //								} else if(linevalues[0][vals[i]]=="0"){
//   //									return "less than 0.01% "+ headers[i];;
//   //								} else {
//   //									return /*numFormat*/fmt(linevalues[0][vals[i]])+"% "+headers[i];;
//   //								}
//   //							});
//   //							.text("") ;
//
//   //function(d,i){return currclass});
//
//   //.text(function(d,i){ return headers[k];
//   ////return headers[k].substring(0,  headers[k].indexOf(', '));
//   //});
//
//   d3.select("#svg" + params).append("text")
//     /*
//     							.data(headers)*/
//     .attr("x", 0)
//     .attr("y", 12)
//     .style("display", "inline")
//     .attr("class", "svgTitle")
//     .style("pointer-events", "none")
//     .text(function(d, i) {
//       return headers[params];
//       //return headers[k].substring(0,  headers[k].indexOf(', '));
//     })
//   //							.each(function(d,i){
//   //
//   //								d3.select(this)
//   //									.text('')                        //clear existing text
//   //									.tspans(d3.wordwrap(headers[params], 30)) //wrap after xx char
//   //								});
//
//   d3.selectAll(".svgTitle")
//     .selectAll("tspan")
//     .attr("x", 0)
//
//   d3.select("#svg" + params).append("text")
//     /*
//     							.data(headers)*/
//     .attr("x", 0)
//     .attr("y", 27)
//     .style("display", "inline")
//     .attr("class", "LA_value")
//     .attr("id", "LA_value_" + params)
//     .style("pointer-events", "none")
//
//   //				var texty  = d3.selectAll(".tick").select("text");
//   //
//   //				texty[0].forEach(function(d,i){
//   //
//   //					if(d3.select(d).text() == "15") {
//   //						d3.select(d).text("15+");
//   //					};
//   //
//   //
//   //				}
//   //
//   //				)
//
//   center = [chart_width / 2, chart_width / 2];
//
//   d3.selectAll(".graphUnitSVGs").call(zoom)
//     .call(zoom.event);
//
//   d3.selectAll(".name").classed("hide", true);
//
//
//
//   d3.select("#svg" + params)
//     .append("g")
//     .attr("id", "key_" + params)
//     .attr("class", "key")
//     .attr("transform", "translate(40,45)scale(0.8)");
//
//
//   y = d3.scale.linear()
//     .domain([breaks[0], breaks[dvc.essential.breakDivisions]]) /*range for data*/
//     .range([height + margin.top + margin.bottom, 0]); /*range for pixels*/
//
//
//   var yAxis = d3.svg.axis()
//     .scale(y)
//     .orient("left")
//     .tickSize(0)
//     .tickFormat(function(d, i) {
//
//       if (i == 0 || i == 5 || i == 7 || i == 8 || i == 9) {
//         return numFormat(d)
//       }
//
//     })
//     .tickValues(color.domain());
//
//   d3.select("#key_" + params).selectAll("rect")
//     .data(color.range().map(function(d, i) {
//       return {
//         y0: i ? y(color.domain()[i - 1]) : y.range()[0],
//         y1: i < color.domain().length ? y(color.domain()[i]) : y.range()[1],
//         z: d
//       };
//     }))
//     .enter().append("rect")
//     .attr("width", 5)
//     .attr("y", function(d, i) {
//       return d.y1;
//     })
//     .attr("height", function(d) {
//       return d.y0 - d.y1;
//     })
//     .style("fill", function(d) {
//       return d.z;
//     });
//
//   d3.select("#key_" + params).call(yAxis).append("text").text("%").attr("dy", "-0.5em");
//
//
//   //checkUrl()
//   //showMaps();
//
//   //use pym to calculate chart dimensions
//   if (pymChild) {
//     setTimeout(function() {
//       pymChild.sendHeight();
//     }, 300);
//   }
//
// }
//
//
// function checkUrl() {
//
//   urlLocal = window.location.href;
//
//   var listnamesLocal = urlLocal.split("#")[1];
//
//   if (listnamesLocal != undefined) {
//
//     listnamesA = listnamesLocal.split(',').slice(0).join(',');
//     //console.log(listnamesA)
//     listnames = listnamesA.split(',');
//
//     $("#areaselect").val(listnames);
//     $("#areaselect").trigger("change");
//     //$("#occselect").setSelectionOrder(listnames);
//     showMaps(listnames);
//   }
//
// }
//
//
// function showMaps(listnames) {
//
//   listnames.forEach(function(d, i) {
//     // console.log(d, "just before drawGraphic2")
//     var parentDiv = d3.select("#svg" + d).select(function() {
//       return this.parentNode;
//     })
//
//     if ($(".container-fluid").width() < 600) {
//       parentDiv.classed("col-xs-10", true)
//     } else if ($(".container-fluid").width() < 750) {
//       parentDiv.classed("col-sm-4", true)
//     } else if ($(".container-fluid").width() < 945) {
//       parentDiv.classed("col-md-3", true)
//     }
//     d3.select("#svg" + d).classed("hide", false);
//
//     drawGraphic2(d);
//   });
// }
//
// function plot(parent, area) {
//
//   linevalues = dvc.data.map(function(d) {
//     return d;
//   }).filter(function(d) {
//     return d.AREACD == area
//   });
//
//   vals = d3.keys(linevalues[0]).filter(function(key) {
//     if (dvc.essential.fieldsToIgnore.indexOf(key) == -1) {
//       return key;
//     }
//   });
//
//   for (i = 0; i < headers.length; i++) {
//
//
//     var values = dvc.data.map(function(d) {
//       return +d[headers[i]];
//     }).filter(function(d) {
//       return !isNaN(d)
//     }).sort(d3.ascending);
//   }
// }
//
// function highlight(area) {
//   var reg = document.getElementById("reg" + area);
//
//
//   var name = d3.select(".reg" + area).attr("data-nm")
//   var val = d3.selectAll(".reg" + area).attr("data_val")
//
//   d3.selectAll('.pcon')
//     .append("path")
//     .attr("d", d3.select(reg).attr("d"))
//     .attr("id", "selected")
//     .attr("class", "arcSelection")
//     .attr("pointer-events", "none")
//     .style("fill", "none")
//     .style("stroke", "#666")
//     .style("stroke-width", 1 / dvc.scale);
//
//   details = d3.select("#details")
//   d3.selectAll("#areanm").text(name);
//
//   vals_array = []
//
//   d3.selectAll(".reg" + area).each(function(d, i) {
//     vals_array.push(d3.select(this).attr("data_val"))
//
//   })
//
//   count_array = [];
//   d3.selectAll(".svgTitle").each(function(d, i) {
//
//     name = d;
//
//
//     count_data.filter(function(d, j) {
//       if (d.AREACD == area) {
//
//         if (d[name] != "") {
//           count_array.push(d[name]);
//         } else {
//           count_array.push("Fewer than 3")
//         }
//         total = d.Total
//         d3.selectAll(".LA_value").text(function(d, j) {
//           if (vals_array[j] == "..") {
//             return count_array[j] + " of " + total + " babies "
//           } else {
//             return count_array[j] + " of " + total + " babies (" + vals_array[j] + "%) "
//           }
//         })
//       }
//     })
//   })
//
//
//
//
//
// }
//
// /* Remove the current selected polygon */
// function unhighlight() {
//   d3.selectAll('#selected').remove();
//   d3.selectAll("#areanm").text("");
//   d3.selectAll(".LA_value").text("");
// }
//
// function zoomed() {
//
//   dvc.scale = zoom.scale();
//
//   d3.selectAll(".pcon").style("stroke-width", (0.5 / zoom.scale()))
//     .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");
//
//
// }
//
//
// function zoom_by(factor) {
//
//   var scale = zoom.scale(),
//     extent = zoom.scaleExtent(),
//     translate = zoom.translate(),
//     x = translate[0],
//     y = translate[1],
//     target_scale = scale * factor;
//
//   // If we're already at an extent, done
//   if (target_scale === extent[0] || target_scale === extent[1]) {
//     return false;
//   }
//   // If the factor is too much, scale it down to reach the extent exactly
//   var clamped_target_scale = Math.max(extent[0], Math.min(extent[1], target_scale));
//   if (clamped_target_scale != target_scale) {
//     target_scale = clamped_target_scale;
//     factor = target_scale / scale;
//   }
//
//   // Center each vector, stretch, then put back
//   x = (x - center[0]) * factor + center[0];
//   y = (y - center[1]) * factor + center[1];
//
//   dvc.scale = zoom.scale();
//   dvc.translate = zoom.translate();
//
//
//   // Enact the zoom immediately
//   zoom.scale(target_scale)
//     .translate([x, y]);
//
//   zoomed();
//
//
// }
//
// function zoomcontrols() {
//   if (listnames.length > 0) {
//     zoomcontrols = d3.select("#new").append('div').attr("class", "zoom-container zoom-control-zoom zoom-bar zoom-control");
//   } else {
//     zoomcontrols = d3.select("#new").append('div').attr("class", "hide zoom-container zoom-control-zoom zoom-bar zoom-control");
//   }
//
//   zoomcontrols.append("a").attr("id", "zoom_in").attr("class", "zoom-control-zoom-in zoom-bar-part zoom-bar-part-top").attr("title", "Zoom in").attr("tabindex", 0).text("+").attr("aria-label", "Zoom in").attr("role", "button")
//   zoomcontrols.append("a").attr("id", "zoom_out").attr("class", "zoom-control-zoom-out zoom-bar-part zoom-bar-part-bottom").attr("title", "Zoom out").attr("tabindex", 0).text("-").attr("aria-label", "Zoom out").attr("role", "button")
//
//   var intervalID;
//
//   d3.selectAll('.zoom-bar-part').on('mousedown', function() {
//
//     d3.event.preventDefault();
//     var factor = (this.id === 'zoom_in') ? 1.1 : 1 / 1.1;
//     intervalID = setInterval(zoom_by, 40, factor);
//
//   }).on('mouseup', function() {
//     d3.event.preventDefault();
//     clearInterval(intervalID);
//     intervalID = undefined;
//   }).on('keydown', function(evt) {
//     if (d3.event.keyCode == 13 || d3.event.keyCode == 32) {
//
//       d3.event.preventDefault();
//       var factor = (this.id === 'zoom_in') ? 1.1 : 1 / 1.1;
//       intervalID = setInterval(zoom_by, 40, factor);
//
//
//     }
//   }).on('keyup', function(evt) {
//
//     d3.event.preventDefault();
//     clearInterval(intervalID);
//     intervalID = undefined;
//   })
// }
//
//
//
//
//


// function ready(error, pcon, data) {
//
//   dvc.pcon = pcon;
//   dvc.data = data;
//
//   pymChild = new pym.Child({
//     renderCallback: createStructure
//   });
//
//   var IE = (!!window.ActiveXObject && +(/msie\s(\d+)/i.exec(navigator.userAgent)[1])) || NaN;
//   if (IE != 9) {
//     zoomcontrols();
//   }
//
// }
