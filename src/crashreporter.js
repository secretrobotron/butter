/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

/**
 * Module: CrashReporter
 *
 * Provides backend and UI for the crash reporter
 */
define( [ "dialog/dialog", "util/xhr", "util/uri" ], function( Dialog, XHR, URI ) {

  // Only deal with errors we cause
  function shouldHandle( url ) {
    return URI.parse( url ).host === window.location.hostname;
  }

  return {
    init: function() {
      // Cache existing window.onerror
      var _onerror = window.onerror ? window.onerror : function(){ return true; },
          _dialog;

      window.onerror = function( message, url, lineno ) {
        if( !window.XMLHttpRequest ) {
          return _onerror();
        }

        // Only handle cases we care about, since things like YouTube embeds can
        // (and do!) throw dozens of cross-origin errors which aren't fatal.
        if( !shouldHandle( url ) ) {
          return _onerror();
        }

        // Only show the reporter once, even if there are multiple errors
        if( _dialog ) {
          return _onerror();
        }

        // Be careful about trusting our objects if we've crashed.
        var popcornVersion = window.Popcorn ? window.Popcorn.version : "unknown",
            butterVersion = window.Butter ? window.Butter.version : "unknown",
            crashReport = {
              message: message,
              url: url,
              lineno: lineno,
              userAgent: navigator.userAgent,
              popcornVersion: popcornVersion,
              butterVersion: butterVersion,
              onSendReport: sendErrorReport,
              onNoReport: attemptRecovery
            };

        // Once report is sent, force a reload of the page with
        // recover=1 so we try to get user's backup data.
        function attemptRecovery() {
          // Remove the "Are you sure?" navigation check, since we have to reload
          window.onbeforeunload = null;
          location.search = "?recover=" + Date.now();
        }

        function sendErrorReport( comments ) {
          delete crashReport.onSendReport;
          delete crashReport.onNoReport;
          crashReport.comments = comments;
          XHR.post( "/report", JSON.stringify( crashReport, null, 4 ), attemptRecovery, "text/json" );
        }

        if( Dialog && Dialog.spawn ) {
          try {
            _dialog = Dialog.spawn( "crash", { data: crashReport } );
            _dialog.open();
          }
          catch( e ) {
            attemptRecovery();
          }
        }

        return _onerror();
      };
    },
    test: function() {
      setTimeout(function() {
        throw "Test";
      }, 1);
    }
  };
});
