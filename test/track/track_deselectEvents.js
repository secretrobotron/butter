/*global Butter,asyncTest,equal,start*/
(function(){
  var defaultEvent = {
        type: "text",
        popcornOptions: {
          start: 2,
          end: 5,
          text: "This is a test"
        }
      };

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

  module( "Track", butterLifeCycle );

  asyncTest( "deselectEvents", 2, function() {
    createButter( function( butter ) {
      var t = butter.tracks[ 0 ],
          te1,
          te2;

      te1 = t.addTrackEvent( defaultEvent );
      te2 = t.addTrackEvent( defaultEvent );

      //Set both track events to being selected
      te1.selected = te2.selected = true;

      t.deselectEvents( te1 );

      te1 = t.getTrackEventById( te1.id );
      te2 = t.getTrackEventById( te2.id );

      equal( te1.selected, true, "Track should still be selected" );
      equal( te2.selected, false, "Track shouldn't be selected" );
      start();
    });
  });

}());

