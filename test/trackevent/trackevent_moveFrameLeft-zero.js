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

  asyncTest( "moveFrameLeft - event at zero", 4, function() {
    createButter( function( butter ) {
      var te = butter.currentMedia.tracks[ 1 ].trackEvents[ 0 ],
          inc = 3,
          oldStart = te.popcornOptions.start,
          oldEnd = te.popcornOptions.end;

      butter.listen( "trackeventupdated", function( e ) {
        butter.unlisten( "trackeventupdated" );

        equal( te.popcornOptions.end, oldEnd, "End time shouldn't have changed" );
        equal( te.popcornOptions.start, oldStart , "Start time should be zero" );

        // MetaKey specified, shrinkage of event when End - Start !> inc
        butter.listen( "trackeventupdated", function( e ) {
          butter.unlisten( "trackeventupdated" );

          equal( te.popcornOptions.start, oldStart, "Start time should be zero" );
          equal( te.popcornOptions.end, oldEnd - inc, "End should have had increment subtracted from it" );

          start();
        });

        oldStart = te.popcornOptions.start;
        oldEnd = te.popcornOptions.end;
        te.moveFrameLeft( inc, true );
      });

      // increment is greater than the start of the track event
      te.moveFrameLeft( inc );
    });
  });

}());
