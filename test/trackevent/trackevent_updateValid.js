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

  asyncTest( "update w/ valid options", 5, function() {
    createButter( function( butter ) {
      var t = butter.currentMedia.tracks[ 0 ],
          te;

      butter.listen( "trackeventupdated", function( e ) {
        butter.unlisten( "trackeventupdated" );
        equal( e.data.popcornOptions.start, 0, "Applied correct default start time" );
        equal( e.data.popcornOptions.end, 1, "Applied correct default end time" );

        butter.listen( "trackeventupdated", function( e ) {
          butter.unlisten( "trackeventupdated" );
          equal( e.data.popcornOptions.start, 5, "Correctly applied new start time" );
          equal( e.data.popcornOptions.end, 10, "Correctly applied new end time" );
          equal( e.data.popcornOptions.text, "This is a test", "Correctly applied new text value" );

          start();
        });

        te = t.addTrackEvent( defaultEvent );
        te.update( { start: 5, end: 10, text: "This is a test" } );
      });

      te = t.addTrackEvent( { name: "TestEvent" } );
      // Checking Defaults
      te.update();
    });
  });

}());
