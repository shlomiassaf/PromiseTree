(function () {

    var app = angular.module('promiseApp');

    app.controller('playgroundCtrl', PlaygroundCtrl);

    function PlaygroundCtrl($scope, $timeout, utilsSvc, snippets) {
        this.code = "// Write promise code here or use one of the examples...\n\n";
        this.code += "// Thinking of a cool example in mind? Post a PR or open an ISSUE on GITHUB and I will add it";
        this.jsonTree = "";
        this.surfaceSizeFactor = 1;
        this.surfaceSizes = [1, 2, 5, 10, 25, 50, 100, 250, 500];
        this.selectedSnippet = snippets[0];
        this.showValues = true;
        this.showTreeViewSettings = true;

        this.snippets = snippets;

        this.alerts = [];

        this.closeAlert = function(index) {
            this.alerts.splice(index, 1);
        };


        this.resize = function () {
            var docHeight = utilsSvc.docHeight();
            var maxH = -1;
            Array.prototype.forEach.call(document.querySelectorAll('.action-box-container'), function (el) {
                var h = 0.9 * (docHeight - el.getBoundingClientRect().top);
                el.style.height = h + "px";
                maxH = Math.max(maxH, h);
            });

            this.boxSize = maxH;
            Array.prototype.forEach.call(document.querySelectorAll('.result-box-container'), function (el) {
                el.style.height = maxH + "px";
            });
        };


        this.onSnippetChange = function () {
            if (this.selectedSnippet.desc) {
                this.code = "/**\n * "
                var snip = this.selectedSnippet.desc.split("\n");
                this.code += snip.join("\n * ")
                this.code += "\n **/\n\n"
            }
            else {
                this.code = "";
            }
            this.code += this.selectedSnippet.snip;
        };


        this.runCode = function () {
            if (!this.code) return;
            promiseTree.reset();
            try {
                (new Function("with(this) { " + this.code + "}"))
                    .call({code: this.code, createPromiseTree: this.createTree.bind(this)});
            }
            catch(err) {
                var alert = {
                    type: 'danger',
                    msg: 'Syntax error: ' + err
                };
                this.alerts.push(alert);
                $timeout(function(self, alert) {
                    var idx = self.alerts.indexOf(alert);
                    idx > -1 && self.closeAlert(idx)
                }, 6000, true, this, alert);
            }
        };

        this.createTree = function (ms, cb) {
            var self = this;
            setTimeout(function () {
                var tree = promiseTree.getD3Tree();

                self.rootNodes = [];
                for (var i=0; i<tree.length; i++) self.rootNodes.push(i+1);
                self.selectedRootNode = (self.rootNodes.length) ? 1 : 0;

                self.jsonTree = JSON.stringify(tree, null, '\t');
                cb && cb();
                $scope.$digest();
            }, ms);
        };

        $scope.$on('hoverNodeIn', function(evet, data) {
            var valueType;
            switch (parseInt(data.valueType)) {
                case 0:
                    valueType = "Not Resolved"
                    break;
                case 1:
                    valueType = "Resolve"
                    break;
                case 2:
                    valueType = "Reject"
                    break;
                case 5:
                    valueType = "Promise ID"
                    break;
                case 6:
                    valueType = "Promise ID"
                    break;
            }

            this.nodeOnView = JSON.stringify( {
                id: data.name,
                startTime: data.startTime,
                endTime: data.endTime,
                invoked: data.invoked,
                value: data.value,
                valueType: valueType,
                stack: data.calledFrom
            } , null, '\t' );
            $scope.$digest(); // not good but does the trick for now
        }.bind(this));

        $scope.$on('hoverNodeOut', function(evet, data) {
            this.nodeOnView = null;
            $scope.$digest(); // not good but does the trick for now
        }.bind(this));

        this.resize();
    }

    PlaygroundCtrl.$inject = ['$scope', '$timeout', 'utilsSvc', 'snippets'];
})();
