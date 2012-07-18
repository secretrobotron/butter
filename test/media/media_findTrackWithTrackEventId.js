/*global Butter,asyncTest,equal,start*/
require( [], function() {
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

  }());

  function createButter( callback ){

    Butter({
      config: "../test-config-core.json",
      debug: false,
      ready: function( butter ){
        butterLifeCycle.rememberButter( butter );
        callback( butter );
      }
    });
  }

  module( "Media", butterLifeCycle );

  asyncTest( "findTrackWithTrackEventId functionality", 1, function() {
    createButter( function( butter ) {
      var track = butter.currentMedia.tracks[ 0 ],
          trackEvent,
          receivedTrack;

      // None of my tracks have events right now, adding a new one
      track.addTrackEvent();
      trackEvent = track.trackEvents[ 0 ];

      receivedTrack = butter.currentMedia.findTrackWithTrackEventId( trackEvent.id );
      equal( receivedTrack.track.id, track.id, "Received expected track with id " + track.id );
      start();
    });
  });

});