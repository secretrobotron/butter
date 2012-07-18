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
  asyncTest( "Remove/Add Track events for constituent TrackEvents", 4, function(){

    createButter( function( butter ){

      var t1,
          te,
          state,
          m;

      m = butter.addMedia();

      t1 = m.addTrack(),
      te = t1.addTrackEvent({ name: "TrackEvent 3", type: "test", start: 2, end: 3 } ),
      state = undefined;

      butter.listen( "trackeventremoved", function( trackEvent ){
        state = trackEvent.data;
      } );

      butter.listen( "trackeventadded", function( trackEvent ){
        state = trackEvent.data;
      } );

      ok( t1.trackEvents.length === 1, "Track event stored" );

      m.removeTrack( t1 );
      ok( state === te, "Track event removal event" );

      state = undefined;

      m.addTrack( t1 );
      ok( state === te, "Track event added again" );
      ok( t1.trackEvents.length === 1, "Track event stored" );

      start();
    });

  });

}( window, window.document ));