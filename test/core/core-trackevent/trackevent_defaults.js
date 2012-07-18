/*global text,expect,ok,module,notEqual,test,window*/

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

(function(window, document, undefined ){

  window._testInitCallback = function(){};
  window._testBeforeCallback = function(){};
  window._testAfterCallback = function(){};

  // All modules that create Butter objects (e.g., Butter())
  // should use this lifecycle, and call rememberButter() for all
  // created butter instances.  Any created using createButter()
  // already have it done automatically.
  var butterLifeCycle = (function(){

    var _tmpButter;

    return {
      setup: function(){
        _tmpButter = [];
      },
      teardown: function(){
        var i = _tmpButter.length;
        while( i-- ){
          _tmpButter[ i ].clearProject();
          delete _tmpButter[ i ];
        }
      },
      rememberButter: function(){
        var i = arguments.length;
        while( i-- ){
          _tmpButter.push( arguments[ i ] );
        }
      }
    };

  })();

  function createButter( callback ){

    Butter({
      config: "../test-config.json",
      debug: false,
      ready: function( butter ){
        butterLifeCycle.rememberButter( butter );
        callback( butter );
      }
    });
  } //createButter

  module( "TrackEvent", butterLifeCycle );
  asyncTest( "Trackevents use plugin defaults", 1, function() {

    createButter(function( butter ) {
      var te1,
          m = butter.addMedia({ url: "../../../external/popcorn-js/test/italia.ogg", target: "mediaDiv" }),
          t = m.addTrack();

      butter.listen( "mediaready", function( e ) {
        butter.listen( "trackeventupdated", function( e ) {
          equal( e.data.popcornOptions.text, "Popcorn.js", "Trackevent is given proper plugin defaults" );
          start();
        });

        te1 = t.addTrackEvent({
          name: "TrackEvent 1",
          type: "text",
          start: 0,
          end: 1
        });

        te1.update({
          start: 5,
          end: 6
        });
      });
    });
  });

}( window, window.document ));