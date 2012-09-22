/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

/**
 * Module: CrashReporter
 *
 * Provides backend and UI for the crash reporter
 */
define( [ "dialog/dialog" ], function( Dialog ){

  // Cache existing window.onerror
  var _onerror = window.onerror ? window.onerror : function(){ return true; },
      _butter;

  return function( butter ) {

console.log('here');
    window.onerror = function( message, url, lineno ) {
      if( !window.XHLHttpRequest ) {
        return _onerror();
      }

      console.log(message, url, lineno, navigator.userAgent);

      var dialog = Dialog.span( "crash" );
      dialog.open();

      return _onerror();
    };

    window.foo = function(){ window.onerror(); };

  };

});
