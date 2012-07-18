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

  module( "Core - Target", butterLifeCycle );
  asyncTest( "Target serialization", 4, function(){

    createButter( function( butter ){

      var tempElement = document.createElement( "div" ),
          sTargs,
          targs;

      tempElement.id = "targetID";
      document.body.appendChild( tempElement );

      butter.addMedia();

      butter.addTarget( { name:"T1" } );
      butter.addTarget( { name:"T2", element: "targetID" } );

      sTargs = butter.serializeTargets();
      targs = butter.targets;
      ok( sTargs[ 0 ].name === targs[ 0 ].name, "first target name is correct" );
      ok( sTargs[ 1 ].name === targs[ 1 ].name, "second target name is correct" );
      ok( sTargs[ 0 ].element === "", "serialized target defaults safely to empty string" );
      ok( sTargs[ 1 ].element === "targetID", "serialized target return's correct element ID" );

      document.body.removeChild( tempElement );
      delete tempElement;

      start();
    });
  });

}( window, window.document ));