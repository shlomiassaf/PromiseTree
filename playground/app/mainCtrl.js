(function () {
    var app = angular.module('promiseApp');

    app.controller('mainCtrl', MainCtrl);

    function MainCtrl($scope, $timeout, utilsSvc, snippets) {
        promiseTree.init();

        this.code = "var prm = new Promise(function(res,rej){setTimeout(function(){res(15);}, 100);}); \n\ncreatePromiseTree(400);";
        this.jsonTree = "";
        this.surfaceSizeFactor = 1;
        this.surfaceSizes = [1, 2, 5, 10, 25, 50, 100, 250, 500];
        this.selectedSnippet = snippets[0];

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
                self.jsonTree = JSON.stringify(promiseTree.getD3Tree(), null, '\t');
                cb && cb();
                $scope.$digest();
            }, ms);
        };

        this.resize();
    }

    MainCtrl.$inject = ['$scope', '$timeout', 'utilsSvc', 'snippets'];
})();
