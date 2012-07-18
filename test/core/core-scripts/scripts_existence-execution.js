/*global text,expect,ok,module,notEqual,test,window*/

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

(function(window, document, undefined ){
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

  module( "Core - Popcorn scripts", butterLifeCycle );
  asyncTest( "Existence and execution", 6, function(){

    createButter( function( butter ){

      var theZONE = "";

      window._testInitCallback = function(){ theZONE += "i"; };
      window._testBeforeCallback = function(){ theZONE += "b"; };
      window._testAfterCallback = function(){ theZONE += "a" };

      var initScript = document.createElement( "script" );
      initScript.innerHTML = '"inline test init from element"';
      initScript.id = "init-script";
      document.head.appendChild( initScript );

      var m1 = butter.addMedia( { name: "Media 1", target: "audio-test", url: "../../../external/popcorn-js/test/trailer.ogv" } );

      m1.onReady(function(){
        butter.preparePopcornScriptsAndCallbacks(function(){
          document.head.removeChild( initScript );
          var exported = butter.getHTML();
          ok( exported.indexOf( "inline test init from element" ) > -1, "found init script" );
          ok( exported.indexOf( "inline test before" ) > -1, "found before script" );
          ok( exported.indexOf( "inline test after" ) > -1, "found after script" );
          ok( theZONE.indexOf( "i" ) > -1, "init callback called" );
          ok( theZONE.indexOf( "b" ) > -1, "before callback called" );
          ok( theZONE.indexOf( "a" ) > -1, "after callback called" );

          start();
        });
      });

    });
  });

}( window, window.document ));