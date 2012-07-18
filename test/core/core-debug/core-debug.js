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

  module( "Core - Debug", butterLifeCycle );
  asyncTest( "Debug enables/disables logging", 4, function() {

    createButter(function( butter ) {

      var count = 0,
          oldLog;
      equals( butter.debug, false, "debugging is initially false, logging should be enabled" );
      oldLog = console.log;
      console.log = function() {
        count++;
      };
      function ready() {
        equals( count, 0, "No logging was done, debug is correctly suppressing events" );
        butter.debug = true;
        equals( butter.debug, true, "debug setter working correctly" );
        butter.unlisten( "mediaready", ready );
        butter.listen( "mediaready", function() {
          equals( count, 1, "1 log was caught, events are being logged again" );
          start();
          console.log = oldLog;
        });
        butter.addMedia({ url: "../../../external/popcorn-js/test/trailer.ogv", target: "mediaDiv" });
      }
      butter.listen( "mediaready", ready );
      butter.addMedia({ url: "../../../external/popcorn-js/test/trailer.ogv", target: "mediaDiv" });

    });
  });

}( window, window.document ));