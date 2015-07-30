(function () {
    var app = angular.module('promiseApp');

    app.controller('mainCtrl', MainCtrl);

    function MainCtrl($scope, $modal) {
        promiseTree.init();

        this.showHelp = function() {
            var modalInstance = $modal.open({
                animation: true,
                size: 'lg',
                templateUrl: 'app/promiseTreeHelp.view.html'
            });
        };
    }

    MainCtrl.$inject = ['$scope', '$modal', 'browserSupport'];
})();
