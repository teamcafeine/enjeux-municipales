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


			},
			controller: function($scope, $http, $q) {
				var getActiveTheme = function() {
					return $scope.params.themes[$scope.params.activeTheme];
				}

				var prepareCluster = function(layerGroup, cluster, min, max, color) {
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
                                fillColor: color,
                                fillOpacity: opacity,
                                stroke: true,
                                weight: 2
                            }
                        });
					layer.on('click', function(e) {
						$scope.map.fitBounds(e.target.getBounds());
					})

					var geofilter = ODS.GeoFilter.getGeoJSONPolygonAsPolygonParameter(cluster.cluster);

					// layer.on('mouseover', function(e) {
					// 	if (getActiveTheme().granularity === 'departement' || $scope.map.getZoom() <= 10) {
					// 		// Departement
					// 		$http({
					// 			method: 'GET',
					// 			url: 'http://datamunicipales.opendatasoft.com/api/records/1.0/search',
					// 			params: {
					// 				dataset: 'geoflar-departements',
					// 				"geofilter.polygon": geofilter
					// 			}
					// 		}).success(function(data) {
					// 			$scope.setTooltip('<span class="where">' + data.records[0].fields.nom_dept + ' (' + data.records[0].fields.nom_region + ') :</span> <span class="number">' + getActiveTheme().numberTemplate.replace('{x}', cluster.series.serie1) + '</span>');
					// 		})
					// 	} else {
					// 		// Commune
					// 	}
					//})
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
							prepareCluster(layerGroup, cluster, min, max, getActiveTheme().color);
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
						if (!$scope.query.city || $scope.query.city == '') {
							console.log('REFRESH', $scope.query.city);
							$scope.refresh(nv.getBounds());
						}
					}
				});
				$scope.$watch('params.activeTheme', function() {
					$scope.refresh($scope.map.getBounds(), true);
				});
			}
		}
	})
	.controller('MainCtrl', function($scope, $http) {
		$scope.query = {city: ''};
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

		$scope.maps = {
			// 'politique': {
			// 	'tooltip': 'tooltip-politique',
			// 	'map': null,
			// 	'activeTheme': 'sarkozy',
			// 	'themes': {
			// 		'sarkozy': {
			// 			datasetid: 'resultat_presidentielle',
			// 			weightField: 'voix_exp',
			// 			weightFunction: 'AVG',
			// 			searchOptions: {
			// 				'refine.nom': 'SARKOZY'
			// 			}
			// 		}
			// 	}
			// },
			'indicateur': {
				'map': null,
				'activeTheme': 'endettement',
				'themes': {
					// 'demographie': {
					// 	datasetid: 'correspondance-code-insee-code-postal',
					// 	weightField: 'population',
					// 	weightFunction: 'SUM',
					// 	numberTemplate: '{x} habitants'
					// },
					'emploi': {
						datasetid: 'base-communale-des-zones-demploi-1',
						weightField: 'taux_chomage',
						weightFunction: 'AVG',
						numberTemplate: '{x} %',
						color: '#2ca25f',
						explication: "Taux de chômage par zone d'emploi en décembre 2012 (Source : Insee)"
					},
					'endettement': {
						datasetid: 'endettement',
						weightField: 'dette_par_pers',
						weightFunction: 'AVG',
						numberTemplate: '{x} %',
						color: '#2c7fb8',
						explication: "Endettement par habitants en 2012 (Source : DGFIP/Regards citoyens)"
					},
					'insecurite': {
						datasetid: 'insecurite',
						weightField: 'ratio_insecurite',
						weightFunction: 'AVG',
						granularity: 'departement',
						numberTemplate: '{x} %',
						color: '#f03b20',
						explication: "Nombre de crimes et délits constatés rapporté à la population du département en août 2012 (Source : INHESJ/data.gouv.fr)"
					}
				}
			}
		}

		var computeTooltipNumber = function(indicateur, code_commune, code_dept, code_reg) {
			var result = {
				'dept': null,
				'commune': null
			}
			var theme = $scope.maps.indicateur.themes[indicateur];
			
			$http({
				url: 'http://datamunicipales.opendatasoft.com/api/records/1.0/analyze',
				method: 'GET',
				params: {
					'q': 'code_reg:"' + code_reg + '"',
					'dataset': theme.datasetid,
					'x': 'code_reg',
					'y.serie1.expr': theme.weightField,
					'y.serie1.func': theme.weightFunction
				}
			}).success(function(data) {
				result.region = data[0].serie1;
			});


			$http({
				url: 'http://datamunicipales.opendatasoft.com/api/records/1.0/analyze',
				method: 'GET',
				params: {
					'q': 'code_dept:"' + code_dept + '"',
					'dataset': theme.datasetid,
					'x': 'code_dept',
					'y.serie1.expr': theme.weightField,
					'y.serie1.func': theme.weightFunction
				}
			}).success(function(data) {
				result.dept = data[0].serie1;
			});

			if (theme.granularity !== 'departement') {
				$http({
					url: 'http://datamunicipales.opendatasoft.com/api/records/1.0/analyze',
					method: 'GET',
					params: {
						'q': 'code_commune:"' + code_commune + '"',
						'dataset': theme.datasetid,
						'x': 'code_commune',
						'y.serie1.expr': theme.weightField,
						'y.serie1.func': theme.weightFunction
					}
				}).success(function(data) {
					result.commune = data[0].serie1;
				});
			}
			return result;

			// $http({
			// 	'q': 'nom_comm:"' + query + '"',
			// 	'dataset': getActiveTheme().datasetid,
			// 	'x': 'code_re',
			// 	'y.serie1.expr': getActiveTheme().weightField
			// 	'y.serie1.func': getActiveTheme().weightFunction
			// }).success(function(data) {
			// 	console.log(data);
			// });
		}

		$scope.switchTheme = function(theme) {
			$scope.maps.indicateur.activeTheme = theme;
			if ($scope.city) {
				$scope.tooltipNumericData = computeTooltipNumber($scope.maps.indicateur.activeTheme, $scope.city.insee, $scope.city.code_dept, $scope.city.code_reg);
				$scope.cityShape.setStyle({
					color: 'red',
	                fillColor: $scope.maps.indicateur.themes[theme].color,
	                fillOpacity: 0.2,
	                stroke: true,
	                weight: 2
	            });
			}
		}

		$scope.getExplication = function() {
			return $scope.maps.indicateur.themes[$scope.maps.indicateur.activeTheme].explication;
		}

		$scope.search = function(query) {
			if (query && query !== '') {
				// Step 1 - zoom the map to it
				$http({
					method: 'GET',
					url: 'http://datamunicipales.opendatasoft.com/api/records/1.0/search',
					params: {
						dataset: 'geoflar-communes',
						q: 'nom_comm:"' + query + '"'
					}
				}).success(function(data) {
					var values = data.records[0].fields
					var shape = values.geom;
					var cityShape = new L.GeoJSON(shape, {
                        style: {
                            color: 'red',
                            fillColor: $scope.maps.indicateur.themes[$scope.maps.indicateur.activeTheme].color,
                            fillOpacity: 0.2,
                            stroke: true,
                            weight: 6
                        }
					});
					if ($scope.cityShape) {
						$scope.maps.indicateur.map.removeLayer($scope.cityShape);
					}
					$scope.cityShape = cityShape;
					$scope.maps.indicateur.map.addLayer(cityShape);
					$scope.maps.indicateur.map.fitBounds(cityShape.getBounds());

					$scope.city = {
						insee: values.code_commune,
						departement: values.code_dept,
						code_reg: values.code_reg
					} 

					$scope.tooltipData = {
						ville: query,
						departement: values.nom_dept,
						codeDepartement: values.code_dept,
						region: values.nom_region
					}
					$scope.tooltipNumericData = computeTooltipNumber($scope.maps.indicateur.activeTheme, values.code_commune, values.code_dept, values.code_reg);
				});

				// Step 2

				// $scope.geocoding = true;
				// $http({
				// 	method: 'GET',
				// 	url: 'http://nominatim.openstreetmap.org/search',
				// 	params: {
				// 		q: query + ' France',
				// 		format: 'json'
				// 	}

				// }).success(function(data) {
				// 	$scope.geocoding = false;
				// 	console.log(data[0]);
				// 	$scope.maps.indicateur.map.fitBounds([
				// 		[data[0].boundingbox[0], data[0].boundingbox[2]], 
				// 		[data[0].boundingbox[1], data[0].boundingbox[3]], 
				// 		]);
				// });
			} else {
				$scope.maps.indicateur.map.fitBounds([
					[51.754240074033525,-6.481933593749999],
					[40.697299008636755,8.4814453125]
				]);
			}
		}

	})
	.directive('autofocus', function(){
        /*
         This directive applies the focus on the holding element upon page load.
         */
        return {
            restrict: 'A',
            link: function(scope, element) {
            	element[0].focus();
            }
        };
    });