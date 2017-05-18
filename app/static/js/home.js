$(function() {
    
    var accObj = {
        header: '> div > .accHeader',
        collapsible: true,
        active: false,
        heightStyle: "content",
        activate: function(e,ui) {
            if(ui.newHeader.length != 0) {
                session_visited(ui.newHeader.children('p').html());
            }
        }
    };

    var spinner = new Spinner({
      lines: 13, length: 10, 
      width: 5, radius: 6, 
      corners: 1, rotate: 0, 
      direction: 1, color: '#000', 
      speed: 1, trail: 60, 
      shadow: false, hwaccel: false, 
      className: 'spinner', zIndex: 2e9, 
      top: '50%', left: '50%' 
    });
    var spinTarget = $('#viewer')[0];

    var block = false;

    var PROGRESS = 0;

    $('#viewer').accordion(accObj);   
    queue()
       .defer(d3.json,$SCRIPT_ROOT+'/get_topics?cluster='+$CLUSTER)
       .defer(d3.json,$SCRIPT_ROOT+'/cluster_user_sim?cluster='+$CLUSTER)
       .await(draw);

    function draw(err,data,simres) {
        $TOPIC = data.results.desc;
        var sim = simres.results;
        PROGRESS = sim.progress;
        var root = data.results.topics,
            wordsObj = data.results.words,
            width = $('#chartContainer').width(),
            height = screen.availHeight,
            radius = height * .38,
            center = [width / 2, height / 2],
            radians = 2 * Math.PI,
            topics = Object.keys(root).sort(function(a,b) { return +a.match(/[0-9]+/) - +b.match(/[0-9]+/);}),
            uniqueWords = unique(wordsObj),
            leftArc = d3.scale.linear()
                        .domain([0,uniqueWords.length/2])
                        .range([toRad(105),toRad(255)]),
            rightArc = d3.scale.linear()
                        .domain([uniqueWords.length/2,uniqueWords.length])
                        .range([toRad(285),toRad(435)]),
            line = d3.svg.line()
                    .x(function(d) { return d.x; })
                    .y(function(d) { return d.y; })
                    .interpolate("bundle").tension(0.4);
            simColors = d3.scale.linear()
                            .domain([sim.min,sim.max])
                            .range([colorbrewer.Greens[9][2],colorbrewer.Greens[9][6]])
                            .interpolate(d3.interpolateHcl),
            wordWeightsColor = (function() {
                var m = [99999,0];
                for(var t in root) {
                    for(var w in root[t]) {
                        if(m[0] > root[t][w])
                            m[0] = root[t][w];
                        if(m[1] < root[t][w])
                            m[1] = root[t][w];
                    }
                }
                return d3.scale.linear()
                        .domain(m)
                        .range([colorbrewer.Blues[9][2],colorbrewer.Blues[9][8]])  
                        .interpolate(d3.interpolateHcl);
            })(),
            links = [],
            selectedWords = [],
            selectedTopics = [];

        var rectHeight = radius * 2.2,
            rectWidth = radius * 0.3,
            yScale = d3.scale.linear()
                    .range([center[1]-(rectHeight/2),center[1]+(rectHeight/2)])
                    .domain([0,topics.length]);
       
        selectedWords = selectedWords.concat($TOPIC);
        
        getQuestionsByTopic(selectedTopics.map(function(t) { return +t.match(/[0-9]+/)[0]; }));

        var svg = d3.select("#chartContainer").append("svg")
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform","translate(-120,-55)");
        
       var legend = d3.select('svg').append('g')
            .attr('class','title')
            .attr("transform","translate("+ (width - 200) +","+ (height * .1) +")");
        
        legend.append("g").append("defs")
            .append("linearGradient")
            .attr("id","legend")
            .attr("x1","0%")
            .attr("x2","0%")
            .attr("y1","0%")
            .attr("y2","100%");
    
        legend.append("rect")
            .style("fill","url(#legend)")
            .attr("x",30)
            .attr("y",30)
            .attr("width",30)
            .attr("height",screen.availHeight * .4)
            .style("stroke","black");
        
        legend.append("text")
            .attr("x",45)
            .attr("y",25)
            .style("text-anchor","middle")
            .text("Least Relevant");
        
        legend.append("text")
            .attr("x",45)
            .attr("y",screen.availHeight * .4 + 50)
            .style("text-anchor","middle")
            .text("Most Relevant");

        var radialDiv = legend.append("g")
            .attr("transform","translate(-20,"+(screen.availHeight*.4 + 70)+")")
            .append("foreignObject")
            .attr("width",300)
            .attr("height",screen.availHeight * .4)
            .append("xhtml:div")
            .attr("id","radialDiv");

        radialProgress(radialDiv.node()).label($TOPIC)
            .diameter(150)
            .value(Math.ceil((PROGRESS/sim.count)*100))
            .render();

        var offsetScale = d3.scale.linear().domain([0,10]).range([0,100]);
        var gradColor = d3.scale.ordinal()
                            .domain(d3.range(10))
                            .range(d3.range(10).map(d3.scale.linear()
                                        .domain([sim.min,sim.max])
                                        .range([colorbrewer.Greens[9][2],colorbrewer.Greens[9][6]])));
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



        var node = svg.selectAll(".node")
                        .data(uniqueWords)
                        .enter().append("g")
                        .attr("transform",function(d,i) {
                            var p = pointOnCircle(leftArc,i);
                            if(i >= uniqueWords.length/2) {
                                p = pointOnCircle(rightArc,i);
                            }
                            var tps = findTopicsForWord(d);
                            for(var j = 0; j < tps.length; j++) {
                                var xt = center[0] - (rectWidth / 2);
                                if(i >= uniqueWords.length/2)
                                    xt = center[0] + (rectWidth / 2);
                                var yt = (yScale(tps[j]) + (rectHeight/(topics.length))/2);
                                links.push({
                                    source: {x: p[0], y: p[1]},
                                    target: {x: xt, y: yt},
                                    word: d,
                                    name: 'Topic'+tps[j],
                                });
                            }
                            return "translate("+p[0]+","+p[1]+")";
                        });

        node.append("text")
            .attr("transform", function(d,i) {
                var r = toDeg(leftArc(i)) + 180, t = -40;
                if(i >= uniqueWords.length/2)
                    r = toDeg(rightArc(i)), t = 40;
                return "rotate("+r+")translate("+t+",0)";
            })
            .attr("id",function(d) { return d; })
            .style("text-anchor","middle")
            .style("font-size","smaller")
            .style("cursor","pointer")
            .text(function(d) { return d; })
            .on('mouseover', function(d) {
                if(selectedWords.indexOf(d) > -1)
                    return;
                var tps = Object.keys(wordsObj[d]);
                d3.select(this).style('font-weight','800');
                d3.selectAll(tps.map(function(t) { return '#'+t+'_'+d; }).join(','))
                    .style('stroke',colorbrewer.Blues[9][2])
                    .style('opacity',1);
                d3.selectAll(tps.map(function(t) { return '#slider_'+t; }).join(','))
                    .style("background-color",function(t) {
                        return wordWeightsColor(wordsObj[d][t]);
                    });
            })
            .on('mouseout', function(d) {
                if(selectedWords.indexOf(d) > -1)
                    return;
                var tps = Object.keys(wordsObj[d]);
                d3.select(this).style('font-weight','300');
                d3.selectAll(tps.map(function(t) { return '#'+t+'_'+d; }).join(','))
                    .style('stroke','#ccc')
                    .style('opacity',0.3);
                d3.selectAll(tps.map(function(t) { return '#slider_'+t; }).join(','))
                    .style("background-color",function(t) {
                        return simColors(sim.topics[t]);
                    });
            })
            .on('click', function(d) {
                var idx = selectedWords.indexOf(d);
                var tps = Object.keys(wordsObj[d]);
                if(idx == -1) {
                    selectedWords.push(d);
                    d3.select(this).style('font-weight','800');
                    d3.selectAll(tps.map(function(t) { return '#'+t+'_'+d; }).join(','))
                        .style('stroke',colorbrewer.Blues[9][2])
                        .style('opacity',1);
                    d3.selectAll(tps.map(function(t) { return '#slider_'+t; }).join(','))
                        .style("background-color",function(t) {
                            return wordWeightsColor(wordsObj[d][t]);
                        });
                    session_topics(tps,[d],0);
                    getQuestions(tps.map(function(t) { return +t.match(/[0-9]+/)[0]; }),d,0);
                } else {
                    selectedWords.splice(idx,1);
                    d3.select(this).style('font-weight','300');
                    d3.selectAll(tps.map(function(t) { return '#'+t+'_'+d; }).join(','))
                        .style('stroke','#ccc')
                        .style('opacity',0.3);
                    d3.selectAll(tps.map(function(t) { return '#slider_'+t; }).join(','))
                        .style("background-color",function(t) {
                            return simColors(sim.topics[t]);
                        });
                    session_topics(tps,[d],1);
                    getQuestions(tps.map(function(t) { return +t.match(/[0-9]+/)[0]; }),d,1);
                }
            });
        
        node.append("circle")
            .attr("r",5)
            .style("fill",function(d) {
                return "steelblue";
            });

        var topicWords = svg.append("g").selectAll(".topicWord")
                .data(topics)
                .enter().append("g");

        var div = topicWords.append('foreignObject')
                    .attr("x",center[0]-(rectWidth/2))
                    .attr("y",function(d,i) {
                        return yScale(i);
                    })  
                    .attr("width",rectWidth)
                    .attr("height",rectHeight / (topics.length))
                    .append("xhtml:div")
                    .attr("id",function(d,i) { return "slider_"+d; })
                    .style("height",((rectHeight / (topics.length)) - 4) + "px")
                    .style("line-height",((rectHeight / (topics.length)) - 4) + "px")
                    .style("text-align","center")
                    .style("cursor","pointer")
                    .style('background-color', function(d) {
                        return simColors(sim.topics[d]);
                    })
                    .on('mouseenter', function(d) {
                        if(selectedTopics.indexOf(d) > -1)
                            return;
                        var w = Object.keys(root[d]).filter(function(e) {
                            return selectedWords.indexOf(e) == -1;
                        });
                        d3.select(this).style("background-color","steelblue");
                        d3.selectAll(w.map(function(wl) { return '#'+d+'_'+wl; }).join(','))
                            .style('stroke',function(wl) {
                                return wordWeightsColor(wordsObj[wl.word][wl.name]);
                            })
                            .style('opacity',1);
                        d3.selectAll(w.map(function(wl) { return '#'+wl; }).join(','))
                                .style("font-weight","800");
                    })
                    .on('mouseleave', function(d) {
                        if(selectedTopics.indexOf(d) > -1)
                            return;
                        var w = Object.keys(root[d]).filter(function(e) {
                            return selectedWords.indexOf(e) == -1;
                        });
                        d3.select(this).style("background-color",function(d) {
                            return simColors(sim.topics[d]);
                        });
                        d3.selectAll(w.map(function(wl) { return '#'+d+'_'+wl; }).join(','))
                            .style('stroke','#ccc')
                            .style('opacity',0.3);
                        d3.selectAll(w.map(function(wl) { return '#'+wl; }).join(','))
                            .style("font-weight","300");
                    })
                    .on('click', function(d) {
                        if(block) return;
                        var idx = selectedTopics.indexOf(d);
                        var w = Object.keys(root[d]);
                        if(idx == -1) {
                            selectedTopics.push(d);
                            d3.select(this).style("background-color","steelblue");
                            d3.selectAll(w.map(function(wl) { return '#'+d+'_'+wl; }).join(','))
                                .style('stroke',function(wl) {
                                    return wordWeightsColor(wordsObj[wl.word][wl.name]);
                                })
                                .style('opacity',1);
                            d3.selectAll(w.map(function(wl) { return '#'+wl; }).join(','))
                                .style("font-weight","800");
                            addTopicWords(d,w);
                        } else {
                            selectedTopics.splice(idx,1);
                            d3.select(this).style("background-color",function(d) {
                                return simColors(sim.topics[d]);
                            });
                            d3.selectAll(w.map(function(wl) { return '#'+d+'_'+wl; }).join(','))
                                .style('stroke','#ccc')
                                .style('opacity',0.3);
                            d3.selectAll(w.map(function(wl) { return '#'+wl; }).join(','))
                                .style("font-weight","300");
                            removeTopicWords(w);
                        }
                        getQuestionsByTopic(selectedTopics.map(function(t) { return +t.match(/[0-9]+/)[0]; }));
                    })
                    .append("p")
                    .style("margin","0 auto")
                    .style("font-size","smaller")
                    .style("color","#111111")
                    .html(function(d) { return d; });
        
        var link = svg.selectAll(".link")
                    .data(links)
                    .enter().insert("path",":first-child")
                        .attr("id",function(d) {
                            return d.name+"_"+d.word;
                        })
                        .attr("d", function(d) {
                            return line([{
                                x: d.source.x,
                                y: d.source.y
                            },{
                                x: (d.target.x + d.source.x)/2,
                                y: center[1]
                            },{
                                x: d.target.x,
                                y: d.target.y
                            }]);
                        });
        
        function findTopicsForWord(word) {
            return Object.keys(wordsObj[word]).map(function(d) { return +d.match(/[0-9]+/)[0]; });
        }

        function toRad(deg) {
            return deg * Math.PI / 180;
        }

        function toDeg(rad) {
            return rad * 180 / Math.PI;
        }

        function pointOnCircle(arcInterp,d) {
            var px = center[0] + radius * Math.cos(arcInterp(d));
            var py = center[1] + radius * Math.sin(arcInterp(d));
            return [px,py];
        }

        function addTopicWords(topic,words) {
            selectedWords = selectedWords.concat(words);
            session_topics([topic],selectedWords,0);
        }

        function removeTopicWords(words) {
            for(var i = 0; i < words.length; i++) {
                var idx = selectedWords.indexOf(words[i]);
                if(idx > -1)
                    selectedWords.splice(idx,1);
            }
        }

        function unique(words) {
            var wlist = [];
            for(var w in words) {
                wlist.push({name: w, count: Object.keys(words[w]).length});
            }
            wlist.sort(function(a,b) { return b.count - a.count; });
            var w = [];
            wlist.forEach(function(d) { w.push(d.name); });
            return w;
        }
    }

    $(document).ajaxStart(function() { block = true; spinner.spin(spinTarget); });
    $(document).ajaxComplete(function() { block = false; spinner.stop(); });

    function listQuestions(data) {
        var results = data.results,
            index = 0;

        $('#viewer').empty().accordion("destroy");

        for(var title in results) {
            $('<div>')
                .append($('<div>').addClass("accHeader")
                    .append($('<p>').html(title)))
                .append($('<div>').append($('<div>')
                    .addClass('question')
                    .append(contentBlock(results[title].q)))
                    .append($('<div>')
                    .addClass('answers')
                    .append(acontentBlock(results[title].a))))
            .appendTo('#viewer');
        }

        $('#viewer').accordion(accObj);

        $('pre').addClass("prettyprint");
        
        prettyPrint();

        function contentBlock(obj) {
            return $('<div>').append($('<p>')
                                .html("User ID: "+obj.user_id+
                                    "&nbsp;Votes: "+obj.votes+
                                    "&nbsp;Reputation: "+obj.reputation))
                            .append(parseHtmlBlock(obj.content));
        }

        function acontentBlock(obj) {
            var div = $('<div>');
            for(var i = 0; i < obj.length; i++) {
                div.append($('<div>')
                        .addClass('answerElement')
                        .append(contentBlock(obj[i])));
            }
            return div;
        }

        function parseHtmlBlock(html) {
            html = html.replace(/<\/([a-zA-Z]+)>(\\n)+/g,'');
            html = html.replace(/(\\n)+/g,'<br>');
            html = html.replace(/(<br><br>)+/g,'<br>');
            html = html.replace(/\\"/g,'"');
            html = html.replace(/\\/,'');
            html = html.replace(/""/,'"');
            html = html.replace(/<a/,'<a target="_blank"');
            html = html.replace(/<img/,'<img width="'+$('#viewer').width()*.8+'" height="400" ');
            return html;
        }
    }

    function session_topics(topic,words,act) {
        $.ajax({
            url: $SCRIPT_ROOT+'/visited_topics',
            data: {
                topic: JSON.stringify(topic),
                topicWords: JSON.stringify(words),
                action: act || 0
            },
            method: 'GET'
        });
    }

    function session_visited(vis) {
        $.ajax({
            url: $SCRIPT_ROOT+'/visited',
            data: {
                cluster: $CLUSTER,
                visited: JSON.stringify(vis)
            },
            method: 'GET'
        }).done(function(data) {
            /*radialProgress($('#radialDiv')[0]).label($TOPIC)
                .diameter(150)
                .value(Math.ceil((data.results.progress/data.results.count)*100))
                .render();*/
        });
    }

    function getQuestions(topics,word,action,order) {
        spinner.spin(spinTarget);
        $.ajax({
            url: $SCRIPT_ROOT+'/get_questions',
            data: { 
                cluster: $CLUSTER, 
                topics: JSON.stringify(topics),
                word: word,
                action: action,
                order: order || 'vote',
            },
            method: 'GET',
        }).done(function(data) {
            spinner.stop();
            listQuestions(data);
        });
    }
    
    function getQuestionsByTopic(topics, order) {
        spinner.spin(spinTarget);
        $.ajax({
            url: $SCRIPT_ROOT+'/get_questions_by_topic',
            data: { 
                cluster: $CLUSTER, 
                topic: JSON.stringify(topics),
                order: order || 'vote',
            },
            method: 'GET',
        }).done(function(data) {
            spinner.stop();
            listQuestions(data);
        });
    }
});
