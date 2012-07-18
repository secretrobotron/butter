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
  asyncTest( "Add, retrieve, and remove TrackEvent", 13, function(){

    createButter( function( butter ){

      var eventState = 0,
          m = butter.addMedia(),
          t = m.addTrack();

      butter.listen( "trackeventadded", function( trackEvent ){
        eventState = [ 1, trackEvent.data ];
      });
      butter.listen( "trackeventremoved", function( trackEvent ){
        eventState = [ 0, trackEvent.data ];
      });

      var te1 = t.addTrackEvent( { name: "TrackEvent 1", type: "test", start: 0, end: 1 } );
      ok( eventState[ 0 ] === 1 && eventState[ 1 ] === te1, "trackeventadded event received" );

      var te2 = t.addTrackEvent( { name: "TrackEvent 2", type: "test", start: 1, end: 2 } );
      ok( eventState[ 0 ] === 1 && eventState[ 1 ] === te2, "trackeventadded event received" );

      var te3 = t.addTrackEvent( { name: "TrackEvent 3", type: "test", start: 2, end: 3 } );
      ok( eventState[ 0 ] === 1 && eventState[ 1 ] === te3, "trackeventadded event received" );

      ok( te1 === t.getTrackEventByName( "TrackEvent 1" ), "TrackEvent method 1 is correct" );
      ok( te2 === t.getTrackEventByName( "TrackEvent 2" ), "TrackEvent method 2 is correct" );
      ok( te3 === t.getTrackEventByName( "TrackEvent 3" ), "TrackEvent method 3 is correct" );

      t.removeTrackEvent( te1 );
      ok( eventState[ 0 ] === 0 && eventState[ 1 ] === te1, "trackeventremoved event received" );
      t.removeTrackEvent( te2 );
      ok( eventState[ 0 ] === 0 && eventState[ 1 ] === te2, "trackeventremoved event received" );
      t.removeTrackEvent( te3 );
      ok( eventState[ 0 ] === 0 && eventState[ 1 ] === te3, "trackeventremoved event received" );

      ok( t.getTrackEventByName( "TrackEvent 1" ) === undefined, "TrackEvent 1 doesn't exist" );
      ok( t.getTrackEventByName( "TrackEvent 2" ) === undefined, "TrackEvent 2 doesn't exist" );
      ok( t.getTrackEventByName( "TrackEvent 3" ) === undefined, "TrackEvent 3 doesn't exist" );

      var tracks = butter.tracks;
      for ( var track in tracks ) {
        ok( tracks[ track ].trackEvents.length === 0, "No TrackEvents remain" );
      }

      start();
    });

  });

}( window, window.document ));