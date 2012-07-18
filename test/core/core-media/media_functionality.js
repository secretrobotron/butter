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
  asyncTest( "Simple Media functionality", 6, function(){

    createButter( function( butter ){

      var m1 = butter.addMedia( { media: "test" } ),
          state = [ 0, 0 ];

      butter.listen( "mediatimeupdate", function( media ){
        state[ 0 ] = 1;
      });
      butter.listen( "mediadurationchanged", function( media ){
        state[ 1 ] = 1;
      });

      m1.duration = 2;
      ok( m1.duration === 2, "duration is correct" );
      m1.currentTime = 1;
      ok( m1.currentTime === 1, "currentTime is correct" );
      ok( state[ 0 ] === 1 && state[ 1 ] === 1, "events fired" );

      state = [ 0, 0 ];
      butter.duration = 5;
      ok( butter.duration === 5, "duration is correct" );
      butter.currentTime = 2;
      ok( butter.currentTime === 2, "currentTime is correct" );
      ok( state[ 0 ] === 1 && state[ 1 ] === 1, "events fired" );

      start();
    });
  });

}( window, window.document ));