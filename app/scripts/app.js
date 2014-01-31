angular.module('enjeux', [])
	.directive('leafletMap', function() {
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				scope.map = L.map(element[0]).setView([46.5, 1], 6);

				L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
				    attribution: 'Données cartographiques &copy; contributeurs <a href="http://osm.org/copyright">OpenStreetMap</a> | Données statistiques disponibles sur <a href="http://datamunicipales.opendatasoft.com">OpenDataSoft</a> (licenses diverses)'
				}).addTo(scope.map);

				scope.map.on('moveend', function(e) {
					scope.refresh(scope.map.getBounds());
				});
			},
			controller: function($scope, $http, $q) {
				$scope.refresh = function(bounds) {
					if ($scope.currentClusterRequestCanceler) {
		                $scope.currentClusterRequestCanceler.resolve();
		            }
		            $scope.currentClusterRequestCanceler = $q.defer();
					var options = {
						'geofilter.polygon': ODS.GeoFilter.getBoundsAsPolygonParameter(bounds),
						'dataset': $scope.themes[$scope.themeActif].datasetid,
						'y.serie1.expr': $scope.themes[$scope.themeActif].weightField,
						'y.serie1.func': $scope.themes[$scope.themeActif].weightFunction
					}
					// Depending on the zoom level, use a different clustering
					if ($scope.map.getZoom() <= 10) {
						// Departement
						angular.extend(options, {
                            'clustermode': 'world',
                            'clusterprecision': $scope.map.getZoom(),
                            'localkey': 'code_dept',
                            'clusterdatasetid': 'geoflar-departements',
                            'remotekey': 'code_dept'
						});
						
					} else {
						// Commune
						// Departement
						angular.extend(options, {
                            'clustermode': 'world',
                            'clusterprecision': $scope.map.getZoom(),
                            'localkey': 'code_commune',
                            'clusterdatasetid': 'geoflar-communes',
                            'remotekey': 'insee_com'
						});
					}

					$http({
						url: 'http://datamunicipales.opendatasoft.com/api/records/1.0/geocluster/',
						params: options,
						method: 'GET',
						cache: false,
						timeout: $scope.currentClusterRequestCanceler.promise,
						headers: {
							'ODS-API-Analytics-App': 'enjeux-municipales'
						}
					}).success(function(data) {
						console.log('result length', data.length);
						var max = data.series.serie1.max;
						var layerGroup = new L.LayerGroup();
						for (var i=0; i<data.clusters.length; i++) {
							var cluster = data.clusters[i];
							var opacity = (cluster.series.serie1 / max) * 0.9 + 0.1;
							var layer = new L.GeoJSON(cluster.cluster, {
                                    style: {
                                        color: '#000000',
                                        fillColor: '#2ca25f',
                                        fillOpacity: opacity,
                                        stroke: true,
                                        weight: 2
                                    }
                                });
							layer.on('click', function(e) {
								$scope.map.fitBounds(e.target.getBounds());
							})
							layerGroup.addLayer(layer);
						}
						layerGroup.addTo($scope.map);
		                if ($scope.layerGroup) {
		                    $scope.map.removeLayer($scope.layerGroup);
		                }
		                $scope.layerGroup = layerGroup;
					})

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
			'demographie': {
				datasetid: 'correspondance-code-insee-code-postal',
				weightField: 'population',
				weightFunction: 'SUM'
			},
			'emploi': {
				datasetid: 'base-communale-des-zones-demploi-1',
				weightField: 'taux_chomage',
				weightFunction: 'AVG'
			}
		};

		$scope.themeActif = 'emploi';

	});