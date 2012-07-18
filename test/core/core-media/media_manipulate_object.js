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

  asyncTest( "Add, retrieve, use, and remove Media object", 16, function(){

    createButter( function( butter ){

      var mediaState = 0,
          mediaEventState = 0,
          mediaContent,
          mediaTarget;

      butter.listen("mediaadded", function( media ){
        mediaEventState--;
        mediaState = [ 1, media.data ];
      });
      butter.listen("mediachanged", function( media ){
        mediaEventState *= 2;
        mediaState = [ 2, media.data ];
      });
      butter.listen( "mediaremoved", function( media ){
        mediaState = [ 0, media.data ];
      });

      var m1 = butter.addMedia( { name: "Media 1", target: "audio-test", url: "../../../external/popcorn-js/test/trailer.ogv" } ),
          m2;

      ok( mediaEventState === -2, "Media events received in correct order" );
      ok( butter.getMediaByType( "name" , "Media 1" ) === m1 && m1.name === "Media 1", "Method 1 object stored and retrieved" );

      m2 = butter.addMedia( { name: "Media 2", media: document.getElementById("audio-test") } );

      ok( butter.getMediaByType( "name", "Media 2" ) === m2 && m2.name === "Media 2", "Method 2 object stored and retrieved" );
      ok( mediaState[ 0 ] === 1 && mediaState[ 1 ] === m2, "mediaadded event received" );
      ok( butter.currentMedia === m1, "Current media is Media 1" );

      butter.currentMedia = m2;
      ok( mediaState[ 0 ] === 2 && mediaState[ 1 ] === m2, "mediachanged event received" );
      ok( butter.currentMedia === m2, "Current media is Media 2" );

      butter.currentMedia = m1;
      ok( butter.currentMedia === m1, "Current media is Media 1 again" );
      ok( mediaState[ 0 ] === 2 && mediaState[ 1 ] === m1, "mediachanged event received" );

      mediaContent = m1.url;
      mediaTarget = m1.target;

      butter.listen( "mediacontentchanged", function( e ){
        mediaContent = e.data.url;
      });
      butter.listen( "mediatargetchanged", function( e ){
        mediaTarget = e.data.target;
      });

      var targetDiv = document.createElement( "div" );
      targetDiv.style.display = "none";
      targetDiv.id = "audio-foo";
      document.body.appendChild( targetDiv );
      m1.target = targetDiv;
      m1.url = "www.mozilla.org";
      ok( mediaTarget.id === "audio-foo", "Media target changed properly" );
      ok( mediaContent === "www.mozilla.org", "Media content changed properly" );

      butter.removeMedia( m2 );
      ok( mediaState[ 0 ] === 0 && mediaState[ 1 ] === m2, "mediaremoved event received" );
      butter.removeMedia( m1 );
      ok( mediaState[ 0 ] === 0 && mediaState[ 1 ] === m1, "mediaremoved event received" );

      ok( butter.getMediaByType( "name", "Media 1" ) === undefined, "Media 1 doesn't exist" );
      ok( butter.getMediaByType( "name", "Media 2" ) === undefined, "Media 2 doesn't exist" );

      ok( butter.media.length === 0, "There are no Media" );

      start();
    });
  });

}( window, window.document ));