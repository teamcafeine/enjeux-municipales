angular.module('enjeux', [])
	.directive('leafletMap', function() {
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				scope.map = L.map(element[0]).setView([46.5, 1], 6);

				// add an OpenStreetMap tile layer
				L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
				    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
				}).addTo(scope.map);

				scope.map.on('moveend', function(e) {
					scope.refresh(scope.map.getBounds());
				});
			},
			controller: function($scope, $http) {
				$scope.refresh = function(bounds) {
					var options = {
						'geofilter.polygon': ODS.GeoFilter.getBoundsAsPolygonParameter(bounds)
					}
					console.log('refresh');
				};

				$scope.$watch('map', function(nv, ov) {
					if (nv) {
						$scope.refresh(nv.getBounds());
					}
				});
			}
		}
	})
	.controller('MainCtrl', function($scope) {
		$scope.themes = {
			'emploi': {
				datasetid: ''
			}
		};

	});