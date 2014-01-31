angular.module('enjeux', [])
	.directive('leafletMap', function() {
		return {
			restrict: 'A',
			scope: true,
			link: function(scope, element, attrs) {
				scope.map = L.map(element[0]).setView([46.5, 1], 6);

				// L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
				L.tileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png', {
					subdomains: "1234",
					maxZoom: 14,
				    attribution: 'Données cartographiques &copy; contributeurs <a href="http://osm.org/copyright">OpenStreetMap</a> | Données statistiques disponibles sur <a href="http://datamunicipales.opendatasoft.com">OpenDataSoft</a> (licenses diverses)'
				}).addTo(scope.map);

				scope.map.on('moveend', function(e) {
					scope.refresh(scope.map.getBounds(), true);
				});

				scope.maps[attrs.mapName].map = scope.map;
				scope.params = scope.maps[attrs.mapName];

				scope.setTooltip = function(text) {
					document.getElementById(scope.params.tooltip).innerHTML = text;
				}


			},
			controller: function($scope, $http, $q) {
				var getActiveTheme = function() {
					return $scope.params.themes[$scope.params.activeTheme];
				}

				var prepareCluster = function(layerGroup, cluster, min, max) {
					// max = 600
					// current = 
					// -> 100

					// max = 600
					// current = 100
					// -> 500
					var opacity = (cluster.series.serie1-min) / (max-min) * 0.8 + 0.1;
					if (isNaN(opacity)) {
						// Following an error...
						opacity = 0.8;
					}
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

					var geofilter = ODS.GeoFilter.getGeoJSONPolygonAsPolygonParameter(cluster.cluster);

					layer.on('mouseover', function(e) {
						if (getActiveTheme().granularity === 'departement' || $scope.map.getZoom() <= 10) {
							// Departement
							$http({
								method: 'GET',
								url: 'http://datamunicipales.opendatasoft.com/api/records/1.0/search',
								params: {
									dataset: 'geoflar-departements',
									"geofilter.polygon": geofilter
								}
							}).success(function(data) {
								$scope.setTooltip('<span class="where">' + data.records[0].fields.nom_dept + ' (' + data.records[0].fields.nom_region + ') :</span> <span class="number">' + getActiveTheme().numberTemplate.replace('{x}', cluster.series.serie1) + '</span>');
							})
						} else {
							// Commune
						}
					})
					layerGroup.addLayer(layer);
				}

				$scope.refresh = function(bounds, clearLayers) {
					if (clearLayers && $scope.layerGroup) {
	                    $scope.map.removeLayer($scope.layerGroup);
	                }
					if ($scope.currentClusterRequestCanceler) {
		                $scope.currentClusterRequestCanceler.resolve();
		            }
		            $scope.currentClusterRequestCanceler = $q.defer();
					var options = {
						'geofilter.polygon': ODS.GeoFilter.getBoundsAsPolygonParameter(bounds),
						'dataset': getActiveTheme().datasetid,
						'y.serie1.expr': getActiveTheme().weightField,
						'y.serie1.func': getActiveTheme().weightFunction
					}
					if (angular.isDefined(getActiveTheme().searchOptions)) {
						angular.extend(options, getActiveTheme().searchOptions);
					}
					// Depending on the zoom level, use a different clustering
					if (getActiveTheme().granularity === 'departement' || $scope.map.getZoom() <= 10) {
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
						var min = data.series.serie1.min;
						var max = data.series.serie1.max;
						var layerGroup = new L.LayerGroup();
						for (var i=0; i<data.clusters.length; i++) {
							var cluster = data.clusters[i];
							prepareCluster(layerGroup, cluster, min, max);
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
	.controller('MainCtrl', function($scope, $http) {
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
			},
			'candidat_sarkozy': {

			}
		};

		

		$scope.maps = {
			'politique': {
				'tooltip': 'tooltip-politique',
				'map': null,
				'activeTheme': 'sarkozy',
				'themes': {
					'sarkozy': {
						datasetid: 'resultat_presidentielle',
						weightField: 'voix_exp',
						weightFunction: 'AVG',
						searchOptions: {
							'refine.nom': 'SARKOZY'
						}
					}
				}
			},
			'indicateur': {
				'tooltip': 'tooltip-indicateur',
				'map': null,
				'activeTheme': 'insecurite',
				'themes': {
					'demographie': {
						datasetid: 'correspondance-code-insee-code-postal',
						weightField: 'population',
						weightFunction: 'SUM',
						numberTemplate: '{x} habitants'
					},
					'emploi': {
						datasetid: 'base-communale-des-zones-demploi-1',
						weightField: 'taux_chomage',
						weightFunction: 'AVG',
						numberTemplate: '{x} %'
					},
					'endettement': {
						datasetid: 'endettement',
						weightField: 'dette_par_pers',
						weightFunction: 'AVG',
						numberTemplate: '{x} %'
					},
					'insecurite': {
						datasetid: 'insecurite',
						weightField: 'ratio_insecurite',
						weightFunction: 'AVG',
						granularity: 'departement',
						numberTemplate: '{x} %'
					}
				}
			}
		}

		$scope.search = function(query) {
			if (query && query !== '') {
				$scope.geocoding = true;
				$http({
					method: 'GET',
					url: 'http://nominatim.openstreetmap.org/search',
					params: {
						q: query + ' France',
						format: 'json'
					}

				}).success(function(data) {
					$scope.geocoding = false;
					console.log(data[0]);
					$scope.maps.indicateur.map.fitBounds([
						[data[0].boundingbox[0], data[0].boundingbox[2]], 
						[data[0].boundingbox[1], data[0].boundingbox[3]], 
						]);
				});
			} else {
				$scope.maps.indicateur.map.fitBounds([
					[51.754240074033525,-6.481933593749999],
					[40.697299008636755,8.4814453125]
				]);
			}
		}

		var areMapsSync = function(map1, map2) {
			return angular.equals(map1.getZoom(), map2.getZoom()) && angular.equals(map1.getCenter(), map2.getCenter());
		}

		var unwatch = $scope.$watch('maps', function(nv, ov) {
			if (nv.politique.map && nv.indicateur.map) {
				nv.politique.map.on('moveend', function(e) {
					if (!areMapsSync(nv.indicateur.map, nv.politique.map)) {
						nv.indicateur.map.setView(nv.politique.map.getCenter(), nv.politique.map.getZoom());
					}
				});
				nv.indicateur.map.on('moveend', function(e) {
					if (!areMapsSync(nv.indicateur.map, nv.politique.map)) {
						nv.politique.map.setView(nv.indicateur.map.getCenter(), nv.indicateur.map.getZoom());
					}
				});
				unwatch();
			}
		})

	});