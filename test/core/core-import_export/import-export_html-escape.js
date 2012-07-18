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

  module( "Import/Export", butterLifeCycle );
  asyncTest( "Exported HTML Escape", 1, function() {

    createButter( function( butter ){
      var m1 = butter.addMedia( { url:"../../../external/popcorn-js/test/trailer.ogv", target:"mediaDiv" } );

      butter.listen( "mediaready", function( e ) {
        t1 = m1.addTrack();
        var messedUpString = "this'" + 'should"' + '""""""b"e' + "f'i'ne";
        te1 = t1.addTrackEvent( { popcornOptions: { start: 0, end: 6, text: messedUpString, target: "stringSanity" }, type: "text" } );
        butter.addTarget( { name: "beep" } );

        var func = Function( "", m1.generatePopcornString() );
            pop = func();

        equals( document.getElementById( "stringSanity" ).children[ 0 ].innerHTML, messedUpString, "String escaping in exported HTML is fine" );

        start();
      });
    });
  });

}( window, window.document ));