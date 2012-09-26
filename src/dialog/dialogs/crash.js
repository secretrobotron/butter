/* This Source Code Form is subject to the terms of the MIT license
 *  * If a copy of the MIT license was not distributed with this file, you can
 *  * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

define( [ "text!dialog/dialogs/crash.html", "dialog/dialog", "util/xhr" ],
  function( LAYOUT_SRC, Dialog, XHR ) {
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
          noBtn = rootElement.querySelector( "#no" ),
          yesBtn = rootElement.querySelector( "#yes" );

      reportTextArea.value = formatReport( data );

      // Once report is sent, force a reload of the page with
      // recover=1 so we try to get user's backup data.
      function recover() {
        // Remove the "Are you sure?" navigation check, since we have to reload
        window.onbeforeunload = null;
        location.search = "?recover=" + Date.now();
      }

      noBtn.addEventListener( "click", recover, false );

      yesBtn.addEventListener( "click", function() {
        data.comments = commentsTextArea.value || "";
        XHR.post( "/report", JSON.stringify( data, null, 4 ),
                  recover, "text/json" );
      }, false );

    });
});
