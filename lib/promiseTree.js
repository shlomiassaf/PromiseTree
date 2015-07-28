;
(function (context, name, definition) {
    if (typeof module != 'undefined' && module.exports) {
        module.exports = definition(context);
    }
    else if (typeof define == 'function' && define.amd) {
        define(definition(context));
    }
    else {
        context[name] = definition(context);
    }
}(this, 'promiseTree', function (context) {
    var OriginalPromise = Promise;
    var counter = 0;
    var roots = {};
    var debug = debug = function () {
    }; //console.log;


    /**
     * A unique object to be used in function tree search for a promise parent.
     */
    var verificationMatchRef = Object.create(null);

    var NodeTypeType = {
        Promise: "Promise",
        ZonePromise: "ZonePromise",
        PromiseFlow: "PromiseFlow",
        Then: "Then",
        "Catch": "Catch",
        "Null": "Null"
    };

    var ValueType = {
        // 0 = not resolved, 1 = value, 2 = error, 5 = resolve promise , 6 = reject promise
        RESOLVE: 1,
        REJECT: 2,
        PROMISE: 4,
        ERROR_SKIP: 8
    };

    /**
     * Represents a Node in the tree of nodes.
     * Each PromiseNode holds metadata about the promise.
     * Each PromiseNode might also be the root of a tree of Promise nodes.
     */
    var PromiseNode = (function () {
        function PromiseNode(id, type, parent) {

            this.id = id;
            this.type = type;
            this.parent = parent;
            this.calledFrom = undefined;
            this.children = [];
            this.stepChildren = undefined;

            this.invoked = false;

            this.startTime = undefined;
            this.endTime = undefined;

            this.valueType = 0;
            this.value = undefined;

            if (parent) {
                parent.children.push(this);
            }
        }

        PromiseNode.createNullNode = function (parent) {
            var node = new PromiseNode(NaN, NodeTypeType.Null, parent);
            return node;
        };

        PromiseNode.prototype.toGraphObject = function () {
            var output = {
                id: this.id,
                type: this.type,
                startTime: this.startTime,
                endTime: this.endTime,
                calledFrom: this.calledFrom,
                value: (this.valueType & ValueType.PROMISE) ? this.value.$$visualNode : this.value,
                valueType: this.valueType
            };

            if (this.child)
                output.child = this.child.toGraphObject();

            if (this.stepChildren && this.stepChildren.length > 0) {
                output.stepChildren = [];
                this.stepChildren.forEach(function (sc) {
                    output.stepChildren.push(sc.toGraphObject());
                });
            }

            return output;
        };
        PromiseNode.prototype.toD3Tree = function () {
            var output = {
                name: this.id,
                type: this.type,
                invoked: this.invoked,
                startTime: this.startTime,
                endTime: this.endTime,
                calledFrom: this.calledFrom,
                value: (this.value && this.value.$$visualNode) ? this.value.$$visualNode.id : this.value,
                valueType: this.valueType,
                children: []
            };

            this.children.forEach(function (c) {
                var cD3 = c.toD3Tree();
                cD3.parent = this.id;
                output.children.push(cD3);
            });


            if (this.stepChildren && this.stepChildren.length > 0) {
                this.stepChildren.forEach(function (sc) {
                    output.children.push(sc.toD3Tree());
                });
            }

            return output;
        };
        PromiseNode.prototype.setValue = function (value, valueType) {
            this.value = value;
            this.valueType = valueType;
        };
        Object.defineProperty(PromiseNode.prototype, "getHead", {
            get: function () {
                var node = this;
                while (node.parent) {
                    node = node.parent;
                }
                return node;
            }
        });
        return PromiseNode;
    })();


    function PromiseWrapper(resolver, parentHint) {

        function isPromise(promise) {
            return promise instanceof OriginalPromise;
        }

        function wrapPromise(promise) {
            promise.then = thenWrapper.bind(promise);
            promise.catch = catchWrapper.bind(promise);
        }

        function paintPromise(promise, type, parent, isRoot) {
            if (promise.$$visualNode && parent) {
                /*  If we have a visualNode present in the promise, it is a promise we already marked.
                 This is of a promise returned within a Then implementation.
                 If we got here, it means we are in the tail of a new Promise sequence.
                 A tail can be the promise itself (visual === head) or the last promise in a sequence.

                 var x = new Promise(function(resolve, reject) {resolve(100);}); // x is the head and the tail.
                 var y = x.then(function(value) {return value +1;});             // x is the head, y is the tail.

                 In the example above, if promise.$$visualNode is x, then its a promise returned from a then implementation
                 that does not contain any tail, if promise.$$visualNode is y, then head is x and the tail is y;
                 */
                var head = promise.$$visualNode.getHead;
                var tail = promise.$$visualNode;
                head.type = type;


                // The parent is the container that invoked the head in the first place.
                // The parent also points to a set of children which are in fact the children of tail.
                // we need to merge the flow to its actual condition
                while (parent.$$visualNode.children.length > 0) {
                    tail.children.push(parent.$$visualNode.children.shift());
                }
                parent.$$visualNode.children.push(head);

                // since the head of this FPromise is a DPromise, it is registered as root by default, remove it.
                if (head.stepParent) { // check if the stepParent exist, if so it should hold the DPromise since we add it by default, remove it.
                    var idx = head.stepParent.stepChildren.indexOf(head);
                    if (idx > -1) {
                        tail.children.push(head.stepParent.stepChildren[idx]);
                        head.stepParent.stepChildren.splice(idx, 1);
                    }
                }
                delete roots[head.id];
            }
            else {
                promise.$$visualNode = new PromiseNode(counter++, type, (parent) ? parent.$$visualNode : null);
                promise.$$visualNode.startTime = new Date();
                if (isRoot === true) {
                    roots[promise.$$visualNode.id] = promise.$$visualNode;
                }
            }
        }

        function markCatch(catchNode, err) {
            if (catchNode.type == NodeTypeType.Catch) {
                catchNode.value = err;
            }
            else {
                catchNode.valueType = ValueType.ERROR_SKIP;
                markCatchDeep(catchNode, err);
            }
        }

        function markCatchDeep(node, err) {
            node.children.forEach(function (catchNode) {
                markCatch(catchNode, err);
            });
        }

        function thenWrapper(thenFn, catchFn) {
            var returnPromise = thenPromise.call(this, function () {
                alert(returnPromise.$$visualNode.id);
                var returnThen;
                try {
                    if (returnPromise.$$visualNode.valueType == ValueType.ERROR_SKIP) {
                        return arguments[0];
                    }
                    else if (returnPromise.$$visualNode.type == NodeTypeType.Catch) {
                        if (returnPromise.$$visualNode.value) {
                            arguments[0] = returnPromise.$$visualNode.value;
                        }
                        else {
                            return arguments[0];
                        }
                    }
                    returnPromise.$$visualNode.invoked = true;
                    returnThen = thenFn.apply(this, arguments);
                }
                catch (err) {
                    returnPromise.$$visualNode.valueType = ValueType.REJECT;
                    markCatchDeep(returnPromise.$$visualNode, err);
                    //TODO: console.log('Warning: Missing catcher, see #' + returnPromise.$$visualNode.id);

                    return undefined;
                }

                returnPromise.$$visualNode.setValue(returnThen, ValueType.RESOLVE);
                if (isPromise(returnThen)) {
                    wrapPromise(returnThen);
                    paintPromise(returnThen, NodeTypeType.Promise, returnPromise);
                    returnPromise.$$visualNode.valueType += ValueType.PROMISE;
                }

                returnPromise.$$visualNode.endTime = new Date();


                return returnThen;

            }.bind(this));


            wrapPromise(returnPromise);
            paintPromise(returnPromise, NodeTypeType.Then, this);
            returnPromise.$$visualNode.calledFrom = new Error().stack.split('\n')[2];

            if (this.$$visualNode && (this.$$visualNode.valueType == ValueType.REJECT || this.$$visualNode.valueType == ValueType.ERROR_SKIP)) {
                markCatch(returnPromise.$$visualNode, returnPromise.$$visualNode.value);
            }

            if (catchFn) {
                var returnCatch = returnPromise.catch(catchFn);
                returnCatch.$$visualNode.calledFrom = returnPromise.$$visualNode.calledFrom;
                return returnCatch;
            }


            return returnPromise;
        }

        function catchWrapper(catchFn) {
            var returnPromise = thenWrapper.call(this, catchFn);

            returnPromise.$$visualNode.type = NodeTypeType.Catch;
            returnPromise.$$visualNode.calledFrom = new Error().stack.split('\n')[2];

           // alert(this.$$visualNode.id + "  -   " + this.$$visualNode.valueType);
            if (this.$$visualNode && (this.$$visualNode.valueType == ValueType.REJECT || this.$$visualNode.valueType == ValueType.ERROR_SKIP)) {
                markCatch(returnPromise.$$visualNode, returnPromise.$$visualNode.value);
            }

            return returnPromise;
        }

        function onResolve(value) {
            debug("Resolved Promise #" + this.promise.$$visualNode.id);
            this.promise.$$visualNode.setValue(value, ValueType.RESOLVE);
            this.promise.$$visualNode.endTime = new Date();
            this.resolve(value);
        }

        function onReject(err) {
            debug("Rejected Promise #" + this.promise.$$visualNode.id);
            this.promise.$$visualNode.setValue(err, ValueType.REJECT);
            this.promise.$$visualNode.endTime = new Date();

            markCatchDeep(this.promise.$$visualNode, err);

            this.reject(err);
        }

        // create an original promise and store the resolvers.
        // we still do not init the user's resolver, we wrap it so we can know when it ends and what it got!
        var promiseRef = {};
        var orgPromise = promiseRef.promise = new OriginalPromise(function (resolve, reject) {
            promiseRef.resolve = resolve;
            promiseRef.reject = reject;
        });
        var thenPromise = orgPromise.then;
        var catchPromise = orgPromise.catch;

        // paint the promise, add a visual node to it.
        paintPromise(orgPromise, NodeTypeType.Promise, null, true);
        orgPromise.$$visualNode.startTime = new Date();
        orgPromise.$$visualNode.calledFrom = new Error().stack.split('\n')[2];
        orgPromise.$$visualNode.invoked = true; // A self defined promise is always invoked :)
        debug("Creating new Promise #" + orgPromise.$$visualNode.id);
        debug("\tStack: " + orgPromise.$$visualNode.calledFrom);

        var stepParent = (parentHint) ? parentHint : inspectCallTree(PromiseWrapper.caller, 4, 2, verificationMatchRef, 3);
        if (isPromise(stepParent) && stepParent.$$visualNode) {
            assignStepParent(orgPromise, stepParent);
        }

        resolver.call(orgPromise, onResolve.bind(promiseRef), onReject.bind(promiseRef), verificationMatchRef, orgPromise);

        wrapPromise(orgPromise);
        return orgPromise;
    }

    function assignStepParent(childPromise, stepParent) {
        childPromise.$$visualNode.type = NodeTypeType.ZonePromise;
        childPromise.$$visualNode.stepParent = stepParent;
        if (!stepParent.$$visualNode.stepChildren) stepParent.$$visualNode.stepChildren = [];
        stepParent.$$visualNode.stepChildren.push(childPromise.$$visualNode);
        delete roots[childPromise.$$visualNode.id];
    }

    PromiseWrapper.reject = function (err, parentHint) {
        return new Promise(function (resolve, reject) {
            reject(err);
        }, parentHint);
    };

    PromiseWrapper.resolve = function (value, parentHint) {
        return new Promise(function (resolve, reject) {
            resolve(value);
        }, parentHint);
    };

    if (OriginalPromise.accept) {
        PromiseWrapper.accept = PromiseWrapper.resolve;
    }

    PromiseWrapper.race = function (promises, parentHint) {
        return new PromiseWrapper(function (resolve, reject) {
            var isDone = false;
            promises.forEach(function (p) {
                p
                    .then(function (v) {
                        if (!isDone) {
                            isDone = true;
                            resolve(v);
                        }
                        return v;
                    })
                    .catch(function (err) {
                        if (!isDone) {
                            isDone = true;
                            reject(err);
                        }
                    });
            });
        }, parentHint);
    };

    PromiseWrapper.all = function (promises, parentHint) {
        return new PromiseWrapper(function (resolve, reject) {
            var self = this;
            var responseCollection = [],
                isDone = false;
            promises.forEach(function (p) {

                if (!p.$$visualNode.stepParent) {
                    assignStepParent(p, self);
                }

                p
                    .then(function (v) {
                        if (!isDone) {
                            responseCollection.push(v);

                            if (responseCollection.length == promises.length) {
                                isDone = true;
                                resolve(responseCollection);
                            }
                        }

                    })
                    .catch(function (err) {
                        if (!isDone) {
                            isDone = true;
                            reject(err);
                        }
                        else {
                            throw err;
                        }
                    });
            });
        }, parentHint);
    };

    PromiseWrapper.wrapCallbackWithHint = function (cb, parentHint) {
        return function () {
            var cbArgs = arguments;
            return function () {
                return cb.apply(this, cbArgs);
            }.apply(this, [null, null, verificationMatchRef, parentHint]);
        };
    };

    function inspectCallTree(caller, len, verficationIdx, verificationItem, returnIdx) {
        var safety = 0;
        while (caller) {
            if (caller && caller.arguments && caller.arguments.length == len) {
                if (caller.arguments[verficationIdx] === verificationItem) {
                    return caller.arguments[returnIdx];
                }
            }
            caller = caller.caller;

            safety++;
            if (safety > 100) {
                debug("Call tree loop reached 100, probably recursion.")
                break;
            }
        }
    }

    function buildInsights(node) {
        var output = [];

        if (node.type == NodeTypeType.Catch && node.parent && node.parent.type == NodeTypeType.Catch) {
            output.push({
                "promiseId": node.parent.id,
                "childId": node.id,
                "message": "Redundant Promise: A child promise of type `Catch` (#" + node.id + ") will never invoke if the parent is a `Catch` Promise (#" + node.parent.id + ")"
            });
        }

        node.children.forEach(function (cNode) {
            output = output.concat(buildInsights.call(this, cNode));
        });
        return output;
    }

    /**
     * Wrapping setTimeout.
     * setTimeout (or any async call for that matter) fires the callback once stack is empty,
     * It also removes all invocation history from the invoked function (caller, callee).
     * This means that every function fired by setTimeout, within a DPromise can not be attached to the parent Promise.
     *
     */

    var originalSetTimeout = setTimeout;

    function setTimeOutWrapper() {
        var parentPromise = inspectCallTree(setTimeOutWrapper.caller, 4, 2, verificationMatchRef, 3);
        if (parentPromise) {
            arguments[0] = PromiseWrapper.wrapCallbackWithHint(arguments[0], parentPromise);
        }
        originalSetTimeout.apply(this, arguments);
    }


    Object.getOwnPropertyNames(OriginalPromise).forEach(function (key) {
        if (!PromiseWrapper.hasOwnProperty(key)) {
            PromiseWrapper[key] = OriginalPromise[key];
        }
    });

    var enabled = false;

    return {
        NodeTypeType: NodeTypeType,
        OriginalPromise: OriginalPromise,
        PromiseNode: PromiseNode,
        init: function () {
            if (enabled) return;
            enabled = true;
            context.Promise = PromiseWrapper;
            context.setTimeout = setTimeOutWrapper;
        },
        disable: function () {
            if (!enabled) return;
            enabled = false;
            context.Promise = OriginalPromise;
            context.setTimeout = originalSetTimeout;
        },
        reset: function () {
            counter = 0;
            roots = {};
            insights = [];
        },
        getRoots: function () {
            return roots;
        },
        getInsights: function (rootNode) {
            return buildInsights(rootNode);
        },
        getD3Tree: function () {
            var keys = Object.getOwnPropertyNames(roots);
            var grp = [];
            keys.forEach(function (r) {
                grp.push(roots[r].toD3Tree());
            });
            return grp;
        }
    };
}));

