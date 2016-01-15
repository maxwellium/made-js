/**
 * @author Arne Simon [arne.simon@slice-dice.de]
 * @author Max Fielker [max.fielker@slice.dice.de]
 */
function Workflow(made, modtype, flow) {
    return {
        name: flow.name,
        doc: flow.doc,
        states: flow.states,
        transitions: flow.transitions,
        init: function() {
            var me = {
                ctx: null,
                name: flow.name,
                doc: flow.doc,
                states: flow.states,
                transitions: flow.transitions,
                onupdate: null
            };
            var rpcs = made.services[modtype].rpcs;

            me.step = function() {
                rpcs.workflow_step(me.ctx)
                    .then(function(result) {
                        if(LOGGING) console.log('made-workflow-ctx:', result.data);

                        me.ctx = result.data;

                        if(me.onupdate) {
                            me.onupdate(result);
                        }
                    });
            };

            me.start = function() {
                rpcs.workflow_start(flow.name)
                    .then(function(result) {
                        if(LOGGING) console.log('made-workflow-ctx:', result.data);

                        me.ctx = result.data;

                        if(me.onupdate) {
                            me.onupdate(result);
                        }
                    });
            };

            me.html = function(prefix) {
                if(me.ctx) {
                    if(me.ctx.template) {
                        return me.ctx.template;
                    }
                    else {
                        return buildhtml(me.ctx.data, prefix + '.ctx.data.');
                    }
                }

                return '';
            };

            return me;
        }
    };
}
