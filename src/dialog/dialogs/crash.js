/* This Source Code Form is subject to the terms of the MIT license
 *  * If a copy of the MIT license was not distributed with this file, you can
 *  * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

define([ "text!dialog/dialogs/crash.html", "dialog/dialog", "crashreporter" ],
  function( LAYOUT_SRC, Dialog, CrashReporter ){
    function formatReport( report ) {
      return "URL: " + report.url + ":" + report.lineno + "\n" +
             "Error: " + report.message + "\n" +
             "Browser: " + report.userAgent + "\n" +
             "Versions: Popcorn=" + report.popcornVersion + ", Butter=" + report.butterVersion;
    }

    Dialog.register( "crash", LAYOUT_SRC, function ( dialog, data ) {

      var rootElement = dialog.rootElement,
          reportTextArea = rootElement.querySelector( "#report" ),
          commentsTextArea = rootElement.querySelector( "#comments" ),
          sendBtn = rootElement.querySelector( ".update" );

      reportTextArea.value = formatReport( data );

      sendBtn.addEventListener( "click", function() {
        data.comments = commentsTextArea.value || "";
        CrashReporter.send( data, function() {
          // Once report is sent, force a reload of the page with
          // recover=1 so we try to get user's backup data.
          location.search = "?recover=1";
        });
      }, false );

    });
});
