(function () {
    var app = angular.module('promiseApp');

    app.controller('genericCtrl', GenericCtrl);

    function GenericCtrl($scope) {
    }

    GenericCtrl.$inject = ['$scope'];
})();
