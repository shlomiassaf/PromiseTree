(function(){
  var app = angular.module('promiseApp');

  app.service('utilsSvc', UtilsSvc);

  function UtilsSvc() {
    this.docHeight = function docHeight() {
      var body = document.body,
        html = document.documentElement;

      return Math.max( body.scrollHeight, body.offsetHeight,
        html.clientHeight, html.scrollHeight, html.offsetHeight );
    }
  }

  UtilsSvc.$inject = [];
})();
