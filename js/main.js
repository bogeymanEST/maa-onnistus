//
//  main.js
//
//  A project template for using arbor.js
//
function merge_objects(base, override) {
    var obj3 = {};
    for (var attrname in base) {
        obj3[attrname] = base[attrname];
    }
    for (var attrname in override) {
        if(typeof obj3[attrname] == "object" && typeof override[attrname] == "object") { //Recursive merge
            obj3[attrname] = merge_objects(obj3[attrname], override[attrname]);
            continue;
        }
        obj3[attrname] = override[attrname];
    }
    return obj3;
}
var canvas = document.getElementById('viewport');

function shadeColor(color, percent) {

    var col = arbor.colors.decode(color);
    var R = col.r;
    var G = col.g;
    var B = col.b;

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    return arbor.colors.encode({r: R, g: G, b: B});
}

(function ($) {

    var Renderer = function (canvas) {
        var canvas = $(canvas).get(0);
        var ctx = canvas.getContext("2d");
        var particleSystem;
        const defaultNode = {
            font: "25pt 'Open Sans'", //The text font
            color: "black", //The color of the text
            text: "No text", //Displayed text
            hPad: 15, //Vertical(height) padding
            wPad: 30, //Horizontal(width) padding
            height: 25, //Height of the text

            //The background rectangle
            rectangle: {
                color: "#aaaaaa",
                stroke: {
                    width: 1,
                    color: "black"
                }
            },
            click: {
                toggled: false
            }
        };

        const defaultEdge = {
            width: 1,
            color: "rgba(0, 0, 0, 0.5)",
            length: 1,
            text: "xd", //Description (string)
            showText: false //Show description
        };
        var lastDoubleClick = null;
        var that = {
            init: function (system) {
                $(window).resize(that.resize);
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                system.screenSize(window.innerWidth, window.innerHeight);
                //
                // the particle system will call the init function once, right before the
                // first frame is to be drawn. it's a good place to set up the canvas and
                // to pass the canvas size to the particle system
                //
                // save a reference to the particle system for use in the .redraw() loop
                particleSystem = system;

                // inform the system of the screen dimensions so it can map coords for us.
                // if the canvas is ever resized, screenSize should be called again with
                // the new dimensions
                particleSystem.screenSize(canvas.width, canvas.height);
                particleSystem.screenPadding(80); // leave an extra 80px of whitespace per side

                // set up some event handlers to allow for node-dragging
                that.initMouseHandling()
            },
            /**
             * Make a rectangle with text inside
             * @param data The data {font, color, wPad, hPad, height, rectangle{color, stroke{color, width}}}
             * @param pos The position {x, y}. X and Y point to the center of the rectangle
             */
            makeRect: function (data, pos) {
                ctx.font = data.font;

                var metrics = ctx.measureText(data.text);
                var wPad = data.wPad;
                var hPad = data.hPad;
                var w = metrics.width + wPad;
                var h = data.height + hPad;
                var ps = {
                    x: pos.x - w / 2,
                    y: pos.y + h / 2,
                    w: w,
                    h: h
                };

                if (data.rectangle) {
                    var p = {
                        x: ps.x - wPad / 2,
                        y: ps.y - ps.h + hPad / 2,
                        w: ps.w,
                        h: ps.h
                    };
                    ctx.beginPath();
                    ctx.fillStyle = data.rectangle.color;
                    ctx.rect(p.x, p.y, p.w, p.h);
                    ctx.fill();
                    if (data.rectangle.stroke) {
                        ctx.lineWidth = data.rectangle.stroke.width;
                        ctx.strokeStyle = data.rectangle.stroke.color;

                        ctx.stroke();
                    }
                }

                ctx.fillStyle = data.color;
                ctx.fillText(data.text, ps.x, ps.y);
            },
            resize: function () {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                particleSystem.screen({size: {width: canvas.width, height: canvas.height}});
                that.redraw();
            },
            redraw: function () {
                //
                // redraw will be called repeatedly during the run whenever the node positions
                // change. the new positions for the nodes can be accessed by looking at the
                // .p attribute of a given node. however the p.x & p.y values are in the coordinates
                // of the particle system rather than the screen. you can either map them to
                // the screen yourself, or use the convenience iterators .eachNode (and .eachEdge)
                // which allow you to step through the actual node objects but also pass an
                // x,y point in the screen's coordinate system
                //
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.font = "10pt 'Open Sans'";
                ctx.fillStyle = "black";
                ctx.fillText("Right-click to explore. Drag to move nodes. Double-click to show description.", 0, 20);

                particleSystem.eachEdge(function (edge, pt1, pt2) {
                    // edge: {source:Node, target:Node, length:#, data:{}}
                    // pt1:  {x:#, y:#}  source position in screen coords
                    // pt2:  {x:#, y:#}  target position in screen coords

                    // draw a line from pt1 to pt2
                    var data = merge_objects(defaultEdge, edge.data);
                    ctx.strokeStyle = data.color;
                    ctx.lineWidth = data.width;
                    ctx.beginPath();
                    ctx.moveTo(pt1.x, pt1.y);
                    ctx.lineTo(pt2.x, pt2.y);
                    ctx.stroke();

                    if (data.showText && data.text) {
                        var p = {
                            x: Math.abs((pt2.x + pt1.x) / 2),
                            y: Math.abs((pt2.y + pt1.y) / 2)
                        };
                        var d = merge_objects(defaultNode, {
                            color: "black",
                            font: "10pt 'Open Sans'",
                            height: 10,
                            text: data.text,
                            rectangle: {
                                color: "#77aa77",
                                stroke: {
                                    width: 1,
                                    color: "black"
                                }
                            }
                        });
                        that.makeRect(d, p);
                    }
                });

                particleSystem.eachNode(function (node, pt) {
                    // node: {mass:#, p:{x,y}, name:"", data:{}}
                    // pt:   {x:#, y:#}  node position in screen coords

                    var data = merge_objects(defaultNode, node.data);
                    var pos = {
                        x: pt.x,
                        y: pt.y
                    };
                    that.makeRect(data, pos);
                })
            },

            killChildren: function (node) {
                if (!node) return;
                var data = node.data.click;
                if (!data) return;
                if (data.nodes) {
                    data.nodes.forEach(function (e) {
                        if (!e.node) return;
                        if(!e.node.click)
                            e.node.click = {};
                        e.node.click.toggled = false;
                        that.killChildren(e.node);
                        particleSystem.pruneNode(e.node);
                    });
                }
            },
            initMouseHandling: function () {
                // no-nonsense drag and drop (thanks springy.js)
                var dragged = null;

                // set up a handler object that will initially listen for mousedowns then
                // for moves and mouseups while dragging
                var handler = {
                    clicked: function (e) {
                        var pos = $(canvas).offset();
                        var mPos = arbor.Point(e.pageX - pos.left, e.pageY - pos.top);
                        var nearest = particleSystem.nearest(mPos);
                        if (!nearest) return;
                        if (!nearest.node) return;
                        if (e.which === 1) { //Left-click
                            dragged = nearest;

                            $(canvas).bind('mousemove', handler.dragged);
                            $(window).bind('mouseup', handler.dropped);
                        } else if (e.which === 3) { //Right-click
                            if (nearest.distance > 100) return;
                            var data = nearest.node.data.click;
                            if (!data) return;
                            if (data.nodes) {
                                data.nodes.forEach(function (e) {
                                    if (data.toggled) {
                                        that.killChildren(e.node);
                                        particleSystem.pruneNode(e.node);
                                        if(!e.click)
                                            e.click = {};
                                        e.click.toggled = false;
                                    } else {
                                        var d = merge_objects(defaultNode, e);
                                        d.x = nearest.node.p.x;
                                        d.y = nearest.node.p.y;
                                        e.node = particleSystem.addNode(e.name, d);
                                    }
                                });
                            }
                            if (data.edges) {
                                data.edges.forEach(function (e) {
                                    if (data.toggled)
                                        particleSystem.pruneEdge(e.edge);
                                    else {
                                        var d = merge_objects(defaultEdge, e);
                                        e.edge = particleSystem.addEdge(e.source, e.target, d);
                                    }
                                });
                            }
                            data.toggled = !data.toggled;
                            e.preventDefault();
                        }
                    },
                    dragged: function (e) {
                        var pos = $(canvas).offset();
                        var s = arbor.Point(e.pageX - pos.left, e.pageY - pos.top);

                        if (dragged && dragged.node !== null) {
                            dragged.node.p = particleSystem.fromScreen(s);
                        }
                    },

                    dropped: function () {
                        if (dragged === null || dragged.node === undefined) return;
                        if (dragged.node !== null) dragged.node.fixed = false;
                        dragged.node.tempMass = 1000;
                        dragged = null;
                        $(canvas).unbind('mousemove', handler.dragged);
                        $(window).unbind('mouseup', handler.dropped);
                    },
                    doubleclick: function (e) {
                        var pos = $(canvas).offset();
                        var mPos = arbor.Point(e.pageX - pos.left, e.pageY - pos.top);
                        var nearest = particleSystem.nearest(mPos);
                        if (!nearest.node) return;
                        if (nearest.distance > 100) return;
                        particleSystem.eachEdge(function (edge) {
                            edge.data.showText = false;
                        });
                        if(!lastDoubleClick || (lastDoubleClick.node != nearest.node || lastDoubleClick.result == false)) {
                            var edges = particleSystem.getEdgesFrom(nearest.node).concat(particleSystem.getEdgesTo(nearest.node));
                            for (var i=0; i < edges.length; i++) {
                                var edge = edges[i];
                                if(!edge.data.text) continue;
                                edge.data.showText = true;
                                lastDoubleClick = {node: nearest.node, result: true};
                            }
                            return;
                        }
                        lastDoubleClick = {node: nearest.node, result: false};

                    }
                };

                // start listening
                $(canvas).mousedown(handler.clicked);
                $(canvas).dblclick(handler.doubleclick);
            }

        };
        return that
    };

    $(document).ready(function () {
        $.get("data/data.yml", function (data) {
            var sys = arbor.ParticleSystem(100, 900, 0.2); // create the system with sensible repulsion/stiffness/friction
            sys.parameters({gravity: true}); // use center-gravity to make the graph settle nicely (ymmv)
            sys.renderer = Renderer("#viewport"); // our newly created renderer will have its .init() method called shortly by sys...;
            sys.screenSize(window.innerWidth, window.innerHeight);
            document.onresize = function () {
                sys.screenSize(window.innerWidth, window.innerHeight);
            };
            data = jsyaml.load(data);
            sys.graft(data);
        }, "text");

    })

})(jQuery);