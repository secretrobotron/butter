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
  asyncTest( "Media objects have their own tracks", 4, function(){

    createButter( function( butter ){

      var m1 = butter.addMedia(),
          m2 = butter.addMedia();

      var t1 = m1.addTrack( { name: "Track 1" } );
      butter.currentMedia = m2;
      var t2 = m2.addTrack( { name: "Track 2" } );
      butter.currentMedia = m1;

      ok( m1.getTrackById( t1.id ) !== undefined, "Track 1 is on Media 1");
      ok( m1.getTrackById( t2.id ) === undefined, "Track 2 is not on Media 1");

      butter.currentMedia = m2;

      ok( m2.getTrackById( t1.id ) === undefined, "Track 1 is not on Media 1");
      ok( m2.getTrackById( t2.id ) !== undefined, "Track 2 is on Media 1");

      start();
    });
  });

}( window, window.document ));