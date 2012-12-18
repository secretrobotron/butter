/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define( [ "util/lang", "editor/editor", "text!layouts/collaboration-editor.html", 'util/xhr' ],
  function( LangUtils, Editor, EDITOR_LAYOUT, xhrutils ) {

  var MAX_MEDIA_INPUTS = 4;

  var _parentElement =  LangUtils.domFragment( EDITOR_LAYOUT, ".collaboration-editor" ),
      _loadingSpinner = _parentElement.querySelector( ".media-loading-spinner" ),
      _containerElement = _parentElement.querySelector( ".butter-editor-body" ),
      _invitationButton = _parentElement.querySelector('.invitation-button'),
      _invitationEmail = _parentElement.querySelector('.invitation-email'),
      _sendInvitationContainer = _parentElement.querySelector('.send-invitation'),
      _invitationResponseContainer = _parentElement.querySelector('.invitation-response'),
      _sessionInfoContainer = _parentElement.querySelector('.session-info'),
      _chatInput = _parentElement.querySelector('.chat-input'),
      _chatOutput = _parentElement.querySelector('.chat-output'),
      _updateRequestContainer = _parentElement.querySelector('.update-requests'),
      _updateRequestList = _updateRequestContainer.querySelector('ul'),
      _updateRequestDismissButton = _updateRequestContainer.querySelector('button'),
      _this;

  function setLoadSpinner( on ) {
    if ( on ) {
      _loadingSpinner.classList.remove( "hidden" );
    } else {
      _loadingSpinner.classList.add( "hidden" );
    }
  }

  Editor.register( "collaboration-editor", null, function( rootElement, butter ) {
    rootElement = _parentElement;
    _this = this;

    setLoadSpinner(false);

    _invitationResponseContainer.style.display = 'none';

    if(!butter.project.collaboration){
      _sessionInfoContainer.style.display = 'none';
    }
    else {
      _sendInvitationContainer.style.display = 'none';
      _sessionInfoContainer.querySelector('.owner').innerHTML = butter.project.collaboration;
    }

    _chatInput.addEventListener('keypress', function(e){
      if(e.which === 13 && _chatInput.value !== ''){
        butter.cornfield.sendChat(_chatInput.value);
        _chatInput.value = '';
      }
    });

    console.log('listening!');
    butter.cornfield.listen('chatoutput', function(e){
      var line = document.createElement('div');
      var name = document.createElement('span');
      var strong = document.createElement('strong');
      name.appendChild(strong);
      strong.appendChild(document.createTextNode(e.data.user.email));
      line.appendChild(name);
      line.appendChild(document.createTextNode(': ' + e.data.data));
      _chatOutput.appendChild(line);
      _chatOutput.scrollTop = _chatOutput.scrollHeight;
    });

    _invitationButton.addEventListener('click', function onInvitationButtonClick(e){
      setLoadSpinner(true);

      _invitationEmail.setAttribute('readonly', true);
      _invitationEmail.classList.add('butter-disabled');
      _invitationButton.classList.add('butter-disabled');
      _invitationButton.removeEventListener('click', onInvitationButtonClick, false);

      butter.cornfield.getInvitation(butter.project.id, _invitationEmail.value, function(invitation, invitationUrl){
        var invitationAnchor = _invitationResponseContainer.querySelector('.invitation-url');
        var userSpan = _invitationResponseContainer.querySelector('.user');

        userSpan.innerHTML = _invitationEmail.value;

        _invitationResponseContainer.style.display = 'block';

        _sendInvitationContainer.style.display = 'none';
        invitationAnchor.href = invitationUrl;
        invitationAnchor.innerHTML = invitationUrl;

        setLoadSpinner(false);
      });
    }, false);

    function refreshCollaboratorList(){
      var collaborators = butter.cornfield.collaborators;
      var list = _sessionInfoContainer.querySelector('.collaborators');

      list.innerHTML = '';

      Object.keys(collaborators).forEach(function(key){
        var collaborator = collaborators[key];
        var li = LangUtils.domFragment('<li>' + key + '</li>', 'li');
        list.appendChild(li);
      });
    }

    butter.cornfield.listen('collaboratorleft', function(e){
      refreshCollaboratorList();
    });

    butter.cornfield.listen('collaboratorjoined', function(e){
      _sessionInfoContainer.style.display = 'block';
      refreshCollaboratorList();
    });

    function onUpdateRequestTabClick(e){
      var trackEvent = e.target.trackEvent;
      var view = e.target;

      butter.editor.openEditor('collaboration-editor', {openData: 'update-requests'});

      _updateRequestList.innerHTML = '';

      view.updateRequests.forEach(function(request){
        var li = document.createElement('li');
        li.appendChild(document.createTextNode(request.user + ': '));
        li.appendChild(document.createTextNode(' [' + Object.keys(request.options).join(', ') + ']'));
        _updateRequestList.appendChild(li);
        li.addEventListener('mouseover', function(e){
          view.fake(request.options);
        }, false);
        li.addEventListener('mouseout', function(e){
          view.clearFakes();
        }, false);
        li.addEventListener('click', function(e){
          trackEvent.update(request.options);
          view.clearRequests();
          _updateRequestList.innerHTML = '';
        }, false);
      });

      _updateRequestDismissButton.addEventListener('click', function(e){
        view.clearRequests();
        _updateRequestList.innerHTML = '';
      }, false);

    }

    butter.listen('trackeventadded', function(e){
      e.data.view.listen('updaterequesttabclicked', onUpdateRequestTabClick);
    });

    butter.listen('trackeventremoved', function(e){
      e.data.view.unlisten('updaterequesttabclicked', onUpdateRequestTabClick);
    });

    Editor.BaseEditor.extend( _this, butter, rootElement, {
      open: function(rootElement, openData) {
        if(openData !== 'update-requests'){
          _updateRequestContainer.style.display = 'none';
        }
        else {
          _updateRequestContainer.style.display = 'block'; 
        }

        if(!butter.project.collaboration){
          _sessionInfoContainer.style.display = 'none';
        }
        else {
          _sendInvitationContainer.style.display = 'none';
          _sessionInfoContainer.style.display = 'block';
          _sessionInfoContainer.querySelector('.owner').innerHTML = butter.project.collaboration;
        }
        refreshCollaboratorList();
      },
      close: function() {
      }
    });
  }, true);
});
