angular.module('promiseApp').directive('d3ptree', d3ptree);

function d3ptree() {

  function getElementInnerSize(element) {
    var styles = window.getComputedStyle(element);
    var paddingW = parseFloat(styles.paddingLeft) +
      parseFloat(styles.paddingRight);

    var paddingH = parseFloat(styles.paddingTop) +
      parseFloat(styles.paddingBottom);

    return [element.clientWidth - paddingW, element.clientHeight - paddingH];
  }

  function link(scope, el, att) {
    var treeModel,

        tree,
        diagonal,
        svg,
        svgGroup,

        graphRoot,
        containerEl,
        width,
        height,
        i,
        duration = 750,
        surfaceSizeFactor,
        zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);



    function init(newData) {
      containerEl = el[0].querySelector('.tree-container');
      width = Math.floor(getElementInnerSize(containerEl)[0]);
      height = Math.floor(getElementInnerSize(containerEl)[1]);
      i=0;
      surfaceSizeFactor = (scope.surfaceSizeFactor && scope.surfaceSizeFactor > 0) ? scope.surfaceSizeFactor : 1;

      tree = d3.layout.tree().size([height*surfaceSizeFactor, width*surfaceSizeFactor]);

      diagonal = d3.svg.diagonal()
        .projection(function(d) {
          return [d.y, d.x];
        });

      d3.select(containerEl).select("svg").remove();

      svg = d3.select(containerEl).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "overlay")
        .call(zoomListener);

      svgGroup = svg.append("g");
      if (newData) initData(newData);
    }

    function zoom() {
      svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }
    function centerNode(source) {
      var scale = zoomListener.scale();
      var x = -source.y0;
      var y = -source.x0;
      x = x * scale + width / 2;
      y = y * scale + height / 2;
      d3.select('g').transition()
        .duration(duration)
        .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
      zoomListener.scale(scale);
      zoomListener.translate([x, y]);
    }


    scope.$watch(function(){
      return scope.surfaceSizeFactor;
    }, function(newVal, oldVal) {
      if (newVal == oldVal) return;
      init(graphRoot);
    });

    scope.$watch(function(){
      return scope.updateTrigger;
    }, function(newVal, oldVal) {
      if (newVal == oldVal) return;
      update(graphRoot);
      centerNode(graphRoot);
    });

    scope.$watch(function(){
      return scope.jsonTree;
    }, function(newVal, oldVal) {
      if (newVal == oldVal) return;
      initData(newVal);
    });


    function initData(model){
      if (!model)
        treeModel = {};

      if (typeof model === "string")
        treeModel = (model) ? JSON.parse(model) : {};

      if (Array.isArray(treeModel)) {
        graphRoot = (treeModel.length>0) ? treeModel[0] : {};
      }
      else {
        graphRoot = treeModel;
      }

      graphRoot.x0 = height / 2;
      graphRoot.y0 = 0;

      update(graphRoot);
      centerNode(graphRoot);
    }

    function update(source) {

      // Compute the new tree layout.
      var nodes = tree.nodes(graphRoot).reverse(),
          links = [];

      tree.links(nodes).forEach(function(link) {
        if (link.target.type !== "Null") {
          links.push(link);
        }
      });

      // Normalize for fixed-depth.
      nodes.forEach(function(d) { d.y = d.depth * 180; });

      // Update the nodes…
      var node = svgGroup.selectAll("g.node")
        .data(nodes, function(d) { return d.id || (d.id = ++i); });


      // Enter any new nodes at the parent's previous position.
      var nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
        .on("click", click);

      nodeEnter
        .append("text")
        .text(function(d) {
          var ret;
          switch (d.valueType) {
            case 0:
              ret = "X";
              break;
            case 1:
            case 2:
              ret = d.value;
              break;
            case 4:
            case 5:
              ret = "Promise";
              break;
          }
          return "#" + d.name + ": " + ret;
        })
        .attr("dy", "2em")
        .attr("stroke", "black")
        .attr("font-style", function(d) {
          if (d.valueType < 1 || d.valueType > 2) {
            return "italic";
          }
          return null;
        });

      nodeEnter
        .append("text")
        .attr("class", "promiseType")
        .attr("dx", 8)
        .attr("dy", 4)
        .attr("fill", "red")
        .text(function(d) {
          d._textNode = this;
          return d.type; });

      nodeEnter
        .filter(function(d){return d.type !== "Null"; })
        .insert("rect", "text")
        .style("fill", function(d) {
          if(!d.invoked){
            return "lightgray";
          }
          switch (d.type) {
            case "Promise":
              return "blue";
              break;
            case "ZonePromise":
              return "Teal";
              break;
            case "Then":
              return "green";
              break;
            case "Catch":
              return "red";
              break;
          }
        })
        .style("stroke", function(d) { return (d.valueType == 2) ? "red" : null;})
        .style("stroke-width", function(d) { return (d.valueType == 2) ? 2 : null;})
        .attr("width", function(d) {return d._textNode.getComputedTextLength() + 16;})
        .attr("height", "24")
        .attr("y", "-12")
        .attr("rx", 4)
        .attr("ry", 4);


      // Transition nodes to their new position.
      var nodeUpdate = node.transition()
        .duration(duration)
        .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

      nodeUpdate.select("text")
        .style("fill-opacity", 1);

      // Transition exiting nodes to the parent's new position.
      var nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
        .remove();

      nodeExit.select("circle")
        .attr("r", 1e-6);

      nodeExit.select("text")
        .style("fill-opacity", 1e-6);

      // Update the links…
      var link = svgGroup.selectAll("path.link")
        .data(links, function(d) { return d.target.id; });

      // Enter any new links at the parent's previous position.
      link.enter()
        .insert("path", "g")
        .attr("class", "link")
        .attr("stroke-dasharray", function(d) {
          return (!d.target.invoked) ? [5,5] : null;
        })
        .attr("d", function(d) {
          var o = {x: source.x0, y: source.y0};
          return diagonal({source: o, target: o});
        })
        .style("stroke", function(d) {
          if(!d.target.invoked){
            return "lightgray";
          }

          switch (d.target.type) {
            case "Promise":
              return "blue";
              break;
            case "PromiseFlow":
              return "YellowGreen";
              break;
            case "ZonePromise":
              return "darkblue";
              break;
            case "Then":
              return "green";
              break;
            case "Catch":
              return "red";
              break;

          }
        });

      // Transition links to their new position.
      link.transition()
        .duration(duration)
        .attr("d", diagonal);

      // Transition exiting nodes to the parent's new position.
      link.exit().transition()
        .duration(duration)
        .attr("d", function(d) {
          var o = {x: source.x, y: source.y};
          return diagonal({source: o, target: o});
        })
        .remove();

      // Stash the old positions for transition.
      nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    // Toggle children on click.
    function click(d) {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
      update(d);
      centerNode(d);
    }

    init(scope.jsonTree);
  }

  return {
    "restrict": "E",
    "scope": {
      "jsonTree": "=jsonTree",
      "surfaceSizeFactor": "=surfaceSizeFactor",
      "updateTrigger": "=updateTrigger"
    },
    "templateUrl": "app/d3ptreeTemplate.html",
    "link": link
  }
}
