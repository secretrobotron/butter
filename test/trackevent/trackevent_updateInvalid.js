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

  asyncTest( "update w/ invalid options", 4, function() {
    createButter( function( butter ) {
      butter.currentMedia.onReady( function() {
        var te = butter.currentMedia.tracks[ 1 ].trackEvents[ 0 ];

        try {
          te.update( { start: "m", end: 3 } );
        } catch( e ) {
          equal( e.reason, "invalid-start-time", "Correctly caught " + e.reason );

          try {
            te.update( { start: 1, end: "m" } );
          } catch( e2 ) {
            equal( e2.reason, "invalid-end-time", "Correctly caught " + e2.reason );

            try {
              te.update( { start: 10, end: 8 } );
            } catch( e3 ) {
              equal( e3.reason, "start-greater-than-end", "Correctly caught " + e3.reason );

              try {
                te.update( { start: 5, end: 800 } );
              } catch( e4 ) {
                equal( e4.reason, "invalid-times", "Correctly caught " + e4.reason );
                start();
              }
            }
          }
        }
      });
    });
  });

}());
