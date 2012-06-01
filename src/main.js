/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

(function () {

  var DEFAULT_TRACKEVENT_DURATION = 1,
      DEFAULT_TRACKEVENT_OFFSET = 0.01;

  define( [
            "core/eventmanager", "core/logger", "core/config", "core/target", "core/media", "core/page",
            "./modules", "./dependencies", "ui/ui", "util/xhr", "util/lang",
            "text!default-config.json"
          ],
          function(
            EventManagerWrapper, Logger, Config, Target, Media, Page,
            Modules, Dependencies, UI, XHR, Lang,
            DefaultConfigJSON
          ){

    var Butter;

    var _defaultPopcornScripts = {},
        _defaultPopcornCallbacks = {};

    var _defaultConfig,
        _defaultTarget;

    var _logger = new Logger( "Butter" );

    // We use the default configuration in src/default-config.json as
    // a base, and override whatever the user provides in the
    // butterOptions.config file.
    try {
      _defaultConfig = Config.parse( DefaultConfigJSON );
    }
    catch ( e ) {
      throw "Butter Error: unable to find or parse default-config.json";
    }

    function trackEventRequested ( element, media, target ) {
      var track,
          type = element.getAttribute( "data-butter-plugin-type" ),
          start = media.currentTime,
          end;

      if( start > media.duration ){
        start = media.duration - DEFAULT_TRACKEVENT_DURATION;
      }

      if( start < 0 ){
        start = 0;
      }

      end = start + DEFAULT_TRACKEVENT_DURATION;

      if( end > media.duration ){
        end = media.duration;
      }

      if( !type ){
        _logger.log( "Invalid trackevent type requested." );
        return;
      } //if

      if( media.tracks.length === 0 ){
        media.addTrack();
      } //if
      track = media.tracks[ 0 ];
      var trackEvent = track.addTrackEvent({
        type: type,
        popcornOptions: {
          start: start,
          end: end,
          target: target
        }
      });

      if( media.currentTime < media.duration - DEFAULT_TRACKEVENT_OFFSET ){
        media.currentTime += DEFAULT_TRACKEVENT_OFFSET;
      }

      return trackEvent;
    }

    function targetTrackEventRequested( e ){
      if( Butter.currentMedia ){
        var trackEvent = trackEventRequested( e.data.element, Butter.currentMedia, e.target.elementID );
        Butter.dispatch( "trackeventcreated", {
          trackEvent: trackEvent,
          by: "target"
        });
      }
      else {
        _logger.log( "Warning: No media to add dropped trackevent." );
      }
    }

    function mediaPlayerTypeRequired( e ){
      Butter.page.addPlayerType( e.data );
    }

    function mediaTrackEventRequested( e ){
      var trackEvent = trackEventRequested( e.data, e.target, "Media Element" );
      Butter.dispatch( "trackeventcreated", {
        trackEvent: trackEvent,
        by: "media"
      });
    }

    function attemptDataLoad( finishedCallback ){
      if ( Butter.config.value( "savedDataUrl" ) ) {

        var xhr = new XMLHttpRequest(),
            savedDataUrl = Butter.config.value( "savedDataUrl" ) + "?noCache=" + Date.now(),
            savedData;

        xhr.open( "GET", savedDataUrl, false );

        if( xhr.overrideMimeType ){
          // Firefox generates a misleading "syntax" error if we don't have this line.
          xhr.overrideMimeType( "application/json" );
        }

        // Deal with caching
        xhr.setRequestHeader( "If-Modified-Since", "Fri, 01 Jan 1960 00:00:00 GMT" );
        xhr.send( null );

        if( xhr.status === 200 ){
          try{
            savedData = JSON.parse( xhr.responseText );
          }
          catch( e ){
            Butter.dispatch( "loaddataerror", "Saved data not formatted properly." );
          }
          Butter.importProject( savedData );
        }
        else {
          _logger.log( "Butter saved data not found: " + savedDataUrl );
        }
      }

      finishedCallback();
    }

    function readConfig( userConfig ){
      // Overwrite default config options with user settings (if any).
      if( userConfig ){
        _defaultConfig.merge( userConfig );
      }

      Config.currentConfig = _defaultConfig;
      Butter.config = Config;

      Butter.project.template = Config.value( "name" );

      Dependencies.init();
      Page.init();
      
      Butter.loader = Dependencies;
      Butter.page = Page;
      Butter.ui = new UI();

      Butter.ui.load(function(){
        //prepare the page next
        Butter.preparePopcornScriptsAndCallbacks(function(){
          Butter.preparePage(function(){
            Modules.init(function(){
              if( Butter.config.value( "snapshotHTMLOnReady" ) ){
                Butter.page.snapshotHTML();
              }
              attemptDataLoad(function(){
                //fire the ready event
                Butter.dispatch( "ready" );
              });
            });
          });
        });
      });
    }

    Butter = {
      media: [],
      targets: [],

      currentMedia: null,
      selectedEvents: [],

      defaultTarget: null,

      page: null,
      config: null,
      loader: null,

      ui: null,

      project: {
        id: null,
        name: null,
        data: null,
        html: null,
        template: null
      },

      importProject: function ( projectData ) {
        var i, l;
        if ( projectData.targets ) {
          for ( i = 0, l = projectData.targets.length; i < l; ++i ) {
            var t, targets = Butter.targets, targetData = projectData.targets[ i ];
            for ( var k = 0, j = targets.length; k < j; ++k ) {
              if ( targets[ k ].name === targetData.name ) {
                t = targets[ k ];
                break;
              }
            }
            if ( !t ) {
              Butter.addTarget( targetData );
            }
            else {
              t.json = targetData;
            }
          }
        }
        if ( projectData.media ) {
          for ( i = 0, l = projectData.media.length; i < l; ++i ) {
            var mediaData = projectData.media[ i ],
                m = Butter.getMediaByType( "target", mediaData.target );
            if ( !m ) {
              m = new Media();
              m.json = mediaData;
              Butter.addMedia( m );
            }
            else {
              m.json = mediaData;
            }
          }
        }
      },

      exportProject: function () {
        var exportJSONMedia = [];
        for ( var m = 0; m < Butter.media.length; ++m ) {
          exportJSONMedia.push( Butter.media[ m ].json );
        }
        var projectData = {
          targets: Butter.serializeTargets(),
          media: exportJSONMedia
        };
        return projectData;
      },

      clearProject: function(){
        while( Butter.orderedTrackEvents.length > 0 ) {
          Butter.orderedTrackEvents[ 0 ].track.removeTrackEvent( Butter.orderedTrackEvents[ 0 ] );
        }
        while( Butter.targets.length > 0 ){
          Butter.targets[ 0 ].destroy();
          Butter.removeTarget( Butter.targets[ 0 ] );
        }
        while( Butter.media.length > 0 ){
          Butter.media[ 0 ].destroy();
          Butter.removeMedia( Butter.media[ 0 ] );
        }
      },

      getMediaByType: function ( type, val ) {
       for( var i = 0, l = Butter.media.length; i < l; i++ ) {
          if ( Butter.media[ i ][ type ] === val ) {
            return Butter.media[ i ];
          }
        }
        return undefined;
      },

      addMedia: function ( media ) {
        if ( !( media instanceof Media ) ) {
          media = new Media( media );
        } //if

        media.popcornCallbacks = _defaultPopcornCallbacks;
        media.popcornScripts = _defaultPopcornScripts;

        Butter.media.push( media );

        Butter.chain( media, [
          "mediacontentchanged",
          "mediadurationchanged",
          "mediatargetchanged",
          "mediatimeupdate",
          "mediaready",
          "trackadded",
          "trackremoved",
          "tracktargetchanged",
          "trackeventadded",
          "trackeventremoved",
          "trackeventupdated",
          "trackeventeditrequested"
        ]);

        var trackEvents;
        if ( media.tracks.length > 0 ) {
          for ( var ti=0, tl=media.tracks.length; ti<tl; ++ti ) {
            var track = media.tracks[ ti ];
                trackEvents = track.trackEvents;
                media.dispatch( "trackadded", track );
            if ( trackEvents.length > 0 ) {
              for ( var i=0, l=trackEvents.length; i<l; ++i ) {
                track.dispatch( "trackeventadded", trackEvents[ i ] );
              } //for
            } //if
          } //for
        } //if

        media.listen( "trackeventrequested", mediaTrackEventRequested );
        media.listen( "mediaplayertyperequired", mediaPlayerTypeRequired );

         Butter.dispatch( "mediaadded", media );
        if ( !Butter.currentMedia ) {
          Butter.currentMedia = media;
        } //if
        media.setupContent();
        return media;
      },

      removeMedia: function ( media ) {

        var idx = Butter.media.indexOf( media );
        if ( idx > -1 ) {
          Butter.media.splice( idx, 1 );
          Butter.unchain( media, [
            "mediacontentchanged",
            "mediadurationchanged",
            "mediatargetchanged",
            "mediatimeupdate",
            "mediaready",
            "trackadded",
            "trackremoved",
            "tracktargetchanged",
            "trackeventadded",
            "trackeventremoved",
            "trackeventupdated",
            "trackeventeditrequested"
          ]);
          var tracks = media.tracks;
          for ( var i=0, l=tracks.length; i<l; ++i ) {
            Butter.dispatch( "trackremoved", tracks[ i ] );
          } //for
          if ( media === Butter.currentMedia ) {
            Butter.currentMedia = undefined;
          } //if

          media.unlisten( "trackeventrequested", mediaTrackEventRequested );
          media.unlisten( "mediaplayertyperequired", mediaPlayerTypeRequired );

          Butter.dispatch( "mediaremoved", media );
          return media;
        } //if
        return undefined;
      },

      preparePage: function( callback ){
        var scrapedObject = Butter.page.scrape(),
            targets = scrapedObject.target,
            medias = scrapedObject.media;

        Butter.page.prepare(function() {
          if ( !!Butter.config.value( "scrapePage" ) ) {
            var i, j, il, jl, url, oldTarget, oldMedia, mediaPopcornOptions, mediaObj;
            for( i = 0, il = targets.length; i < il; ++i ) {
              oldTarget = null;
              if( Butter.targets.length > 0 ){
                for( j = 0, jl = Butter.targets.length; j < jl; ++j ){
                  // don't add the same target twice
                  if( Butter.targets[ j ].id === targets[ i ].id ){
                    oldTarget = Butter.targets[ j ];
                    break;
                  } //if
                } //for j
              }

              if( !oldTarget ){
                Butter.addTarget({ element: targets[ i ].id });
              }
            }

            for( i = 0, il = medias.length; i < il; i++ ) {
              oldMedia = null;
              mediaPopcornOptions = null;
              url = "";
              mediaObj = medias[ i ];

              if( mediaObj.getAttribute( "data-butter-source" ) ){
                url = mediaObj.getAttribute( "data-butter-source" );
              }
              else if( [ "VIDEO", "AUDIO" ].indexOf( mediaObj.nodeName ) > -1 ) {
                url = mediaObj.currentSrc;
              }

              if( Butter.media.length > 0 ){
                for( j = 0, jl = Butter.media.length; j < jl; ++j ){
                  if( Butter.media[ j ].id !== medias[ i ].id && Butter.media[ j ].url !== url ){
                    oldMedia = Butter.media[ j ];
                    break;
                  } //if
                } //for
              }
              else{
                if( Butter.config.value( "mediaDefaults" ) ){
                  mediaPopcornOptions = Butter.config.value( "mediaDefaults" );
                }
              } //if

              if( !oldMedia ){
                Butter.addMedia({ target: medias[ i ].id, url: url, popcornOptions: mediaPopcornOptions });
              }
            } //for
          }

          if( callback ){
            callback();
          } //if
          
          Butter.dispatch( "pageready" );
        });
      },

      preparePopcornScriptsAndCallbacks: function( readyCallback ){
        var popcornConfig = Butter.config.value( "popcorn" ) || {},
            callbacks = popcornConfig.callbacks,
            scripts = popcornConfig.scripts,
            toLoad = [],
            loaded = 0;

        // wrap the load function to remember the script
        function genLoadFunction( script ){
          return function( e ){
            // this = XMLHttpRequest object
            if( this.readyState === 4 ){

              // if the server sent back a bad response, record empty string and log error
              if( this.status !== 200 ){
                _defaultPopcornScripts[ script ] = "";
                _logger.log( "WARNING: Trouble loading Popcorn script: " + this.response );
              }
              else{
                // otherwise, store the response as text
                _defaultPopcornScripts[ script ] = this.response;
              }

              // see if we can call the readyCallback yet
              ++loaded;
              if( loaded === toLoad.length && readyCallback ){
                readyCallback();
              }

            }
          };
        }

        _defaultPopcornCallbacks = callbacks;

        for( var script in scripts ){
          if( scripts.hasOwnProperty( script ) ){
            var url = scripts[ script ],
                probableElement = document.getElementById( url.substring( 1 ) );
            // check to see if an element on the page contains the script we want
            if( url.indexOf( "#" ) === 0 ){
              if( probableElement ){
                _defaultPopcornScripts[ script ] = probableElement.innerHTML;
              }
            }
            else{
              // if not, treat it as a url and try to load it
              toLoad.push({
                url: url,
                onLoad: genLoadFunction( script )
              });
            }
          }
        }

        // if there are scripts to load, load them
        if( toLoad.length > 0 ){
          for( var i = 0; i < toLoad.length; ++i ){
            XHR.get( toLoad[ i ].url, toLoad[ i ].onLoad );
          }
        }
        else{
          // otherwise, call the ready callback right away
          readyCallback();
        }
      },

      addTarget: function ( target ) {
        if ( !(target instanceof Target ) ) {
          target = new Target( target );
        }
        Butter.targets.push( target );
        target.listen( "trackeventrequested", targetTrackEventRequested );
        _logger.log( "Target added: " + target.name );
        Butter.dispatch( "targetadded", target );
        if( target.isDefault ){
          _defaultTarget = target;
        }
        return target;
      },

      removeTarget: function ( target ) {
        if ( typeof(target) === "string" ) {
          target = Butter.getTargetByType( "id", target );
        }
        var idx = Butter.targets.indexOf( target );
        if ( idx > -1 ) {
          target.unlisten( "trackeventrequested", targetTrackEventRequested );
          Butter.targets.splice( idx, 1 );
          delete Butter.targets[ target.name ];
          Butter.dispatch( "targetremoved", target );
          if( _defaultTarget === target ){
            _defaultTarget = undefined;
          }
          return target;
        }
        return undefined;
      },

      serializeTargets: function () {
        var sTargets = [];
        for ( var i=0, l=Butter.targets.length; i<l; ++i ) {
          sTargets.push( Butter.targets[ i ].json );
        }
        return sTargets;
      },

      getTargetByType: function( type, val ) {
        for( var i = 0, l = Butter.targets.length; i < l; i++ ) {
          if ( Butter.targets[ i ][ type ] === val ) {
            return Butter.targets[ i ];
          }
        }
        return undefined;
      },

      getHTML: function(){
        var media = [];
        for( var i = 0; i < Butter.media.length; ++i ){
          media.push( Butter.media[ i ].generatePopcornString() );
        }
        return Page.getHTML( media );
      },

      init: function( butterOptions ) {
        butterOptions = butterOptions || {};

        if ( butterOptions.debug !== undefined ) {
          Logger.enabled( butterOptions.debug );
        }

        if( butterOptions.ready ){
          Butter.listen( "ready", function( e ){
            butterOptions.ready( e.data );
          });
        }

        if( butterOptions.config && typeof( butterOptions.config ) === "string" ){
          var xhr = new XMLHttpRequest(),
              userConfig,
              url = butterOptions.config + "?noCache=" + Date.now();

          xhr.open( "GET", url, false );
          if( xhr.overrideMimeType ){
            // Firefox generates a misleading "syntax" error if we don't have this line.
            xhr.overrideMimeType( "application/json" );
          }
          // Deal with caching
          xhr.setRequestHeader( "If-Modified-Since", "Fri, 01 Jan 1960 00:00:00 GMT" );
          xhr.send( null );

          if( xhr.status === 200 || xhr.status === 0 ){
            try{
              userConfig = Config.parse( xhr.responseText );
            }
            catch( e ){
              throw new Error( "Butter config file not formatted properly." );
            }
            readConfig( userConfig );
          }
          else{
            Butter.dispatch( "configerror" );
          }
        }
        else {
          readConfig( butterOptions.config );
        }
      }
    };

    Object.defineProperties( Butter, {
      currentMedia: {
        enumerable: true,
        get: function() {
          return Butter.currentMedia;
        },
        set: function( media ) {
          if ( typeof( media ) === "string" ) {
            media = Butter.getMediaByType( "id", media.id );
          } //if

          if ( media && Butter.media.indexOf( media ) > -1 ) {
            Butter.currentMedia = media;
            _logger.log( "Media Changed: " + media.name );
            Butter.dispatch( "mediachanged", media );
            return Butter.currentMedia;
          } //if
        }
      },
      debug: {
        enumerable: true,
        get: function() {
          return Logger.enabled();
        },
        set: function( value ) {
          Logger.enabled( value );
        }
      }
    });

    EventManagerWrapper( Butter );

    // Butter will report a version, which is the git commit sha
    // of the version we ship.  This happens in make.js's build target.
    Butter.version = "@VERSION@";

    if ( window.Butter.__waiting ) {
      for ( var i=0, l=window.Butter.__waiting.length; i<l; ++i ) {
        Butter.init( window.Butter.__waiting[ i ] );
      }
      delete Butter._waiting;
    }

    window.Butter = Butter;
    return Butter;
  });

}());

