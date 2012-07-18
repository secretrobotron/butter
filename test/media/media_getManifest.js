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

  asyncTest( "getManifest functionality", function() {
    createButter( function( butter ) {
      var fakeManifest = {
            stuff: "stuff",
            stuff2: "stuff2",
            moreStuff: "even more stuff"
          },
          retrievedItem;

      // First need to set a fake manifest
      butter.currentMedia.registry = fakeManifest;

      retrievedItem = butter.currentMedia.getManifest( "stuff" );
      equal( retrievedItem, fakeManifest.stuff, "Retrieved the correct manifest information" );
      start();
    });
  });

});