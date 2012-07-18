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


  module( "Core - Popcorn scripts", butterLifeCycle );
  asyncTest( "No scripts/callbacks", 1, function(){
    var succeeded = false;

    setTimeout(function(){
      if( !succeeded ){
        ok( false, "Timeout! Ready not called. Script load skipping failed." );
        start();
      }
    }, 2000);

    Butter({
      config: "../test-simple-config.json",
      debug: false,
      ready: function( butter ){

        butterLifeCycle.rememberButter( butter );
        butter.preparePopcornScriptsAndCallbacks(function(){
          succeeded = true;
          ok( true, "Ready called without any scripts/callbacks." );

          start();
        });
      }
    });
  });

})( window, window.document );