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

    window.onerror = function( message, url, lineno ) {
      if( !window.XMLHttpRequest ) {
        return _onerror();
      }

      // Be careful about trusting our objects if we've crashed.
      var popcornVersion = window.Popcorn ? window.Popcorn.version : "unknown",
          butterVersion = window.Butter ? window.Butter.version : "unknown";

      console.log( message, url, lineno, navigator.userAgent, popcornVersion, butterVersion );

      var dialog = Dialog.spawn( "crash" );
      dialog.open();

      return _onerror();
    };

  };

});
