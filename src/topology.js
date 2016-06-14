/**
 * @author Arne Simon [arne.simon@slice-dice.de]
 * @author Max Fielker [max.fielker@slice.dice.de]
 */


/**
 * http://briantford.com/blog/angular-d3
 * https://www.dashingd3js.com/d3-resources/d3-and-angular
 */
export function topology() {
    var width = 640;
    var height = 480;
    var color = d3.scale.category20();
    var force = d3.layout.force()
        .charge(-120)
        .linkDistance(60)
        .size([width, height]);


    return {
        restrict: 'E',
        scope: {
          data: '='
        },
        link: function (scope, element) {
            var svg = d3.select(element[0])
                .append('svg')
                .attr('width', width)
                .attr('height', height);
            var nodes = null;
            var links = null;

            scope.$watch('data', function (newVal) {
                console.log('made-topology nodes', newVal);

                svg.selectAll('*').remove();

                if (!newVal) {
                    return;
                }

                nodes = newVal.nodes;
                links = newVal.links;

                force.nodes(nodes);
                force.links(links);
                force.start();

                var link = svg.selectAll('.topology-link')
                  .data(links)
                .enter().append('line')
                  .attr('class', 'topology-link');

                var node = svg
                    .selectAll('.topology-node')
                    .data(nodes)
                    .enter().append('circle')
                    .attr('class', 'topology-node')
                    .attr('r', 15)
                    .style('fill', function(d) { return color(d.type); })
                    .call(force.drag);

                force.on('tick', function() {
                    link.attr('x1', function(d) { return d.source.x; })
                        .attr('y1', function(d) { return d.source.y; })
                        .attr('x2', function(d) { return d.target.x; })
                        .attr('y2', function(d) { return d.target.y; });

                    node.attr('cx', function(d) { return d.x; })
                        .attr('cy', function(d) { return d.y; });
                });

            });

        }
    };
}


export function topologyLegend() {
    var color = d3.scale.category20();

    return {
        restrict: 'E',
        scope: {
          data: '='
        },
        link: function (scope, element) {
            var list = d3.select(element[0]).append('div');

            scope.$watch('data', function (newVal) {
                console.log('made-topology-legend nodes', newVal);

                list.selectAll('*').remove();

                if (!newVal) {
                    return;
                }

                list
                    .selectAll('div')
                    .data(newVal.nodes)
                    .enter().append('div')
                    .text(function(d){ return d.type; })
                    .append('div')
                    .attr('class', 'topology-legend-box')
                    .style('background-color', function(d){ return color(d.type); });
            });
        }
    };
}
