(function(target) {
    var ODS = {
        GeoFilter: {
            /*
            Types of parameters:
                Bbox: Lat-SW,Lng-SW,Lat-NE,Lng-NE
                    e.g.: "43.14,12.62642,41.32,14.63"
                Polygon: a string of a list of lat,lng fit for geofilter.polygon
                    e.g.: "(48.92994318778139,2.1636199951171875),(48.92994318778139,2.5100326538085938),(48.79125929678568,2.5100326538085938),(48.79125929678568,2.1636199951171875)"
                Bounds: an object fit for leaflet's LatLngBounds objects, typically an array of arrays
                    e.g.: [ [43.14, 12.62642], [41.32, 14.63] ]
            */
            getBboxParameterAsBounds: function(bounds) {
                /*  Input: a Bbox
                    Output: a Bounds
                 */
                var members = bounds.split(',');
                return [
                    [ members[0], members[1] ],
                    [ members[2], members[3] ]
                ];
            },
            getBoundsAsBboxParameter: function(bounds) {
                /*  Input: a Bounds
                    Output: a Bbox
                */
                if (angular.isArray(bounds)) {
                    return [ bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1] ].join(',');
                } else {
                    return [ bounds.getSouthWest().lat, bounds.getSouthWest().lng, bounds.getNorthEast().lat, bounds.getNorthEast().lng ].join(',');
                }
            },
            getBoundsAsPolygonParameter: function(bounds) {
                /*  Input: a Bounds
                    Output: a Polygon
                */
                var leafletBounds;
                if (angular.isArray(bounds)) {
                    leafletBounds = new L.LatLngBounds(bounds);
                } else {
                    leafletBounds = bounds;
                }
                var polygon = [
                    [ leafletBounds.getNorthWest().lat, leafletBounds.getNorthWest().lng ],
                    [ leafletBounds.getNorthEast().lat, leafletBounds.getNorthEast().lng ],
                    [ leafletBounds.getSouthEast().lat, leafletBounds.getSouthEast().lng ],
                    [ leafletBounds.getSouthWest().lat, leafletBounds.getSouthWest().lng ]
                ];
                var polygonBounds = [];
                for (var i=0; i<polygon.length; i++) {
                    var bound = polygon[i];
                    polygonBounds.push(bound.join(','));
                }
                var param = '('+polygonBounds.join('),(')+')';
                return param;
            },
            getPolygonParameterAsBounds: function(parameter) {
                /*  Input: a Polygon
                    Output: a Bounds
                */
                var members = parameter.replace(/[()]/g, '').split(',');
                var minlat, minlng, maxlat, maxlng;
                for (var i=0; i<members.length; i+=2) {
                    var lat = members[i];
                    var lng = members[i+1];

                    if (!minlat || minlat > lat) { minlat = lat; }
                    if (!minlng || minlng > lng) { minlng = lng; }
                    if (!maxlat || maxlat < lat) { maxlat = lat; }
                    if (!maxlng || maxlng < lng) { maxlng = lng; }
                }
                return [
                    [ minlat, minlng ],
                    [ maxlat, maxlng ]
                ];
            },
            getBboxParameterAsPolygonParameter: function(bbox) {
                /*  Input: a Bbox
                    Output: a Polygon
                */
                return this.getBoundsAsPolygonParameter(this.getBboxParameterAsBounds(bbox));
            },
            getGeoJSONPolygonAsPolygonParameter: function(geoJsonPolygon) {
                /*  Input: a GeoJSON object of type Polygon
                    Output: a Polygon
                 */
                var coordinates = angular.copy(geoJsonPolygon.coordinates[0]);
                if (geoJsonPolygon.type === 'MultiPolygon') {
                    coordinates = coordinates[0];
                }
                var polygonBounds = [];
                for (var i=0; i<coordinates.length; i++) {
                    var bound = angular.copy(coordinates[i]);
                    if (bound.length > 2) {
                        // Discard the z
                        bound.splice(2, 1);
                    }
                    bound.reverse(); // GeoJSON has reverse coordinates from the rest of us
                    polygonBounds.push(bound.join(','));
                }
                return '('+polygonBounds.join('),(')+')';
            }
        }
    };

    target.ODS = ODS;
})(window);