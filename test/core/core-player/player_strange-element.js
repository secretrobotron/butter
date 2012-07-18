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
  asyncTest( "Test strange div/video player support", 4, function(){

    var el = document.createElement( "video" ),
        qunit = document.getElementById( "qunit-fixture" );
    el.setAttribute( "data-butter-source", "http://www.youtube.com/watch?v=7glrZ4e4wYU" );
    el.setAttribute( "data-butter", "media" );
    el.id = "strange-test-1";
    qunit.appendChild( el );

    createButter(function( butter ){
      butter.config.value( "scrapePage", true );
      butter.preparePage(function(){
        ok( butter.media.length > 0 && butter.media[0].url === "http://www.youtube.com/watch?v=7glrZ4e4wYU", "URL match" );
        ok( document.getElementById( "strange-test-1" ), "New element exists" );
        equals( document.getElementById( "strange-test-1" ).getAttribute( "data-butter-source" ), "http://www.youtube.com/watch?v=7glrZ4e4wYU", "has correct url" );
        equals( document.getElementById( "strange-test-1" ).getAttribute( "data-butter" ), "media", "has correct data-butter attribute" );
        start();
      });
    });
  });

}( window, window.document ));
