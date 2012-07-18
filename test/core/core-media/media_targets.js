/*global text,expect,ok,module,notEqual,test,window*/

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

(function(window, document, undefined ){

  window._testInitCallback = function(){};
  window._testBeforeCallback = function(){};
  window._testAfterCallback = function(){};

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

  })();

  function createButter( callback ){

    Butter({
      config: "../test-config.json",
      debug: false,
      ready: function( butter ){
        butterLifeCycle.rememberButter( butter );
        callback( butter );
      }
    });
  } //createButter

  module( "Media", butterLifeCycle );
  asyncTest( "Media targets", 1, function(){
    var videoDiv = document.createElement( "video" );
    videoDiv.id = "media-target-test-div";
    videoDiv.setAttribute( "data-butter", "media" );
    videoDiv.setAttribute( "src", "../../../external/popcorn-js/test/trailer.ogv" );
    document.body.appendChild( videoDiv );

    createButter( function( butter ) {
      butter.config.value( "scrapePage", true );
      butter.preparePage(function(){
        var media = butter.media[0];

        media.listen( "mediaready", function(){

          var popcornTextPlugin = document.createElement( "script" );
          popcornTextPlugin.src = "../../../external/popcorn-js/plugins/text/popcorn.text.js";
          document.head.appendChild( popcornTextPlugin );

          var trackEvent = media.addTrack().addTrackEvent({
                type: "text",
                popcornOptions: {
                  start: 1,
                  end: 2,
                  text: "LOL",
                  target: "media-target-test-div"
                }
              });
          media.currentTime = 1.5;
          var contentDiv = document.getElementById( "media-target-test-div-overlay" );
          ok( contentDiv.childNodes[0].innerHTML === "LOL", "Media has target div with correct content." );
          start();
          document.body.removeChild( videoDiv );
          document.head.removeChild( popcornTextPlugin );
        });
      });
    });

  });
}( window, window.document ));