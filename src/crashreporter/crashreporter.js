( function( window, document, navigator ) {

  // Cache existing window.onerror
  var _onerror = window.onerror ? window.onerror : function(){ return true; },
      _scriptPath, _postUrl;

  // <script src="crashreporter.js" data-crash-reporter-url="http://your.server.com/post/endpoint">
  function init() {
    var scripts = document.getElementsByTagName( "script" ),
        i = 0,
        script, scriptDir, src, match, config;

    while( i < scripts.length ) {
      script = scripts[ i++ ];
      if( ( src = script.getAttribute( "src" ) ) &&
          ( match = src.match( /(((.*)\/)|^)crashreporter\.js/i ) ) ) {
        // Remember script path, adding trailing /
        _scriptPath = match[ 3 ].replace( /\/*$/, "/" ) || "";

        // Remember post url
        src = script.getAttribute( "data-crash-reporter-url" );
        if( src ) {
          _postUrl = src;
        }
        return;
      }
    }
  }

  function loadReporter( src, callback ) {

  }

  window.onerror = function( message, url, lineno ) {
    if( !window.XHLHttpRequest ) {
      return true;
    }

    if( !_postUrl ) {
      // Not much we can do if you don't give us a URL!
      return _onerror();
    }

    init();

    loadReporter( _scriptPath + "crashreporter-ui.js" );

      var report = buildReport( message, url, lineno );

    });

    
    var xhr = new XMLHttpRequest(),
        report = JSON.stringify({
          date: Date.now(),
          ua: navigator.
        });
  };

} ( window, window.document, window.navigator ) );
