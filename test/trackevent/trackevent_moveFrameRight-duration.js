/*global Butter,asyncTest,equal,start*/
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

  var defaultEvent = {
        type: "text",
        popcornOptions: {
          start: 2,
          end: 5,
          text: "This is"
        }
      };

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

  module( "Track Event", butterLifeCycle );

  asyncTest( "moveFrameRight - hitting media duration", function() {
    createButter( function( butter ) {
      butter.currentMedia.onReady( function() {
        var duration = butter.currentMedia.duration,
            te = butter.currentMedia.tracks[ 1 ].trackEvents[ 0 ],
            inc = 62,
            oldStart = te.popcornOptions.start,
            oldEnd = te.popcornOptions.end;

        // MetaKey false, simply moving track event
        butter.listen( "trackeventupdated", function( e ) {
          butter.unlisten( "trackeventupdated" );

          var expectedStart = oldStart + ( duration - oldEnd );
          equal( te.popcornOptions.start, expectedStart, "Start time should have been increased" );
          equal( te.popcornOptions.end, duration, "End time should be the duration, as " + oldEnd + " + " + inc + " > " + duration );

          butter.listen( "trackeventupdated", function( e ) {
            butter.unlisten( "trackeventupdated" );

            // MetaKey is used. Start time should not change, end should be duration
            butter.listen( "trackeventupdated", function( e ) {
              butter.unlisten( "trackeventupdated" );

              equal( te.popcornOptions.start, oldStart, "Start shouldn't have changed" );
              equal( te.popcornOptions.end, duration, "End should have been set to the duration" );

              start();
            });

            oldStart = te.popcornOptions.start;
            oldEnd = te.popcornOptions.end;
            te.moveFrameRight( inc, true );
          });

          // resetting the times of the track event
          te.update( { start: 5, end: 10 } );
        });

        te.moveFrameRight( inc );
      });
    });
  });

}());
