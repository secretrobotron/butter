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

  module( "Player tests", butterLifeCycle );
  // Make sure HTML5 audio/video, youtube, and vimeo work
  asyncTest( "Test basic player support", 5, function() {

    createButter( function( butter ) {
      var mediaURLS = [ "http://www.youtube.com/watch?v=7glrZ4e4wYU",
          "../../../external/popcorn-js/test/italia.ogg" ],
          index = 0,
          count = 0;

      equals( butter.currentMedia, undefined, "Initially there is no media" );

      function mediaReady() {
        ok( true, "Media changed triggered" + mediaURLS[ index ] );
        equals( butter.currentMedia.url, mediaURLS[ index ], "The currentMedia's url is equal to the one that has been set" );

        if( mediaURLS[ index + 1 ] === undefined ) {
          butter.unlisten( "mediaready", mediaReady );
          start();
        }

        butter.currentMedia = butter.addMedia({ url: mediaURLS[ ++index ], target: "mediaDiv" });
      }

      butter.listen( "mediaready", mediaReady );
      butter.addMedia({ url: mediaURLS[ index ], target: "mediaDiv" });
    });
  });

}( window, window.document ));
