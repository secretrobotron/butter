/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

define( [ "text!layouts/share-editor.html", "./editor" ],
  function( EDITOR_LAYOUT, Editor ) {

    Editor.register( "share-editor", LAYOUT_SRC, function( rootElement, butter, compiledLayout ) {

      var _this = this;

      Editor.BaseEditor( _this, butter, rootElement {
        
      });

    });

});