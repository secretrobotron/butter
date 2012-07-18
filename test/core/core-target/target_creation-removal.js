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
  asyncTest( "Target creation and removal", 24, function() {

    createButter(function( butter ) {

      var targets,
          elem = document.createElement( "div" );

      elem.id = "targetID";
      document.body.appendChild( elem );

      equals( typeof butter.getTargetByType, "function", "butter instance has the getTargetByType function" );
      equals( typeof butter.addTarget, "function", "butter instance has the addTarget function" );
      equals( typeof butter.removeTarget, "function", "butter instance has the removeTarget function" );
      equals( typeof butter.targets, "object", "butter instance has a targets array" );

      var t1 = butter.addTarget({ name: "Target 2" });
      var t2 = butter.addTarget({ element: "targetID" });
      var t3 = butter.addTarget();

      targets = butter.targets;
      equals( targets.length, 3, "targets array has 3 items ( 3 targets )" );

      for( var i = 0, l = targets.length; i < l; i++ ) {
        equals( targets[ i ].id, "Target" + i, "Target " + (i + 1) + " has the correct id" );
      }

      equals( targets[ 0 ].name, "Target 2", "Target 2 has the correct name" );
      equals( typeof targets[ 1 ].element, "object", "Target 3 element exists" );
      equals( targets[ 1 ].element.id, "targetID", "Target 3 element is correct" );
      ok( targets[ 2 ], "empty target is acceptable" );

      equals( butter.getTargetByType( "name", "Target 2" ).name, targets[ 0 ].name, "getting target by name works properly" );
      equals( butter.getTargetByType( "id", "Target2" ).id, targets[ 2 ].id, "getting target by id works properly" );
      equals( butter.getTargetByType( "element", targets[ 1 ].element).element, targets[ 1 ].element, "getting target by element works properly" );

      for( var i = targets.length, l = 0; i > l; i-- ) {
        var targs = butter.targets;
        equals( targs.length, i, "Before removal: " + i + " targets" );
        butter.removeTarget( targs[ i - 1 ] );
        ok( !targs[ i - 1], "Target " + (i - 1) + " no longer exists" );
        equals( targs.length, i - 1, "After removal: " + (i - 1) + " targets" );
      }

      start();
    });
  });

}( window, window.document ));
