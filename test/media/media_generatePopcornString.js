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

  asyncTest( "generatePopcornString functionality", function() {
    createButter( function( butter ) {
      var fakeScript = [ "var i = 1 + 1;" ],
          js = butter.currentMedia.generatePopcornString( fakeScript );

      ok( js.indexOf( fakeScript[ 0 ] ), "Generated popcornstring with expected script added" );
      ok( js.indexOf( butter.currentMedia.url ), "Generated popcornstring with expected url" );
      ok( js.indexOf( "{\"frameAnimation\": false}" ), "Frame animation is set to false by generatePopcornString as expected" );
      start();
    });
  });

});
