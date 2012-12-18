/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define([ "text!dialog/dialogs/join-session.html", "dialog/dialog" ],
  function( LAYOUT_SRC, Dialog ){

  return Dialog.register( "join-session", LAYOUT_SRC, function( dialog, data ) {
    dialog.registerActivity( "ok", function( e ){
      dialog.send( "submit", true );
    });

    dialog.rootElement.querySelector( ".user" )
      .appendChild( document.createTextNode( data.user ) );

    dialog.enableElements( ".yes", ".no" );
    dialog.enableCloseButton();
    dialog.assignEscapeKey( "default-close" );
    dialog.assignEnterKey( "ok" );
    dialog.assignButton( ".yes", "ok" );
    dialog.assignButton( ".no", "default-close" );
  });
});