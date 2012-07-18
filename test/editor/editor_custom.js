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

  asyncTest( "Custom editor", 10, function() {

    var layoutSrc = "<div class=\"butter-editor\">" +
                    "  <div class=\"error-message-container\">" +
                    "    <div class=\"content-container\"></div>" +
                    "    <div class=\"error-message\"></div>" +
                    "  </div>" +
                    "</div>";

    var createdManifestItems = [],
        createdManifestItems2 = [];

    Butter.Editor.register( "text", layoutSrc, function( rootElement, butter ) {
      Butter.Editor.TrackEventEditor( this, butter, rootElement, {
        open: function( parentElement, trackEvent ) {
          var contentContainer = rootElement.querySelector( ".content-container" );

          this.createPropertiesFromManifest( trackEvent,
            function( elementType, element, trackEvent, name ){
              createdManifestItems.push( name );
            }, null, rootElement.querySelector( ".content-container" ), [ "start", "end", "target" ] );

          ok( createdManifestItems.indexOf( "start" ) === -1, "start not created from manifest" );
          ok( createdManifestItems.indexOf( "end" ) === -1, "end not created from manifest" );
          ok( createdManifestItems.indexOf( "target" ) === -1, "target not created from manifest" );
          ok( createdManifestItems.indexOf( "escape" ) > -1, "escape created from manifest" );
          ok( createdManifestItems.indexOf( "multiline" ) > -1, "multiline created from manifest" );
          ok( createdManifestItems.indexOf( "text" ) > -1, "text created from manifest" );

          this.createPropertiesFromManifest( trackEvent,
            function( elementType, element, trackEvent, name ){
              createdManifestItems2.push( name );
            }, [ "start" ] );

          ok( createdManifestItems2.indexOf( "start" ) > -1, "text created from manifest" );

          ok( contentContainer.querySelectorAll( "*" ).length > 0, ".content-container was filled with manifest items" );
          var startElement = rootElement.querySelector( "[data-manifest-key='start']" ).parentNode;
          ok( startElement, "start element was created with correct data-manifest-key" );
          ok( startElement.parentNode === rootElement, "start element was created outside of content-container" );

        },
        close: function() {
        }
      });
    });

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
      start();
    });
  });

});