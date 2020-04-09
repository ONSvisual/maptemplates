//Code to create share buttons, embed code etc

d3.select("#footer")
	.append("div")
	.attr("id", "share")
	.style("width","160px")
	.style("height", "30px")
	.style("float", "right")
	
	
var embedURL = d3.select("#footer")
		.append("div")
		.attr("id", "embedURL")
		.style("float", "right")
		.style("background-color", "#a7a7a7")
		.style("height", "0px")
		.style("max-height", "60px")
		.style("display", "none")
		.style("opacity", 0)
		.style("padding", "5px, 5px, 5px, 5px")
		.style("margin", "5px 7px 0px 0px")
		.style("border-radius", "5px")
	
embedURL.append("p")
		.style("color", "white")
		.style("text-align", "center")
		.style("margin", "2px 0px 2px 0px")
		.style("padding", "0px")
		.style("font-size", "12px")
		.style("font-family", "Open Sans")
		.html("paste HTML to embed in your website")
		
embedURL.append("input")
		.attr("type", "text")
		.attr("id", "embedurl")
		.attr("name", "iframe")
		.style("width", "240px")
	
embedURL.append("p")	
		.attr("id", "closeURL")
		.style("color", "white")
		.style("text-decoration", "underline")
		.style("text-align", "center")
		.style("margin", "0px")
		.style("padding", "0px")
		.style("font-size", "12px")
		.style("font-family", "Open Sans")
		.html("close")
		

var ParentURL = (window.location != window.parent.location)
            ? document.referrer
            : document.location;
 
//appending the buttons
d3.select("#share").append("a")
	.attr("id","facebookShare")
	.attr("href","https://www.facebook.com/sharer/sharer.php?u=" + ParentURL)
	.attr("target","_blank")
	.style("display","block")
	.style("height","25px")
	.style("width","25px")
	.style("background","#fff")
	.style("margin-top","5px")
	.style("margin-right","7px")
	.style("margin-bottom","5px")
	.style("float","left")
	.style("opacity","0.7")
	.attr("title","Facebook")
	.append("img")
	.style("height","25px")
	.style("width","25px")
	.attr("src","../images/facebook-grey.png");

d3.select("#share").append("a")
	.attr("id","twitterShare")
	.attr("href","https://twitter.com/intent/tweet?text=" + ParentURL)
	.attr("target","_blank")
	.style("display","block")
	.style("height","25px")
	.style("width","25px")
	.style("background","#fff")
	.style("margin-top","5px")
	.style("margin-right","7px")
	.style("margin-bottom","5px")
	.style("float","left")
	.style("opacity","0.7")
	.attr("title","Twitter")
	.append("img")
	.style("height","25px")
	.style("width","25px")
	.attr("src","../images/twitter-grey.png");

d3.select("#share").append("a")
	.attr("id","linkedinshare")
	.attr("href","https://www.linkedin.com/cws/share?url=http%3A%2F%2Fgoogle.com")
	.attr("target","_blank")
	.style("display","block")
	.style("height","25px")
	.style("width","25px")
	.style("background","#fff")
	.style("margin-top","5px")
	.style("margin-right","7px")
	.style("margin-bottom","5px")
	.style("float","left")
	.style("opacity","0.7")
	.attr("title","Linkedin")
	.append("img")
	.style("height","25px")
	.style("width","25px")
	.attr("src","../images/linkedin-grey.png");

d3.select("#share").append("a")
	.attr("id","embedShare")
	.style("display","block")
	.style("height","25px")
	.style("width","25px")
	.style("background","#fff")
	.style("margin-top","5px")
	.style("margin-bottom","5px")
	.style("margin-right","7px")
	.style("float","left")
	.style("opacity","0.7")
	.attr("title","Embed")
	.append("img")
	.attr("src","../images/embed-grey.png")
	.style("height","25px")
	.style("width","25px");
	
d3.select("#share").append("a")
	.attr("id","downloadshare")
	.style("display","block")
	.style("height","25px")
	.style("width","25px")
	.style("background","#fff")
	.style("margin-top","5px")
	.style("margin-bottom","5px")
	.style("float","left")
	.style("opacity","0.7")
	.style("margin-right","7px")
	.attr("title","Download")
	.on("click",function(){saveSvgAsPng(document.getElementById("chart"), "diagram.png")})
	.append("img")
	.attr("src","../images/download-grey.png")
	.style("height","25px")
	.style("width","25px");
	

//on mouseover
d3.select("#facebookShare").on("mouseover", function() {
	d3.select("#facebookShare").style("opacity","1");
});
d3.select("#twitterShare").on("mouseover", function() {
	d3.select("#twitterShare").style("opacity","1");
});
d3.select("#embedShare").on("mouseover", function() {
	d3.select("#embedShare").style("opacity","1");
});
d3.select("#linkedinshare").on("mouseover", function() {
	d3.select("#linkedinshare").style("opacity","1");
});
d3.select("#downloadshare").on("mouseover", function() {
	d3.select("#downloadshare").style("opacity","1");
});

//on mouseout
d3.select("#facebookShare").on("mouseout", function() {
	d3.select("#facebookShare").style("opacity","0.7");
});
d3.select("#twitterShare").on("mouseout", function() {
	d3.select("#twitterShare").style("opacity","0.7");
});
d3.select("#embedShare").on("mouseout", function() {
	d3.select("#embedShare").style("opacity","0.7");
});
d3.select("#linkedinshare").on("mouseout", function() {
	d3.select("#linkedinshare").style("opacity","0.7");
});
d3.select("#downloadshare").on("mouseout", function() {
	d3.select("#downloadshare").style("opacity","0.7");
});

//open and close embed div with "close" or another click of the embed icon
d3.select('#embedurl').property("value",'<iframe width="940" height="710" src="' + document.URL + '"webkitAllowFullScreen mozAllowFullScreen allowFullScreen scrolling="no" frameborder="0"/>');
var embedUrlOpen = 1;
d3.select("#embedShare").on("click", function() {
	if (embedUrlOpen == 1) {
		d3.select("#embedURL").transition().duration(500).style("height","60px")
		                      .style("display","block").style("opacity",1);
		embedUrlOpen = 2;
	} else if (embedUrlOpen == 2) { 
		d3.select("#embedURL").transition().duration(500).style("height","0px").style("opacity",0);
		d3.select("#embedURL").transition().delay(501).style("display", "none");

		embedUrlOpen = 1;
	}
});

d3.select("#closeURL").on("click", function() {
		d3.select("#embedURL").transition().duration(500).style("height","0px").style("opacity",0);
		d3.select("#embedURL").transition().delay(501).style("display", "none");
	embedUrlOpen = 1;
});

//download image button

d3.select("#downloadshare").on("click",function(){saveSvgAsPng(document.getElementById("chart"), "fallback.png")});

d3.select("#downloadshare").on("click",function(){saveSvgAsPng(document.getElementById("chart"), "diagram.png")});


