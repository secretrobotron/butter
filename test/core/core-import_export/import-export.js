  /*global text,expect,ok,module,notEqual,test,window*/

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

(function(window, document, undefined ){
  // All modules that create Butter objects (e.g., Butter())
  // should use this lifecycle, and call rememberButter() for all
  // created butter instances.  Any created using createButter()
  // already have it done automatically.
  var butterLifeCycle = (function(){

    var _tmpButter;

    return {
      setup: function(){
        _tmpButter = [];
      },
      teardown: function(){
        var i = _tmpButter.length;
        while( i-- ){
          _tmpButter[ i ].clearProject();
          delete _tmpButter[ i ];
        }
      },
      rememberButter: function(){
        var i = arguments.length;
        while( i-- ){
          _tmpButter.push( arguments[ i ] );
        }
      }
    };

  })();

  module( "Import/Export", butterLifeCycle );
  asyncTest( "Import and Export Data", 12, function(){

    var m1,
        m2,
        t1,
        t2,
        t3,
        t4,
        te1,
        exported,
        tEvents,
        teEvents,
        mEvents,
        allMedia;

    Butter({
      config: "../test-config.json",
      ready: function( butter ){
        butterLifeCycle.rememberButter( butter );

        m1 = butter.addMedia( { url:"www.test-url-1.com", target:"test-target-1" } );
        m2 = butter.addMedia( { url:"www.test-url-2.com", target:"test-target-2" } );

        t1 = m1.addTrack();
        t2 = m1.addTrack();
        butter.currentMedia = m2;
        t3 = m2.addTrack();
        t4 = m2.addTrack();
        te1 = t4.addTrackEvent( { popcornOptions: { start: 2, end: 6 }, type: "test" } );
        butter.addTarget( { name: "beep" } );
        exported = butter.exportProject();

        Butter({
          config: "../test-config.json",
          ready: function( secondButter ){
            butterLifeCycle.rememberButter( butter );

            teEvents = tEvents = mEvents = 0;
            secondButter.listen( "mediaadded", function(){
              mEvents++;
            });
            secondButter.listen( "trackadded", function(){
              tEvents++;
            });
            secondButter.listen( "trackeventadded", function(){
              teEvents++;
            });

            secondButter.importProject( exported );
            allMedia = secondButter.media;

            ok( allMedia.length === 2, "right number of media objects" );
            ok( allMedia[ 0 ].url === "www.test-url-1.com", "media 1 url is correct" );
            ok( allMedia[ 0 ].target === "test-target-1", "media 1 target is correct" );
            ok( allMedia[ 1 ].url === "www.test-url-2.com", "media 2 url is correct" );
            ok( allMedia[ 1 ].target === "test-target-2", "media 2 target is correct" );

            ok( allMedia[ 0 ].tracks.length === 2, "media 1 has right number of tracks" );
            ok( allMedia[ 1 ].tracks.length === 2, "media 2 has right number of tracks" );
            ok( allMedia[ 1 ].tracks[ 1 ].trackEvents[ 0 ].popcornOptions.end === 6, "trackevent is correct" );

            ok( butter.targets[ 0 ].name === "beep", "target is correct" );

            ok( teEvents === 1, "one trackeventadded events" );
            ok( tEvents === 4, "four trackadded events" );
            ok( mEvents === 2, "two mediaadded events" );

            start();
          }
        });
      }
    });
  });

}( window, window.document ));