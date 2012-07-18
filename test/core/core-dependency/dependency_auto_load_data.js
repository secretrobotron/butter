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

  module( "Dependency Loader", butterLifeCycle );
  asyncTest( "Auto-load saved data", 4, function(){

    Butter({
      config: "../test-config-auto-load.json",
      ready: function( butter ){
        butterLifeCycle.rememberButter( butter );
        equal( butter.media.length, 1, "One media created" );
        equal( butter.media[0].tracks.length, 2, "Two tracks created" );
        equal( butter.media[0].tracks[0].trackEvents.length, 0, "Track 1 has no events" );
        equal( butter.media[0].tracks[1].trackEvents.length, 1, "Track 2 has one event" );
        start();
      }
    });

  });

}( window, window.document ));