$(function() {

    var showGraphs = true;

    queue().defer(d3.json,$SCRIPT_ROOT+"/cluster_counts")
        .await(drawCirclePacking);

    function drawCirclePacking(err,data) {
        var root = data.results;
        var width = document.getElementById('chartContainer').offsetWidth,
            height = screen.availHeight,
            diameter = height * .85,
            margin = {top: 20, left: 100, bottom: 10, right: 40},
            format = d3.format(",d"),
            color = d3.scale.linear()
                        .domain([-1, 5])
                        .range(["lightgreen", "green"])
                        .interpolate(d3.interpolateHcl)
            center = [width / 2, height / 2];    

        var bubble = d3.layout.pack()
            .sort(null)
            .size([diameter, diameter])
            .padding(0.5);

        var svg = d3.select("#chartContainer").append("svg")
            .attr("width", width+margin.top+margin.bottom)
            .attr("height", height+margin.left+margin.right)
            .attr("class", "bubble")
            .append('g')
            .attr('transform','translate('+(margin.left)+','+(margin.top)+')');

        var nodes = bubble.nodes(classes(root));

        var force = d3.layout.force()
                        .nodes(nodes)
                        .size([width, height]);
        
        var node = svg.selectAll(".node")
              .data(nodes)
            .enter().append("g")
              .attr("class", function(d) { return d.children ? "node" : "leaf node"})
              .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

        node.append("circle")
                .attr("r", function(d) { return d.r; })
                .style('fill', function(d) { return d.parent ? "green" : "none"; })
                .style("stroke",function(d) { return d.parent ? "darkgreen" : "none"; })
                .style("opacity", function(d) { return d.parent ? 0.6 : 0.1; })
                .style("pointer-events", function(d) { return d.parent ? "all" : "none"; })
                .on('mouseenter', function(d) {
                    d3.select(this).style('opacity',0.9);
                    if(!d.parent) return;
                    if(showGraphs) {
                        showGraphs = false;
                        mouseenter(d.className);
                    }
                })
                .on('click', function(d) {
                    var c = +d.className.match(/[0-9]+/)[0] || 1;
                    window.location.href = $SCRIPT_ROOT+'/home/cluster'+c;
                })
                .on('mouseleave', function(d) {
                    d3.select(this).style('opacity',0.6);
                });

        force.gravity(-0.01)
            .friction(0.9)
            .on('tick', function(e) {
                node.selectAll('circle').each(function(d) {
                    d.x = d.x + (center[0] - d.x) * (0.1 + 0.02) * d.alpha;
                    d.y = d.y + (center[1] - d.y) * (0.1 + 0.02) * d.alpha;
                })
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });
            })
            .start();

        function mouseenter(name) {
            setTimeout(function() { showGraphs = true; },500);
            $('#tagOverview').empty();
            $('#topicOverview').empty();
            var c = +name.match(/[0-9]+/)[0] || 1;
            $('#panel > p > span').text(c);
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
                drawBar(data);
            });
            return false;
        }

        function classes(root) {
            var classes = [];
            root.children.forEach(function(d) {
                classes.push({ packageName: 'java', className: d.name, value: d.size });
            });
            return {children: classes};
        }
    }

    function drawBar(data) {

        $('#tagOverview').append($('<div>')
                .addClass("chart"));

        var width = $('.chart').width(),
            height = screen.availHeight * .4,
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
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform","rotate(90)")
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
            .style('fill','rgb(39, 146, 33)')
            .style('opacity',0.6)
            .style('shape-rendering','crispEdges')
            .transition().duration(500)
            .attr("height", function(d) { 
                return y(d.size);
            })
            .attr("y", function(d) {
                return (height-margin.top-margin.bottom)-y(d.size);
            });
    }
});
