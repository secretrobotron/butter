/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define( [ "util/lang", "editor/editor", "text!layouts/collaboration-editor.html", 'util/xhr' ],
  function( LangUtils, Editor, EDITOR_LAYOUT, xhrutils ) {

  var MAX_MEDIA_INPUTS = 4;

  var _parentElement =  LangUtils.domFragment( EDITOR_LAYOUT,".collaboration-editor" ),
      _loadingSpinner = _parentElement.querySelector( ".media-loading-spinner" ),
      _containerElement = _parentElement.querySelector( ".butter-editor-body" ),
      _invitationButton = _parentElement.querySelector('.invitation-button'),
      _invitationEmail = _parentElement.querySelector('.invitation-email'),
      _this;

  function setLoadSpinner( on ) {
    if ( on ) {
      _loadingSpinner.classList.remove( "hidden" );
    } else {
      _loadingSpinner.classList.add( "hidden" );
    }
  }

  function setup() {
  }

  Editor.register( "collaboration-editor", null, function( rootElement, butter ) {
    rootElement = _parentElement;
    _this = this;

    setLoadSpinner(false);

    _invitationButton.addEventListener('click', function onInvitationButtonClick(e){
      setLoadSpinner(true);
      _invitationEmail.setAttribute('readonly', true);
      _invitationEmail.classList.add('butter-disabled');
      _invitationButton.classList.add('butter-disabled');
      _invitationButton.removeEventListener('click', onInvitationButtonClick, false);

      butter.cornfield.getInvitation(butter.project.id, function(invitation){
        console.log(invitation);
      });
    }, false);

    Editor.BaseEditor.extend( _this, butter, rootElement, {
      open: function() {
        setup();
      },
      close: function() {
      }
    });
  });
});
