$(function() {

    var showGraphs = true;

    queue()
        .defer(d3.json,$SCRIPT_ROOT+"/cluster_counts")
        .defer(d3.json,$SCRIPT_ROOT+"/all_clusters_user_sim")
        .await(drawCirclePacking);

    function drawCirclePacking(err,ccounts,cusim) {
        var root = ccounts.results,
            sim = cusim.results;
        var width = document.getElementById('chartContainer').offsetWidth,
            height = screen.availHeight,
            diameter = height * .85,
            margin = {top: 20, left: 100, bottom: 10, right: 40},
            format = d3.format(",d"),
            opacityScale = d3.scale.linear()
                                .range([1,.3])
                                .domain([0,1]);
            simColors = d3.scale.linear()
                            .domain([sim.min, sim.max])
                            .range([colorbrewer.Greens[9][2],colorbrewer.Greens[9][8]])
                            .interpolate(d3.interpolateHcl);
            center = [width / 2, height / 2];    

        var svg = d3.select("#chartContainer").append("svg")
            .attr("width", width+margin.top+margin.bottom)
            .attr("height", height+margin.left+margin.right)
            .attr("class", "bubble")
            .append('g')
            .attr('transform','translate(0,-65)');

        var nodes = classes(root);

        var force = d3.layout.force()
                        .nodes(nodes)
                        .size([width, height]);
        
        var circles = svg.selectAll('circle')
                        .data(nodes)
                        .enter().append('circle')
                        .attr("r",0)
                        .style("fill",function(d) {
                            if(d.name in sim.clusters) {
                                return simColors(sim.clusters[d.name]);
                            } else 
                                return "green";
                        })
                        .style("opacity",.9)
                        .style("stroke","white")
                        .style("stroke-width","1.5px")
                        .on('mouseenter', function(d) {
                            d3.select(this).style("stroke-width","3px");
                            if(showGraphs) {
                                showGraphs = false;
                                descript = ''; color = 'green';
                                if(d.name in sim.clusters) {
                                    descript = sim.desc[d.name];
                                    color = simColors(sim.clusters[d.name]);
                                }
                                mouseenter(d.name,d.value,descript,color);
                            }
                        })
                        .on("mouseleave", function(d) { 
                            d3.select(this).style("stroke-width","1.5px");
                        })
                        .on('click', function(d) {
                            var c = +d.name.match(/[0-9]+/)[0] || 1;
                            window.location.href = $SCRIPT_ROOT+'/home/cluster'+c;
                        });
        
        circles.transition().duration(2000).attr("r", function(d) { return d.r; });
                            
        force.gravity(-0.015)
            .charge(function(d) { return -Math.pow(d.r, 2.0) / 8; })
            .friction(0.9)
            .on('tick', function(e) {
                circles.each(function(d) {
                    d.x = d.x + (center[0] - d.x) * (0.1 + 0.02) * e.alpha;
                    d.y = d.y + (center[1] - d.y) * (0.1 + 0.02) * e.alpha;
                })
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });
            })
            .start();

        setTimeout(function() { force.stop(); },5000);

        function mouseenter(name,csize,desc,color) {
            setTimeout(function() { 
                showGraphs = true; 
            },200);
            $('#tagOverview').empty();
            var c = +name.match(/[0-9]+/)[0] || 1;
            $('#panel > #header > span').text(c);
            $.getJSON($RESOURCES+'/clusters/cluster'+c+'.json',function(response) {
                var data;
                response.children.sort(function(a,b) { return b.size - a.size; });
                response.children = response.children.filter(function(d) { return !(d.name == 'java'); });
                if(response.children.length > 10) {
                    data = response.children.slice(0,10);
                    var s = 0;
                    for(var i = 10; i < response.children.length; i++)
                        s += response.children[i].size;
                    s = s / (response.children.length - 10);
                    data.push({ name: 'other', size: s});
                } else
                    data = response.children;
                drawBar(name,csize,data,desc,color);
            });
            return false;
        }

        function classes(root) {
            var c = [];
            var max = d3.max(root.children, function(d) { return +d.size; });
            var radius = d3.scale.pow().exponent(0.5).domain([0,max]).range([15,height/5]);
            root.children.forEach(function(d) {
                c.push({ 
                    name: d.name,
                    r: radius(+d.size),
                    value: +d.size,
                    x: Math.random() * 900,
                    y: Math.random() * 800,
                });
            });
            c.sort(function(a,b) { return b.value - a.value; });
            return c;
        }
        
        var lwidth = $('#topicOverview').width(),
            lheight = $('#topicOverview').height(),
            legend = d3.select('#topicOverview').append('svg')
                        .attr("width",lwidth)
                        .attr("height",lheight)
                        .attr("id","legendSvg");
        
        legend.append("g").append("defs")
            .append("linearGradient")
            .attr("id","legend")
            .attr("x1","0%")
            .attr("x2","0%")
            .attr("y1","0%")
            .attr("y2","100%");
    
        legend.append("rect")
            .style("fill","url(#legend)")
            .attr("x",lwidth * .2)
            .attr("y",10)
            .attr("width",30)
            .attr("height",lheight-20)
            .style("stroke","black");

        legend.append("text")
            .attr("x",lwidth * .2 + 35)
            .attr("y",20)
            .style("text-anchor","start")
            .text("Least Relevant");
        
        legend.append("text")
            .attr("x",lwidth * .2 + 35)
            .attr("y",lheight-10)
            .style("text-anchor","start")
            .text("Most Relevant");

        var offsetScale = d3.scale.linear().domain([0,10]).range([0,100]);
        var gradColor = d3.scale.ordinal()
                            .domain(d3.range(10))
                            .range(d3.range(10).map(d3.scale.linear()
                                        .domain([sim.min,sim.max])
                                        .range([colorbrewer.Greens[9][2],colorbrewer.Greens[9][8]])));
        d3.select('#legend').selectAll("stop")
            .data(d3.range(10))
            .enter().append("stop")
            .attr("offset", function(d) {
                return offsetScale(d);
            })
            .attr("stop-color",function(d) {
                return gradColor(d);
            })
            .attr("stop-opacity",1);
        
        legend.append("g")
            .attr("transform","translate("+(lwidth * .4)+","+(lheight * .2)+")")
            .append('foreignObject')
            .attr('width',lwidth*.5)
            .attr('height',lheight*.5)
            .append("xhtml:div")
            .attr('id','radialDiv');
        
        $('#open').on('click',function() {
            $('#altpanel').animate({
                opacity: 1,
            },500,function() {
                queue().defer(d3.json,$SCRIPT_ROOT+'/prefs').await(preferences);
            }).css('z-index',20);
        });
        
        $("#close").on('click', function() {
            $('#altpanel').animate({
                opacity: 0,
            },500,function() {
                window.location.href = '/overview?user='+$USER;
            }).css('z-index',-20);
        });        
    }

    function drawBar(name,csize,data,desc,color) {

        $('#tagOverview').append($('<div>')
                .addClass("chart"));
        
        $('#radialDiv').empty();
        radialProgress($('#radialDiv')[0]).label(desc)
            .diameter(150)
            .value(Math.ceil(($PROGRESS[name]/csize)*100))
            .render();
        
        var width = $('.chart').width(),
            height = $('#tagOverview').height(),
            barWidth = Math.floor(width / data.length) - 1,
            margin = {top: 5, bottom: 100, left: 10, right: 10};

        var x = d3.scale.ordinal()
                    .domain(data.map(function(d) { return d.name;}))
                    .rangeRoundBands([margin.left,width-margin.right-margin.left],.1);

        var xAxis = d3.svg.axis()
                        .scale(x)
                        .orient("bottom");

        var y = d3.scale.linear()
                    .domain([0, d3.max(data, function(d) { return d.size; })])
                    .range([margin.top,height-margin.bottom-margin.top]);

        var svg = d3.select('.chart').append('svg')
                    .attr('width', width)
                    .attr('height', height)
                    .append("g");

        svg.append("g")
            .attr("class","x axis")
            .attr("transform", "translate(0,"+(height-margin.bottom)+")")
            .call(xAxis)
            .selectAll("text")
            .attr("y", 10)
            .attr("x", 5)
            .attr("dy", ".35em")
            .attr("transform","rotate(45)")
            .style("text-anchor","start");

        var bar = svg.selectAll('.bar')
                        .data(data)
                    .enter().append('g')
                        .attr('class','bar')
                        .attr("transform", function(d) {
                            return "translate("+ x(d.name) + ",0)";
                        });

        bar.append("rect")
            .attr("y",function(d) { return height-margin.top-margin.bottom; })
            .attr("height",function(d) { return 0; })
            .attr("width", x.rangeBand())
            .style('fill',color)
            .style('shape-rendering','crispEdges')
            .transition().duration(500)
            .attr("height", function(d) { 
                return y(d.size);
            })
            .attr("y", function(d) {
                return (height-margin.top-margin.bottom)-y(d.size);
            });
        
    }

    function preferences(err,data) {
        var prefs = data.results.w;
        $('#sliders').empty();
        for(var i = 0; i < prefs.length; i++) {
            $("#sliders").append($('<div>')
                .addClass('sliderD')
                .append($('<p>').text(prefs[i].name))
                .append($('<p>')
                    .addClass('slider')
                    .attr("id",prefs[i].name)
                    .slider({
                        value: prefs[i].count/data.results.s,
                        min: 0.0,
                        max: 1.0,
                        step: 0.1,
                        range: "min",
                        orientation: 'horizontal',
                        change: function() {
                            var val = $(this).slider("value");
                            var n = $(this).attr("id");
                            var res = {};
                            res[n] = val * data.results.s;
                            $.ajax({
                                url: $SCRIPT_ROOT+'/update_prefs',
                                data: { vals: JSON.stringify(res) },
                                method: 'GET'
                            });
                        }
                    })));
        }      
    }
});
