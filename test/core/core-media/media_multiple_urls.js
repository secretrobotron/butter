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
  asyncTest( "Multiple media urls in media url", 3, function(){
    var videoDiv = document.createElement( "div" );
    videoDiv.id = "media-target-test-div";
    videoDiv.setAttribute( "data-butter", "media" );
    document.body.appendChild( videoDiv );

    createButter( function( butter ) {
      butter.config.value( "scrapePage", true );
      butter.preparePage(function(){
        butter.listen( "mediacontentchanged", function() {
          ok( Array.isArray( butter.currentMedia.url ), "butter.currentMedia.url is array" );
          ok( butter.currentMedia.url[ 0 ].indexOf( "../../../external/popcorn-js/test/trailer.ogv" ) > -1, "media url contains ogv file" ); 
          ok( butter.currentMedia.url[ 1 ].indexOf( "../../../external/popcorn-js/test/trailer.webm" ) > -1, "media url contains webm file" );
          start();
          document.body.removeChild( videoDiv );
        });
        butter.currentMedia.url = [
          "../../../external/popcorn-js/test/trailer.ogv",
          "../../../external/popcorn-js/test/trailer.webm"
        ];
      });
    });
  });

}( window, window.document ));