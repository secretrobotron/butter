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

  module( "Dialog" );
  asyncTest( "Basic usage", 4, function(){

    var testDialogSrc = "" +
        "<div class=\"butter-dialog\">" +
        "</div>";

    Butter({
      config: "../test-config.json",
      ready: function( butter ) {
        butter.dialog.register( "test", testDialogSrc, function( internal ){
          internal.listen( "test", function( e ){
            internal.send( "test", "test" );
          });
        });
        var external = butter.dialog.spawn( "test" );
        external.listen( "test", function( e ){
          ok( true, "Communication channels open" );
          ok( butter.dialog.modal.element.querySelector( ".butter-dialog" ) === external.element, "Dialog element is correct and on page." );
        });

        external.listen( "open", function(){
          external.send( "test" );
          ok( true, "Open handler called." );
          external.listen( "close", function(){
            ok( true, "Close handler called." );
            start();
          });
          external.close();
        });
        external.open();
      }
    });

  });

}( window, window.document ));