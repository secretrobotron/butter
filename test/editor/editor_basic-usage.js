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
      ready: callback
    });
  }

  module( "Editor" );

  asyncTest( "Basic usage", 6, function() {
    createButter( function( butter ) {
      var media = butter.addMedia(),
          track = media.addTrack(),
          trackEvent = track.addTrackEvent({
            type: "text",
            popcornOptions: {
              start: 3,
              end: 6
            }
          });

      var editor = butter.editor.editTrackEvent( trackEvent );
      ok( editor, "Got Editor back from edit call." );
      ok( editor.rootElement.querySelectorAll( ".trackevent-property" ).length, "Default Editor created properties properly." );
      equal( editor.rootElement.querySelector( ".trackevent-property > input[data-manifest-key='start']" ).value, 3, "[start] input box has correct value." );
      equal( editor.rootElement.querySelector( ".trackevent-property > input[data-manifest-key='end']" ).value, 6, "[end] input box has correct value." );
      trackEvent.update({
        start: 1,
        end: 10
      });
      equal( editor.rootElement.querySelector( ".trackevent-property > input[data-manifest-key='start']" ).value, 1, "[start] input box has correct value after update." );
      equal( editor.rootElement.querySelector( ".trackevent-property > input[data-manifest-key='end']" ).value, 10, "[end] input box has correct value after update." );
      start();
    });
  });

});