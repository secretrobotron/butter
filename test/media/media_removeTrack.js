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

  asyncTest( "removeTrack functionality", 2, function() {
    createButter( function( butter ) {
      var tracks = butter.currentMedia.tracks,
          trackOne = tracks[ 0 ],
          trackTwo = tracks[ 1 ],
          trackEvent = trackTwo.trackEvents[ 0 ];

      butter.listen( "trackremoved", function( e ) {

        butter.unlisten( "trackremoved" );
        butter.listen( "trackeventremoved", function( e ) {

          butter.unlisten( "trackeventremoved" );
          equal( e.data.id, trackEvent.id, "Successfully sent trackeventremoved for the trackevent on the track" );
          start();
        });

        equal( e.data.id, trackOne.id, "Removed the correct track" );

        butter.currentMedia.removeTrack( trackTwo );
      });

      butter.currentMedia.removeTrack( trackOne );
    });
  });

});