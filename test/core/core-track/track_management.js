/*global text,expect,ok,module,notEqual,test,window*/

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

(function(window, document, undefined ){
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

  module( "Track", butterLifeCycle );
  asyncTest( "Add, retrieve, and remove Track", 10, function(){

    createButter( function( butter ){

      var trackState = 0,
          m = butter.addMedia(),
          t1,
          t2,
          t3;

      butter.listen( "trackadded", function( track ){
        trackState = [ 1, track.data ];
      });
      butter.listen( "trackremoved", function( track ){
        trackState = [ 0, track.data ];
      });

      t1 = m.addTrack( { name: "Track 1" } );
      ok( trackState[ 0 ] === 1 && trackState[ 1 ] === t1, "trackadded event received" );

      t2 = m.addTrack( { name: "Track 2" } );
      ok( trackState[ 0 ] === 1 && trackState[ 1 ] === t2, "trackadded event received" );

      ok( m.getTrackById( t1.id ) === t1 &&
          m.getTrackById( t1.id ).name === "Track 1",
          "Track generation method 1");
      ok( m.getTrackById( t2.id ) === t2 &&
          m.getTrackById( t2.id ).name === "Track 2",
          "Track generation method 2");

      m.removeTrack( t1 );
      ok( trackState[ 0 ] === 0 && trackState[ 1 ] === t1, "trackremoved event received" );
      m.removeTrack( t2 );
      ok( trackState[ 0 ] === 0 && trackState[ 1 ] === t2, "trackremoved event received" );

      ok( m.getTrackById( t1.id ) === undefined, "Track 1 doesn't exist" );
      ok( m.getTrackById( t2.id ) === undefined, "Track 2 doesn't exist" );

      ok( butter.tracks.length === 0, "There are no Tracks" );

      t3 = m.addTrack( { name: "Track 3", target: "Target 1" } );
      m.addTrack( t3 );
      t3.addTrackEvent( { name: "TrackEvent 49", type: "test" } );
      ok( t3.target === "Target 1", "TrackEvents inherit target when track target is set" );

      start();
    });
  });

}( window, window.document ));