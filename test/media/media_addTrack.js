/*global Butter,asyncTest,equal,start*/
require( [ "../src/core/track" ], function( Track ) {
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

  asyncTest( "addTrack functionality", 1, function() {
    createButter( function( butter ) {
      var track = new Track( { name: "TestTrack" } );

      butter.listen( "trackadded", function( e ) {

        butter.unlisten( "trackadded" );
        equal( e.data.name, track.name, "addTrack returned expected track" );
        start();
      });

      butter.currentMedia.addTrack( track );
    });
  });

});