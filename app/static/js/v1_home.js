$(function() {

    var accObj = {
        header: '> div > .accHeader',
        collapsible: true,
        active: false,
        heightStyle: "content",
    };

    var spinner = new Spinner({
      lines: 13, length: 20, 
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

    $('#viewer').accordion(accObj);    
    $.getJSON($SCRIPT_ROOT+'/get_topics?cluster='+$CLUSTER,draw);

    function draw(data) {
        $TOPIC = data.results.desc;
        var root = data.results.topics,
            matrix = data.results.matrix,
            wordsObj = data.results.words,
            width = $('#chartContainer').width(),
            height = screen.availHeight,
            radius = height * .38,
            center = [width / 2, height / 2],
            radians = 2 * Math.PI,
            topics = Object.keys(root).sort(function(a,b) { return +a.match(/[0-9]+/) - +b.match(/[0-9]+/);}),
            uniqueWords = unique(wordsObj),
            leftarc = d3.scale.linear()
                        .domain([0,topics.length/2])
                        .range([torad(120),torad(240)]),
            rightarc = d3.scale.linear()
                        .domain([topics.length/2,topics.length])
                        .range([torad(300),torad(420)]),
            line = d3.svg.line()
                    .x(function(d) { return d.x; })
                    .y(function(d) { return d.y; })
                    .interpolate("bundle").tension(0.4);
            sources = [],
            links = []
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
                        .range(["lightgreen","green"])  
                        .interpolate(d3.interpolateLab);
            })(),
            selectedWords = [],
            selectedTopics = [];

        selectedWords = selectedWords.concat($TOPIC);
        
        //getQuestions(selectedWords); 

        var svg = d3.select("#chartContainer").append("svg")
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform","translate(-150,-50)");

        d3.select('svg').append('g')
            .attr('class','title')
            .attr("transform","translate("+ (width - 200) +","+ (height / 2 - 50) +")")
            .append("foreignObject")
            .attr("width",150)
            .attr("height",150)
            .append('xhtml:div')
            .append("p")
            .html("Topic Overview: <br>"+$TOPIC);

        var node = svg.selectAll(".node")
                        .data(topics)
                        .enter().append("g")
                        .attr("transform",function(d,i) {
                            var p = pointOnCircle(leftArc,i);
                            if(i >= topics.length/2) {
                                p = pointOnCircle(rightArc,i);
                            }
                            sources.push({x: p[0], y: p[1]});
                            return "translate("+p[0]+","+p[1]+")";
                        })
                        .on('mouseover', function(d) {
                        })
                        .on('mouseout', function(d) {
                        });


        node.append("text")
            .attr("transform", function(d,i) {
                var r = toDeg(leftArc(i)) + 180;
                var t = -40;
                if(i >= topics.length/2) {
                    r = toDeg(rightArc(i));
                    t = 40;
                }
                return "rotate("+r+")translate("+t+",0)";
            })
            .attr("id",function(d) { return d; })
            .style("text-anchor","middle")
            .style("font-size","smaller")
            .style("cursor","pointer")
            .text(function(d) { return d; })
            .on('mouseover', function(d) {
                var w = Object.keys(root[d]).filter(function(wl) { 
                    return (selectedWords.indexOf(wl) == -1);
                });
                if(selectedTopics.indexOf(d) == -1) 
                    d3.select(this).style('font-weight','bold');
                d3.selectAll(w.map(function(wl) { return '#'+d+'_'+wl; }).join(','))
                    .style('stroke',function(wl) {
                        return wordWeightsColor(root[wl.name][wl.word]);
                    })
                    .style('opacity',0.9);
                d3.selectAll(w.map(function(wl) { return '#slider_'+wl; }).join(','))
                    .style("background-color",function(wl) {
                        return wordWeightsColor(root[d][wl]);
                    });
            })
            .on('mouseout', function(d) {
                var w = Object.keys(root[d]).filter(function(wl) { 
                    return (selectedWords.indexOf(wl) == -1);
                });
                if(selectedTopics.indexOf(d) == -1) 
                    d3.select(this).style('font-weight','normal');
                d3.selectAll(w.map(function(wl) { return '#'+d+'_'+wl; }).join(','))
                    .style('stroke',function(wl) {
                        return "#ccc";
                    })
                    .style('opacity',0.3);
                d3.selectAll(w.map(function(wl) { return '#slider_'+wl; }).join(','))
                    .style("background-color",function(wl) {
                        return "white";
                    });
            })
            .on('click', function(d) {
                if(block) return;
                var idx = selectedTopics.indexOf(d);
                var w = Object.keys(root[d]);
                if(idx == -1) {
                    selectedTopics.push(d);                  
                    d3.select(this).style('font-weight','bold');
                    d3.selectAll(w.map(function(wl) { return '#'+d+'_'+wl; }).join(','))
                        .style('stroke',function(wl) {
                            return wordWeightsColor(root[wl.name][wl.word]);
                        })
                        .style('opacity',0.9);
                    d3.selectAll(w.map(function(wl) { return '#slider_'+wl; }).join(','))
                        .style("background-color",function(wl) {
                            return wordWeightsColor(root[d][wl]);
                        });
                    addTopicWords(d);
                } else {
                    selectedTopics.splice(idx,1);
                    d3.select(this).style('font-weight','normal');
                    d3.selectAll(w.map(function(wl) { return '#'+d+'_'+wl; }).join(','))
                        .style('stroke',function(wl) {
                            return "#ccc";
                        })
                        .style('opacity',0.3);
                    d3.selectAll(w.map(function(wl) { return '#slider_'+wl; }).join(','))
                        .style("background-color",function(wl) {
                            return "white";
                        });
                    removeTopicWords(d);
                }
                getQuestionsByTopic(+d.match(/[0-9]+/)[0]);
            });


        var rectHeight = height *.85,
            rectWidth = radius * .7,
            yScale = d3.scale.linear()
                    .range([center[1]-(rectHeight/2),center[1]+(rectHeight/2)])
                    .domain([0,uniqueWords.length]);
        
        uniqueWords.forEach(function(d,e) {
            var tps = findTopicsForWord(d);
            for(var i = 0; i < tps.length; i++) {
                var s = sources[tps[i]];
                var x = center[0] - (rectWidth / 2);
                if(tps[i] >= topics.length/2)
                    x = center[0] + (rectWidth / 2);
                var y = (yScale(e) + (rectHeight/(uniqueWords.length))/2);
                links.push({source: s, target: { x: x, y: y }, name: 'Topic'+tps[i], word: d});
            }
        });

        var topicWords =  svg.append("g").selectAll(".topicword")
            .data(uniqueWords)
            .enter().append("g");

        var toggleClick = true,
            fontScale = d3.scale.linear()
                            .domain([30,100])
                            .range([12,6]);
        var div = topicWords.append('foreignObject')
            .attr("x",center[0]-(rectWidth/2))
            .attr("y",function(d,i) {
                return yScale(i);
            })
            .attr("width", rectWidth)
            .attr("height",rectHeight / (uniqueWords.length))
            .append("xhtml:div")
            .attr("id",function(d,i) { return "slider_"+d; })
            .style("height",((rectHeight / (uniqueWords.length)) - 2) + "px")
            .style("text-align","center")
            .style("cursor","pointer")
            .attr("id",function(d) {
                return "slider_"+d;
            })
            .on('mouseenter', function(d) {
                if(selectedWords.indexOf(d) > -1)
                    return;
                d3.select(this).style("background-color","lightgreen");
                var t = Object.keys(wordsObj[d]);
                d3.selectAll(t.map(function(tl) { return '#'+tl+'_'+d; }).join(','))
                    .style('stroke',function(tl) {
                        return wordWeightsColor(wordsObj[tl.word][tl.name]);
                    })
                    .style('opacity',0.9);
            })
            .on('mouseleave', function(d) {
                if(selectedWords.indexOf(d) > -1)
                    return;
                d3.select(this).style("background-color","white");
                var t = Object.keys(wordsObj[d]);
                d3.selectAll(t.map(function(tl) { return '#'+tl+'_'+d; }).join(','))
                    .style('stroke','#ccc')
                    .style('opacity',0.3);
            })
            .on('click', function(d) {
                if(block) return;
                var idx = selectedWords.indexOf(d);
                if(idx == -1) {
                    selectedWords.push(d);
                    d3.select(this).style("background-color","lightgreen");
                    var t = Object.keys(wordsObj[d]);
                    d3.selectAll(t.map(function(tl) { return '#'+tl+'_'+d; }).join(','))
                        .style('stroke',function(tl) {
                            return wordWeightsColor(wordsObj[tl.word][tl.name]);
                        })
                        .style('opacity',0.9);
                } else {
                    selectedWords.splice(idx,1);
                    d3.select(this).style("background-color","white");
                    var t = Object.keys(wordsObj[d]);
                    d3.selectAll(t.map(function(tl) { return '#'+tl+'_'+d; }).join(','))
                        .style('stroke',"#ccc")
                        .style('opacity',0.3);
                }
                getQuestions(selectedWords);
            })
            .append("p")
                .style("margin","0 auto")
                .style("font-size",fontScale(uniqueWords.length) + "px")
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
        
        node.append("circle")
            .attr("r",5)
            .style("fill",function(d) {
                return "green";
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

        function addTopicWords(d) {
            var words = Object.keys(root[d]);
            selectedWords = selectedWords.concat(words);
        }

        function removeTopicWords(d) {
            var words = Object.keys(root[d]);
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
                    .append(parseHtmlBlock(results[title].q)))
                    .append($('<div>')
                    .addClass('answers')
                    .append(parseAnswers(results[title].a))))
            .appendTo('#viewer');
        }

        $('#viewer').accordion(accObj);

        $('pre').addClass("prettyprint");
        
        prettyPrint();

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

        function parseAnswers(answers) {
            var div = $('<div>');
            for(var i = 0; i < answers.length; i++) {
                div.append($('<div>')
                        .addClass('answerElement')
                        .append(parseHtmlBlock(answers[i])));
            }
            return div;
        }
    }


    function getQuestions(words) {
        spinner.spin(spinTarget);
        $.ajax({
            url: $SCRIPT_ROOT+'/get_questions',
            data: { cluster: $CLUSTER, wordlist: JSON.stringify(words) },
            method: 'GET',
        }).done(function(data) {
            spinner.stop();
            listQuestions(data);
        });
    }
    
    function getQuestionsByTopic(topicNum) {
        spinner.spin(spinTarget);
        $.ajax({
            url: $SCRIPT_ROOT+'/get_questions_by_topic',
            data: { cluster: $CLUSTER, topic: topicNum },
            method: 'GET',
        }).done(function(data) {
            spinner.stop();
            listQuestions(data);
        });
    }
});
