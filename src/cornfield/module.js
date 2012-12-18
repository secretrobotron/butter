/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define([ "util/uuid", "core/eventmanager", "dialog/dialog", "util/xhr", "jsSHA/sha1", "util/shims", 'socketio/socket.io' ],
  function( UUID, EventManager, Dialog, XHR, SHA1 ) {

  // Shortcut to make lint happy. Constructor is capitalized, and reference is non-global.
  var JSSHA = window.jsSHA;

  var IMAGE_DATA_URI_PREFIX_REGEX = "data:image/(jpeg|png);base64,";

  function hostname(port) {
    return location.protocol + "//" + location.hostname + ( (port || location.port ) ? ":" + ( port || location.port ) : "" );
  }

  var Cornfield = function( butter, config ) {

    var authenticated = false,
        email = "",
        name = "",
        username = "",
        server = hostname(),
        xhrPostQueue = [],
        collaborators = {},
        self = this;

    EventManager.extend(self);

    var sendXHRPost = function() {
      console.warn( "XHR.post occurred without a CSRF token. Buffering request." );
      xhrPostQueue.push( arguments );
    };

    XHR.setCSRFTokenAcquiredCallback( function() {
      var args;

      while ( xhrPostQueue.length ) {
        args = xhrPostQueue.shift();
        XHR.post.apply( this, args );
      }

      XHR.setCSRFTokenAcquiredCallback( null );

      sendXHRPost = XHR.post;
    });

    function setupCollaborationSocket(socket){
      socket.on('left', function(data){
        delete collaborators[data.user];
        self.dispatch('collaboratorleft', {
          collaborator: data
        });
      });

      collaborators[email] = {email: email};

      socket.on('joined', function(data){
        console.log('joined!', data);
        collaborators[data.email] = data;
        self.dispatch('collaboratorjoined', {
          collaborator: data
        });
      });

      socket.on('get project data', function(data){
        socket.emit('send project data', butter.project.data);
      });

      socket.on('trackeventupdated', function(data){
        console.log('trackeventupdated', data);
        var trackEvent = butter.currentMedia.getTrackEventById(data.id);
        data.popcornOptions._externalCollaborator = true;
        if(trackEvent){
          trackEvent.update(data.popcornOptions);
        }
      });

      socket.on('trackeventadded', function(data){
        console.log('trackeventadded', data);
        var track = butter.currentMedia.getTrackById(data.track);
        console.log(data.track, track);
        track.addTrackEvent(data);
      });

      socket.on('trackeventremoved', function(data){
        console.log('trackeventremoved', data);
        var trackEvent = butter.currentMedia.getTrackEventById(data.id);
        if(trackEvent){
          trackEvent.track.removeTrackEvent(trackEvent);
        }
      });

      socket.on('trackadded', function(data){
        console.log('trackadded', data);
        butter.currentMedia.addTrack(data);
      });

      socket.on('trackremoved', function(data){
        console.log('trackremoved', data);
        var track = butter.currentMedia.getTrackById(data.id);
        console.log(track);
        butter.currentMedia.removeTrack(track);
      });

      socket.on('trackeventupdaterequest', function(data){
        var trackEvent = butter.currentMedia.getTrackEventById(data.trackEvent);
        trackEvent.view.addUpdateRequestNotification(data.user, data.options);
      });

      self.sendChat = function(message){
        socket.emit('chat', message);
      };

      socket.on('chat', function(data){
        console.log('chat!', data);
        self.dispatch('chatoutput', data);
      });
    }

    this.sendChat = function(){};

    this.login = function(callback) {
      navigator.id.get(function(assertion) {
        if (assertion) {
          sendXHRPost(server + "/persona/verify",
            { assertion: assertion },
            function() {
              if (this.readyState === 4) {
                try {
                  var response = JSON.parse( this.response || this.responseText );
                  if (response.status === "okay") {

                    // Get email, name, and username after logging in successfully
                    whoami( function( data ) {
                      callback( data );
                    });
                    return;
                  }

                  // If there was an error of some sort, callback on that
                  callback(response);
                } catch (err) {
                  callback({ error: "an unknown error occured" });
                }
              }
            });
        } else {
          callback(undefined);
        }
      });
    };

    function joinSession(session){
      XHR.get(server + "/api/join/" + session, function() {
        if (this.readyState === 4) {
          var response;
          
          response = JSON.parse(this.response || this.responseText);
          var socket = io.connect(hostname(10000) + '?id=' + session + '&verify=' + response.verify);
          socket.on('connect', function(data){
            butter.currentMedia.tracks.slice().forEach(function(track){
              track.trackEvents.slice().forEach(function(trackEvent){
                track.removeTrackEvent(trackEvent);
              });
              butter.currentMedia.removeTrack(track);
            });

            socket.on('send project data', function receiveProjectData(data){
              socket.removeListener('send project data', receiveProjectData);
              butter.project.importCollaboration(data);
              setTimeout(function(){
                butter.editor.openEditor('collaboration-editor');
              }, 1000);
            });

            function trackEventUpdateNotificationHandler(notification){
              var trackEvent = notification.origin,
                  updateOptions = notification.data,
                  currentOptions = trackEvent.popcornOptions,
                  keys = Object.keys(updateOptions);

              if( keys.length > 0 &&
                  !updateOptions._externalCollaborator &&
                  keys.filter(function(key){
                      return updateOptions[key] !== currentOptions[key]
                    }).length > 0){
                socket.emit('trackeventupdaterequest', {
                  user: email,
                  trackEvent: trackEvent.id,
                  options: updateOptions
                });
              }
            }

            butter.listen('trackeventadded', function(e){
              var trackEvent = e.data;
              trackEvent.subscribe("update", trackEventUpdateNotificationHandler);
            });

            butter.listen('trackeventremoved', function(e){
              var trackEvent = e.data;
              trackEvent.unsubscribe("update", trackEventUpdateNotificationHandler);
            });

            setupCollaborationSocket(socket);
          });
        }
      });
    }

    function whoami( callback ) {
      XHR.get( server + "/api/whoami", function() {
        if ( this.readyState === 4 ) {
          var response;
          try {
            response = JSON.parse( this.response || this.responseText );
            if ( this.status === 200 ) {
              authenticated = true;
              email = response.email;
              username = response.username;
              name = response.name;

              var user = window.location.search.match(/[\?\&]user=([^\&$]+)/);
              var session = window.location.search.match(/[\?\&]session=([^\&$]+)/);
              if(user && session){
                var dialog = Dialog.spawn('join-session', {
                  data: {
                    user: user[1],
                    session: session[1]
                  },
                  events: {
                    submit: function( e ) {
                      dialog.close();
                      joinSession(session[1]);
                    }
                  }
                });
                dialog.open();
              }
            }
          } catch ( err ) {
            throw(err);
            response = {
              error: "failed to parse data from server: \n" + this.response
            };
          }

          if ( callback ) {
            callback( response );
          }
        }
      });
    }

    // Check to see if we're already logged in
    butter.listen( "ready", function onMediaReady() {
      butter.unlisten( "ready", onMediaReady );

      whoami( function( response ) {
        if ( !response.error ) {
          butter.dispatch( "autologinsucceeded", response );
        }
      });
    });

    this.email = function() {
      return email;
    };

    this.name = function() {
      return name;
    };

    this.username = function() {
      return username;
    };

    this.authenticated = function() {
      return authenticated;
    };

    function publishPlaceholder( id, callback ) {
      console.warn( "Warning: Popcorn Maker publish is already in progress. Ignoring request." );
      callback( { error: "Publish is already in progress. Ignoring request." } );
    }

    function publishFunction( id, callback ) {
      // Re-route successive calls to `publish` until a complete response has been
      // received from the server.
      self.publish = publishPlaceholder;

      sendXHRPost(server + "/api/publish/" + id, null, function() {
        if (this.readyState === 4) {
          var response;

          // Reset publish function to its original incarnation.
          self.publish = publishFunction;

          try {
            response = JSON.parse( this.response || this.responseText );
            callback(response);
          } catch (err) {
            callback({ error: "an unknown error occured" });
          }
        }
      });
    }

    this.getInvitation = function(id, inviteEmail, callback){
      XHR.get(server + "/api/invite/" + id + "/" + inviteEmail, function() {
        if (this.readyState === 4) {
          var response;
          try {
            response = JSON.parse(this.response || this.responseText);

            var socket = io.connect(hostname(10000) + '?id=' + response.session);
            socket.on('connect', function(){

              socket.on('get project data', function(data){
                socket.emit('send project data', butter.project.data);
              });

              socket.on('joined', function(data){
                socket.emit('send project data', butter.project.data);
              });

              butter.listen('trackadded', function(e){
                console.log('sending', e.type);
                socket.emit(e.type, e.data.json);
              });

              butter.listen('trackremoved', function(e){
                console.log('sending', e.type);
                socket.emit(e.type, e.data.json);
              });

              butter.listen('trackeventadded', function(e){
                console.log('sending', e.type);
                socket.emit(e.type, e.data.json);
              });

              butter.listen('trackeventremoved', function(e){
                console.log('sending', e.type);
                socket.emit(e.type, e.data.json);
              });

              butter.listen('trackeventupdated', function(e){
                console.log('sending', e.type);
                socket.emit(e.type, e.data.json);
              });

              setupCollaborationSocket(socket);
            });


            callback(response, window.location.origin + "/" + window.location.pathname + "?session=" + response.session + "&user=" + response.user);
          } catch (err) {
            throw(err);
            callback("an unknown error occured");
          }
        }
      });      
    };

    this.logout = function(callback) {
      sendXHRPost(server + "/persona/logout", null, function() {
        email = "";
        if (this.readyState === 4) {
          var response;

          try {
            response = JSON.parse( this.response || this.responseText );
            authenticated = false;
            email = "";
            username = "";
            name = "";
          } catch (err) {
            response = { error: "an unknown error occured" };
          }

          if ( callback ) {
            callback( response );
          }
        }
      });
    };

    function savePlaceholder( id, data, callback ) {
      console.warn( "Warning: Popcorn Maker save is already in progress. Ignoring request." );
      callback( { error: "Save is already in progress. Ignoring request." } );
    }

    function saveFunction( id, data, callback ) {
      // Re-route successive calls to `save` until a complete response has been
      // received from the server.
      self.save = savePlaceholder;

      var url = server + "/api/project/";

      if ( id ) {
        url += id;
      }

      var hashedTrackEvents = {};

      butter.orderedTrackEvents.forEach( function( trackEvent ) {
        var hash, regexMatch;

        if ( trackEvent.popcornOptions.src ) {
          regexMatch = trackEvent.popcornOptions.src.match( IMAGE_DATA_URI_PREFIX_REGEX );
          if ( regexMatch ) {
            hash = new JSSHA( trackEvent.popcornOptions.src.substr( regexMatch[ 0 ].length ), "TEXT" ).getHash( "SHA-1", "HEX" );
            hashedTrackEvents[ hash ] = trackEvent;
          }
        }
      });

      sendXHRPost( url, data, function() {
        if (this.readyState === 4) {

          // Reset save function to its original incarnation.
          self.save = saveFunction;

          try {
            var response = JSON.parse( this.response || this.responseText );

            if ( Array.isArray( response.imageURLs ) ) {
              response.imageURLs.forEach( function( image ) {
                var hashedTrackEvent = hashedTrackEvents[ image.hash ];
                if ( hashedTrackEvent ) {
                  hashedTrackEvent.update({
                    src: image.url
                  });
                }
                else {
                  console.warn( "Cornfield responded with invalid image hash:", image.hash );
                }
              });
            }

            callback(response);
          } catch (err) {
            callback({ error: "an unknown error occured" });
          }
        }
      }, "application/json" );
    }

    this.save = saveFunction;
    this.publish = publishFunction;

    Object.defineProperties(self, {
      collaborators: {
        get: function(){
          return collaborators;
        }
      }
    });

  };

  Cornfield.__moduleName = "cornfield";

  return Cornfield;
});
