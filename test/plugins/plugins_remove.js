/*global Butter,asyncTest,equal,start,ok*/
(function(){
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

  function createButter( callback ) {
    Butter({
      config: "../test-config-core.json",
      debug: false,
      ready: function( butter ){
        butterLifeCycle.rememberButter( butter );
        callback( butter );
      }
    });
  }

  module( "Plugins", butterLifeCycle );

  asyncTest( "Remove plugin", 2, function() {
    createButter( function( butter ) {

      var track = butter.media[0].addTrack(),
          trackEvent = track.addTrackEvent({
            type: "text",
            popcornOptions: {
              start: 1,
              stop: 2
            }
          });

      butter.plugin.remove( "text" );

      equal( track.trackEvents.length, 0, "No trackevents of the 'text' type left." );
      equal( !!butter.plugin.get( "text" ), false, "Text plugin removed from registry" );

      start();

    });
  });

}());
