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
  asyncTest( "Select all track events of a particular type using getTrackEvents", 2, function(){

    createButter( function( butter ){

      var m = butter.addMedia({ url: "../../../external/popcorn-js/test/italia.ogg", target: "mediaDiv" }),
          t = m.addTrack(),
          te1 = t.addTrackEvent( { name: "TrackEvent 1", type: "text", popcornOptions: { start: 0, end: 1, target: "mediaDiv" } } ),
          te2 = t.addTrackEvent( { name: "TrackEvent 2", type: "test", popcornOptions: { start: 0, end: 3, target: "mediaDiv" } } );

      ok( butter.getTrackEvents( "type", "text" ).length === 1, "One text track event exists." );
      ok( butter.getTrackEvents().length === 2, "Selecting all track events by not providing parameters works." );

      start();
    });
  });

}( window, window.document ));