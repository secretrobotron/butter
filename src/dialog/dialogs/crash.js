/* This Source Code Form is subject to the terms of the MIT license
 *  * If a copy of the MIT license was not distributed with this file, you can
 *  * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

define( [ "text!dialog/dialogs/crash.html", "dialog/dialog" ],
  function( LAYOUT_SRC, Dialog ) {
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
          yesBtn = rootElement.querySelector( "#yes" ),
          yesCallback = data.onSendReport,
          noCallback = data.onNoReport;

      reportTextArea.value = formatReport( data );

      noBtn.addEventListener( "click", noCallback, false );

      yesBtn.addEventListener( "click", function() {
        yesCallback( commentsTextArea.value || "" );
      }, false );

    });
});
