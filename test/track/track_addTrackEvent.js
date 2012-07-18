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

  asyncTest( "addTrackEvent functionality", 5, function() {
    createButter( function( butter ) {
      var t = butter.tracks[ 0 ],
          numTrackEvents = t.trackEvents.length;

      butter.listen( "trackeventadded", function( e ) {
        var popcornOptions = e.data.popcornOptions;

        butter.unlisten( "trackeventadded" );
        equal( ++numTrackEvents, t.trackEvents.length, "Total number of track events increased" );
        equal( e.data.type, defaultEvent.type, "Correct trackevent type of text" );
        equal( popcornOptions.start, defaultEvent.popcornOptions.start, "Correct start time of 2" );
        equal( popcornOptions.end, defaultEvent.popcornOptions.end, "Correct end time of 5" );
        equal( popcornOptions.text, defaultEvent.popcornOptions.text, "Correct text of '" + defaultEvent.popcornOptions.text + "'" );
        start();
      });

      t.addTrackEvent( defaultEvent );
    });
  });

}());

