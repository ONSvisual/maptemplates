var pymChild = null;
var chart_width = 245;
var height = 288;
var margin = config.margin

// onload check to see if the web browser can handle 'inline svg'
if (Modernizr.svg == true) {
  d3.select("#fallback").selectAll("*").remove();
	d3.select("#screenreadertext").text(config.screenreadertext)
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
  pymChild = new pym.Child();
  setupdropdown(data);
  setupGeo(geog);
	setupScales();
	createKey(config.legendBreaks,config.colour.reverse().slice(0,config.colour.length-1));//ignore the white colour
	dataObject=prepData(data);
  pymChild.sendHeight();
}

function setupScales() {
  colour = d3.scaleThreshold()
    .domain(config.breaksAll)
    .range(config.colour);
}

function createKey(breaks,colours){
	legend=d3.select("#legend").append('ul').attr('class','key')

	var foo = d3.zip(breaks,colours)

	var li=legend.selectAll('li')
	.data(foo)
	.enter()
	.append('li')

	li.append('b').style('background',function(d){return d[1]})

	li.append('label').text(function(d){return d[0]})
}

function prepData(data){
	var dataObject={};
	for(i=2;i<data.columns.length;i++){
		dataObject[data.columns[i]]={}
		var foo=dataObject[data.columns[i]]
		for(j=0;j<data.length;j++){
			foo[data[j].AREACD]=+data[j][data.columns[i]]
		}
	}
	return dataObject;
}

function setupdropdown(data) {

  d3.select("#chosensel").selectAll("*").remove();
  variables = [];

  for (i = 2; i < data.columns.length; i++) { //skip the first two columns
    variables.push(data.columns[i]);
  }

  var optns = d3.select("#chosensel").append("div").attr("id", "sel").append("select")
    .attr("id", "selectmenu")
    .attr("style", "width:98%")
    .attr("multiple", true)
    .attr("class", "chosen-select");

  optns.append("option")
    .attr("value", "first")
    .text("");

  optns.selectAll("p").data(variables).enter().append("option")
    .attr("value", function(d, i) {
      return i;
    })
    .text(function(d) {
      return d;
    });


  $('#selectmenu').chosen({
    width: "99%",
    max_selected_options: 6,
    placeholder_text_multiple: "Choose up to six sectors"
  }).on('change', function(evt, params) {

    if (typeof params.selected != 'undefined') {
      allselections = $('#selectmenu').getSelectionOrder();
      var lastselection = params.selected;

      addMap(lastselection);

      d3.selectAll(".search-choice-close").each(function(d,i){
				d3.select(this).attr("aria-label","Remove "+variables[allselections[i]]);
			})

      if (pymChild) {
        setTimeout(function() {
          pymChild.sendHeight();
        }, 300);
      }

    } else {
      var deselection = params.deselected;
      removeMap(deselection);
    }
  });//end on change

	d3.select("#selectmenu-chosen-search-results").attr('aria-labelledby','instructions')

}//end setupdropdown

function removeMap(index) {
  d3.select('#map' + index).remove();
  pymChild.sendHeight();
}

function setupGeo(geog) {
	geojson=topojson.feature(geog,geog.objects.EWregion)

  projection = d3.geoAlbers()
	.rotate([0,0])
	.fitSize([chart_width,height],geojson)

  path = d3.geoPath().projection(projection);
}

function addMap(variableIndex) {
  var div = d3.select(".container").append('div').attr('id', 'map' + variableIndex).attr('class', 'item');

  div.append('p').attr('class','sectionTitle').text(variables[variableIndex])

  svg = div.append('svg')
    .attr('width', chart_width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

  g = svg.append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

	svg.append('text').attr('id','valueText'+variables[variableIndex])
	.attr('class','valueText')
	.attr('x',margin.left)
	.attr('y',15)
	.attr('text-anchor','start')

  map=g.append('g').selectAll('path.regions')
    .data(geojson.features)
    .enter()
    .append("path")
    .attr("class", function(d, i) {
      return "reg reg" + d.properties.AREACD;
    })
    .attr("data-nm", function(d) {
      return d.properties.AREANM;
    })
    .attr("d", path)
    .attr("stroke", "#7f7f7f")
    .attr("fill", function(d) {
      if (dataObject[variables[variableIndex]][d.properties.AREACD] == ".." || dataObject[variables[variableIndex]][d.properties.AREACD] == undefined) {
        return 'white';
      } else {
      	return colour(dataObject[variables[variableIndex]][d.properties.AREACD])
      }
    })
		.on("mouseover",function(d){
			highlight(d.properties.AREACD,d.properties.AREANM);
		})
		.on("mouseout",unhighlight);

		pymChild.sendHeight();
}

function highlight(area,name){
  allselections = $('#selectmenu').getSelectionOrder();

	d3.selectAll(".reg"+area).raise()

	d3.selectAll(".valueText").each(function(d,i){
		d3.select(this).text(name+" "+d3.format(".1f")(+dataObject[variables[allselections[i]]][area])+"%")
	})
	d3.selectAll(".reg"+area).attr('stroke','black').attr('stroke-width','2px')
}

function unhighlight(){
	d3.selectAll('.reg').attr('stroke','#7f7f7f').attr('stroke-width','1px')
	d3.selectAll('.valueText').text("")
}
