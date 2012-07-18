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
  asyncTest( "Export HTML snapshotting", 1, function() {

    createButter( function( butter ){

      var m1 = butter.addMedia( { url:"../../../external/popcorn-js/test/trailer.ogv", target:"mediaDiv" } );

      butter.listen( "mediaready", function( e ) {
        butter.page.snapshotHTML();

        t1 = m1.addTrack();
        te1 = t1.addTrackEvent({
          popcornOptions: {
            start: 0,
            end: 6,
            text: "OBVIOUS",
            target: "stringSanity"
          },
          type: "text"
        });

        equals( butter.getHTML().match( "OBVIOUS" ).length, 1, "TrackEvent wasn't exported" );

        start();
      });
    });
  });

}( window, window.document ));