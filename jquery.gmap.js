/**
 * Плагин для работы с гугл-картами. Отображение заданного количества координат точек (опционально с информационными окнами по клику, группировкой маркеров 
 * на карте 'gmaps.markermanager'), геокодинг адреса из инпута (с отслеживанием координат для последующего сохранения, перетаскиваемым 
 * маркером в случае недоверия геокодингу, информационным окном), иконки маркеров настраиваются в параметрах.
 * 
 * пример использования: http://inline-ltd.ru/jgmap.html
 * 
 * @url forked from http://github.com/tristandunn/jquery-auto-geocoder
 * @author Александр Каупанин <kaupanin@gmail.com>
 */

(function($) {
  var geocoder = new google.maps.Geocoder();
 
  $.fn.Gmap = function(options) {
    options = $.extend(true, {}, $.fn.Gmap.defaults, options || {});
    this.setupExtras(options.setup || $.fn.Gmap.base, options);
    if (! $.fn.Gmap.initialized_map) {
      $(this).trigger("geocoder-createMap");
    }
    return this;
  };
  
 
  $.fn.Gmap.base = {
    initialize: [function(options) {
      options.initial.center = new google.maps.LatLng(
        options.initial.center[0],
        options.initial.center[1]
      );
      
      options.geocoder.track_coordinates.lat = "#" + options.geocoder.track_coordinates.lat;
      options.geocoder.track_coordinates.lng = "#" + options.geocoder.track_coordinates.lng;
      options.geocoder.track_coordinates.accuracy = "#" + options.geocoder.track_coordinates.accuracy;

      if (options.geocoder.bounds) {
        options.geocoder.bounds = new google.maps.LatLngBounds(new google.maps.LatLng(options.geocoder.bounds.sw[0], options.geocoder.bounds.sw[1]),
                                                               new google.maps.LatLng(options.geocoder.bounds.ne[0], options.geocoder.bounds.ne[1])
        );
      }
      var clarification = options.geocoder.clarification ? "#" + options.geocoder.clarification : "";
      options.geocoder.clarification = (options.geocoder.clarification && $(clarification).html()) ?  $(clarification).html() : options.geocoder.clarification;
      
      if (options.show_points) {
        var lat = $('[name^="' + options.show_points.lat + '["]');
        options.show_points.processed = new Array();
        $(lat).each(function(i){
          options.show_points.processed.push({
            lat: $("[name=" +options.show_points.lat + "[" + i + "]]").val(),
            lng: $("[name=" +options.show_points.lng + "[" + i + "]]").val(),
            infowindow: $("[name=" +options.show_points.infowindow + "[" + i + "]]").val() || $("[name=" +options.show_points.infowindow + "[" + i + "]]").html(),
            icon: $("[name=" +options.show_points.marker.icon + "[" + i + "]]").val(),
            shadow: $("[name=" +options.show_points.marker.shadow + "[" + i + "]]").val()
          });
        });
        $.fn.Gmap.show_points = {};
        $.fn.Gmap.show_points.processed = options.show_points.processed;
      }
       
    }],
 
    createMap: [function(options) {
      this.bind("geocoder-createMap", function() {
        var self = $(this);
        var me = this;

        $.fn.Gmap.initialized_map = $.fn.Gmap.initialized_map ? $.fn.Gmap.initialized_map : new google.maps.Map(me, options.initial);
        var map = ext_map =  this.map = $.fn.Gmap.initialized_map;

        if (options.geocoder.target) {
          options.geocoder.target = $("#" + options.geocoder.target);
          switch(options.geocoder.auto) {
            case "onkeyup":
              $(options.geocoder.target).keyup(function() {
                setTimeout(function() {self.trigger("geocoder-onChange");}, options.geocoder.delay);
              });
              break;
            case "onchange":
              $(options.geocoder.target).change(function() {
                self.trigger("geocoder-onChange");
              });
              break;
            default: return;
          }
        }

        if (options.geocoder.track_coordinates) {
          this.marker = this.marker || new google.maps.Marker(options.geocoder.track_coordinates.marker_options);
          var infowindow_baloon  = infowindow_baloon || new google.maps.InfoWindow();
          
          if ($(options.infowindow).val()) {
            google.maps.event.addListener(this.marker, "click", function() {
              infowindow_baloon.setContent($(options.infowindow).val());
              infowindow_baloon.open(this.map, this);
            });
          }
            
          google.maps.event.addListener(this.marker, "dragstart", function() {
              if (this.infowindow) this.infowindow.close();
          });
        
          google.maps.event.addListener(this.marker, "dragend", function() {
              if (! options.geocoder.track_coordinates.infowindow) {
                return;
              }
              this.infowindow = new google.maps.InfoWindow({content: options.geocoder.track_coordinates.infowindow});
              self.trigger("geocoder-trackCoordinates", [this.getPosition()]);
              this.infowindow.open(map, this);
          });
        }

        $.fn.Gmap.collect_points = true;
        $(this).trigger("geocoder-showPoints");
        
        
        if (options.show_points.dragend) {
          google.maps.event.addListener(this.map, "dragend", function() {
            window[options.show_points.dragend].call(null, $.fn.Gmap);
          });
        }
                
        if (options.show_points.on_zoom) {
          google.maps.event.addListener(this.map, "zoom_changed", function() {
              window[options.show_points.on_zoom].call(null, $.fn.Gmap);
          });  
        }
        
        if (options.show_points.bounds_changed) {
          google.maps.event.addListener(this.map, "bounds_changed", function() {
            window[options.show_points.bounds_changed].call(null, $.fn.Gmap);
          });  
        }
        if (options.initial.min_zoom) {
          google.maps.event.addListener(this.map, "zoom_changed", function() {
            if ($.fn.Gmap.initialized_map.getZoom() > options.initial.min_zoom) {
                $.fn.Gmap.initialized_map.setZoom(options.initial.min_zoom);
              }
          });  
        }

      });
      
    }],
    
    showPoints: [function(options) {
      this.bind("geocoder-showPoints", function() {
        if (! $.fn.Gmap.collect_points) return;
        var map = $.fn.Gmap.initialized_map;
        if (typeof markers != "undefined") {
          for(var i in markers) {
            if (typeof markers[i] == "object") {
              markers[i].setMap(null); // ie fix
            }
          }  
        }
        if (typeof marker_manager != "undefined") marker_manager.clear();
          markers = new Array();
          
          var infowindow_baloon = infowindow_baloon || new google.maps.InfoWindow(options.show_points.infowindow_options);
          if (typeof $.fn.Gmap.show_points.processed[0] != "undefined") {
            bounds = new google.maps.LatLngBounds(
              new google.maps.LatLng($.fn.Gmap.show_points.processed[0].lat, $.fn.Gmap.show_points.processed[0].lng),
              new google.maps.LatLng($.fn.Gmap.show_points.processed[0].lat, $.fn.Gmap.show_points.processed[0].lng)
            );
          }
           
          if (options.show_points.group_markers && typeof window.GmapsMarkerManager == "function") {
            if(typeof marker_manager != "undefined") {
              marker_manager.clear(true);
              marker_manager.clearGroupMarkers(true);
            }
            marker_manager = new GmapsMarkerManager(map, options.show_points.markermanager_options);
          }
           
          $($.fn.Gmap.show_points.processed).each(function(i) {
            var new_point = new google.maps.LatLng(this.lat, this.lng);
            var marker = new google.maps.Marker({position: new_point});
            bounds.extend(new_point);

            if (options.show_points.icon.src && ! this.icon) {
              marker.setIcon(new google.maps.MarkerImage(options.show_points.icon.src));
            }
            if (options.show_points.icon.shadow && ! this.shadow) {
              marker.setShadow(new google.maps.MarkerImage(options.show_points.icon.shadow));
            }
            if (this.icon) {
              marker.setIcon(new google.maps.MarkerImage(this.icon));
            }
            if (this.shadow) {
              marker.setShadow(new google.maps.MarkerImage(this.shadow));
            }
            
            marker.setOptions(options.show_points.marker.options);
            
            if (options.show_points.marker.dragend) {
              google.maps.event.addListener(marker, "dragend", function() {
                window[options.show_points.marker.dragend].call(null, $.fn.Gmap);
              });
            }
        
            var self = this;
            if (typeof window.GmapsMarkerManager == "function" && typeof marker_manager != "undefined") marker_manager.addMarker(marker, this.infowindow);
            else marker.setMap(map);
            
            markers.push(marker);
            
            
            if (! options.on_zoom && $.fn.Gmap.show_points.processed.length == 1) {
              map.setOptions({
                center: markers[i].getPosition(),
                zoom: options.geocoder.success.zoom
              });
            }
            var infowindow_text = this.infowindow;
            
            google.maps.event.addListener(markers[i], "click", function() {
              infowindow_baloon.setContent(infowindow_text);
              infowindow_baloon.open(map, this);
            });
         });

        if (typeof bounds != "undefined" && options.show_points.autofit) {
          map.fitBounds(bounds);
          options.show_points.autofit = false;
          options.initial.bounds = bounds;
        }
        
        $.fn.Gmap.collect_points = false;
        
      })
      
    }],
    

    trackCoordinates: [function(options) {
      this.bind("geocoder-trackCoordinates", function(e, location) {
        if (!options.geocoder.track_coordinates) return;
        $(options.geocoder.track_coordinates.lat).val(location.lat());
        $(options.geocoder.track_coordinates.lng).val(location.lng());
        $(options.geocoder.track_coordinates.accuracy).val("MANUAL");
      })
    }],
    
    onChange: [function(options) {
      this.bind("geocoder-onChange", function() {
        var self = $(this);
        var address = $.trim(options.geocoder.target.val());
        address = options.geocoder.clarification + " " + address;
        if ($.fn.Gmap.last_address == address) {
          return;
        }

        if (options.geocoder.bounds) {
          geocoder.geocode({ address: address, bounds: options.geocoder.bounds, language: options.geocoder.language, country: options.geocoder.country}, function(results, status) {
            self.trigger("geocoder-onGeocodeResult", [results, status]);
          });
        } else {
          geocoder.geocode({address: address, language: options.geocoder.language, country: options.geocoder.country}, function(results, status) {
            self.trigger("geocoder-onGeocodeResult", [results, status]);
          });
        }
        $.fn.Gmap.last_address = address;
      })
    }],
 
    onGeocodeResponse: [function(options) {
      this.bind("geocoder-onGeocodeResult", function(e, results, status) {
        if (status == google.maps.GeocoderStatus.OK && status != google.maps.GeocoderStatus.ZERO_RESULTS) {
          this.map.setZoom(options.geocoder.success.zoom);
          this.map.setCenter(results[0].geometry.location);
 
          this.marker = this.marker || new google.maps.Marker({draggable: options.geocoder.track_coordinates ? true : false});
          this.marker.setPosition(results[0].geometry.location);
          if (options.geocoder.icon.src) {
            this.marker.setIcon(new google.maps.MarkerImage(options.geocoder.icon.src));
          }
          if (options.geocoder.icon.shadow) {
            this.marker.setShadow(new google.maps.MarkerImage(options.geocoder.icon.shadow));
          }
          this.marker.setMap(this.map);
          
          $(this).trigger("geocoder-trackCoordinates", [results[0].geometry.location]);
          $(this).trigger("geocoder-onGeocodeSuccess", [results, status]);
          
          $(options.geocoder.track_coordinates.accuracy).val(results[0].geometry.location_type);
          
        } else {
          if (this.marker) {
            this.marker.setMap(null);
            delete this.marker;
          }
 
          if (options.initial.bounds) {
            this.map.fitBounds(options.initial.bounds);
          } else {
            this.map.setZoom(options.initial.zoom);
            this.map.setCenter(options.initial.center);
          }
 
          $(this).trigger("geocoder-onGeocodeFailure", [results, status]);
        }
      });
    }],
    
    onGeocodeSuccess: [],
    onGeocodeFailure: []
  };
 
  $.fn.Gmap.defaults = {
    show_points: {
      dragend: null,
      lat: "lat",
      lng: "lng",
      infowindow: "infowindow",
      marker: {
        icon: "icon",
        shadow: "shadow",
        options: {},
        dragend: null
      },
      infowindow_options: {
        disableAutoPan: true
      },
      autofit: true,
      icon:{
        src: false,
        shadow: false
      },
      group_markers: false,
      markermanager_options: {}
    },

    geocoder: {
      clarification: "",
      bounds: null,
      country: null,
      language: "en",
      delay: 500,
      success : {
        zoom: 12
      },
      auto: "keyup",
      track_coordinates:{
        lat: "lat",
        lng: "lng",
        accuracy: "accuracy",
        icon: {
          src: null,
          shadow: null
        },
        infowindow: "",
        marker_options: {
          draggable: true
        }
      }
    },

    on_zoom: false,
    initial: {
      zoom: 1,
      center: [34, 0],
      draggable: false,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      min_zoom: 20
    }
  };
 
  // From:
  // http://yehudakatz.com/2009/04/20/evented-programming-with-jquery/
  jQuery.fn.setupExtras = function(setup, options) {
    for (property in setup) {
      var self = this;
 
      if (setup[property] instanceof Array) {
        for (var i = 0; i < setup[property].length; i++) {
          setup[property][i].call(self, options);
        }
      } else {
        setup[property].call(self, options);
      }
    }
  };
})(jQuery);