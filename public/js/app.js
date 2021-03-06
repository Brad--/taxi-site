(function () {
  'use strict';
  // idk why, but adding ngMessages makes the messages stop working
  var app = angular
    .module('taxiFare', ['ngMaterial', 'ngMessages'])
    .config(function($mdThemingProvider, $httpProvider) {
      $mdThemingProvider
        .theme('default')
        .primaryPalette('teal');
      // $httpProvider.defaults.useXDomain = true;
      // $httpProvider.defaults.headers.common = 'Content-Type: application/json';
      // delete $httpProvider.defaults.headers.common['X-Requested-With'];
    })
  app.controller('MainCtrl', MainCtrl)

  function MainCtrl ($timeout, $q, $log, $http) {
    var self = this;
    // $http.defaults.cache = true;
    self.simulateQuery = false;
    self.isDisabled    = false;
    // list of `state` value/display objects
    self.states = loadAll();
    self.querySearch   = querySearch;
    self.selectedItemChange  = selectedItemChange;
    self.searchTextChange    = searchTextChange;
    self.searchTextChange2   = searchTextChange2;
    self.numRiders;
    // ******************************
    // Internal methods
    // ******************************
    /**
     * Search for states... use $timeout to simulate
     * remote dataservice call.
     */
    function querySearch (query) {
      var results = query ? self.states.filter( createFilterFor(query) ) : self.states,
          deferred;
      if (self.simulateQuery) {
        deferred = $q.defer();
        $timeout(function () { deferred.resolve( results ); }, Math.random() * 1000, false);
        return deferred.promise;
      } else {
        return results;
      }
    }
    function searchTextChange(text) {
      // $log.info('Text changed to ' + text);
      if(text !== "" && text !== undefined)
        placesAjax(1);
    }
    function searchTextChange2(text){
      if(text !== "" && text !== undefined)
        placesAjax(2);
    }

    function placesAjax(num) {
      var text;
      if(num === 1)
        text = self.searchText;
      if(num === 2)
        text = self.searchText2;
      var req = {
        method: 'POST',
        url: '/autocomplete',
        data: {'text': text}
      }
      $http(req)
        .then(function success(res) {
          self.states = loadAuto(res);
        }, function error(res) {
          console.log(res);
        });
    }

    function selectedItemChange(item) {
      // $log.info('Item changed to ' + JSON.stringify(item));
    }

    function loadAll() {
      var allLocations = ""; 
      return allLocations.split(/, +/g).map( function (location) {
        return {
          value: location.toLowerCase(),
          display: location
        };
      });
    }

    function loadAuto(res) {
      var locations = res.data.predictions;

      return locations.map(function(loc){
        var temp = loc.terms[0].value;
        return {
          value: temp.toLowerCase(),
          display: temp
        };
      });
    }

    function createFilterFor(query) {
      var lowercaseQuery = angular.lowercase(query);
      return function filterFn(state) {
        return (state.value.indexOf(lowercaseQuery) === 0);
      };
    }
  }

  app.controller('DialogCtrl', DialogCtrl);
  function DialogCtrl($scope, $mdDialog, $http) {

    $scope.getInfo = function (ev, curr, dest, numRiders) {
      if(dest === null || curr === null || numRiders === null
      || dest === undefined || curr === undefined
      || numRiders === undefined)
        throw new Error("Empty field!");
      else if(dest.length > 100)
        throw new Error("Your destination is too long!");
      else if(curr.length > 100)
        throw new Error("Your destination is too long!");
      else if(parseInt(numRiders) > 9)
        throw new Error("Too many riders!");
      else
      calcDistDuration(curr, dest, function(time, dist){
        var info = "Time: " + time + ", Distance: " + dist + ", Riders: " + numRiders;
        var req = {
          method: 'POST',
          url: '/fare',
          data: {
            'time': time,
            'dist': dist,
            'riders': numRiders
          }
        }
        $http(req)
          .then(function success(res) {
            info = '$' + res.data.calc;
            // Trying to inject data into the fare controller
            $mdDialog.show(
            {
              parent: angular.element(document.body),
              clickOutsideToClose: true,
              title: "Fare",
              textContent: info,
              ariaLabel: "dialog",
              targetEvent: ev,
              openFrom: '#top',
              closeTo: '#bottom',
              templateUrl: 'fare.tmpl.html',
              controller: FareCtrl,
              locals: {
                fare: info,
                dist: dist,
                duration: time
              }
            });
          }, function error(res){
            console.log(res);
          });
      });
    }

    function usableAddress(address){
      var temp;
      temp = address.replace(' ', '+');
      temp = temp + "+New+York+City,+NY";
      return temp;
    }

    function calcDistDuration(start, end, callback) {
      start = usableAddress(start);
      end   = usableAddress(end);
      var urlTop = "https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=";
      var urlBtm = start + "&destinations=" + end + "&departure_time=" + Math.round(new Date().getTime()/1000.0) + "&traffic_model=best_guess";

      var req = {
        method: 'POST',
        url: '/distance',
        data: {
          'curr': start,
          'dest': end
        }
      }

      $http(req)
        .then(function success(res) {
          // var values = res.rows[0].elements[0];
          var values = res.data.rows[0].elements[0];
          callback(values.duration.text, values.distance.text);
        }, function error(res) {
          console.log("Error getting distance");
        });
    }
  }

  app.controller('FareCtrl', FareCtrl);
  function FareCtrl($mdDialog, $scope, fare, dist, duration) {
    $scope.fare = fare;
    $scope.dist = dist;
    $scope.duration = duration;
  }
})();
