(function () {
    var app = angular.module('promiseApp', ['ngRoute', 'ui.ace', 'ui.bootstrap', 'LocalStorageModule']);

    app.constant('browserSupport', (bowser.chrome) ? true : false);

    app.config(['$routeProvider',
        function ($routeProvider) {

            $routeProvider
                .when('/playground', {
                    templateUrl: (bowser.chrome) ? 'app/playground.view.html' : 'app/browserNotSupported.view.html',
                    controller: (bowser.chrome) ? 'playgroundCtrl' : 'genericCtrl',
                    controllerAs: 'vm'
                })
                .when('/browser', {
                    templateUrl: 'app/playground.view.html',
                    controller: 'playgroundCtrl',
                    controllerAs: 'vm'
                })
                .when('/nodejs', {
                    templateUrl: 'app/playground.view.html',
                    controller: 'playgroundCtrl',
                    controllerAs: 'vm'
                })
                .otherwise({
                    templateUrl: 'app/home.view.html',
                    controller: 'genericCtrl',
                    controllerAs: 'vm'
                });
        }]);

})();
