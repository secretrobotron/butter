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

  function createButter( callback ){

    Butter({
      config: "../test-config-core.json",
      debug: false,
      ready: function( butter ){
        callback( butter );
      }
    });
  }

  module( "Track" );

  asyncTest( "removeTrackEvent", 1, function() {
    createButter( function( butter ) {
      var t = butter.tracks[ 0 ],
          te = t.addTrackEvent( defaultEvent );

      butter.listen( "trackeventremoved", function( e ) {
        butter.unlisten( "trackeventremoved" );

        equal( e.data.id, te.id, "Removed correct track event" );
        start();
      });

      t.removeTrackEvent( te );
    });
  });

}());

