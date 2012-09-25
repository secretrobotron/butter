/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

/**
 * Module: CrashReporter
 *
 * Provides backend and UI for the crash reporter
 */
define( [ "dialog/dialog" ], function( Dialog ){

  return {

    init: function() {
      window.onerror = function( message, url, lineno ) {
        if( !window.XMLHttpRequest ) {
          return _onerror();
        }

        // Cache existing window.onerror
        var _onerror = window.onerror ? window.onerror : function(){ return true; };

        // Be careful about trusting our objects if we've crashed.
        var popcornVersion = window.Popcorn ? window.Popcorn.version : "unknown",
            butterVersion = window.Butter ? window.Butter.version : "unknown",
            crashReport = {
              message: message,
              url: url,
              lineno: lineno,
              userAgent: navigator.userAgent,
              popcornVersion: popcornVersion,
              butterVersion: butterVersion
            };

        var dialog = Dialog.spawn( "crash", { data: crashReport } );
        dialog.open();

        return _onerror();
      };
    },

    // Send the crash report to Mozilla
    send: function( report, callback ) {
      //XXXhumph: need to post data to node. See crashReport obj above for format
      callback();
    }
  };
});
