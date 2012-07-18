/*global Butter,asyncTest,equal,start,ok*/
require( [ "../src/core/page", "../src/core/config", "../src/dependencies" ], function( Page, Config, Dependencies ) {
  var _config = Config.parse( JSON.stringify({
          "baseDir": "../../",
          "dirs": {
            "popcorn-js": "{{baseDir}}external/popcorn-js/"
          },
          "player": {
            "players": [
              {
                "type": "youtube",
                "path": "{{baseDir}}external/popcorn-js/players/youtube/popcorn.youtube.js"
              }
            ]
          }
        }
      )),
      _loader = Dependencies( _config ),
      _page = new Page( _loader, _config );

  module( "Page" );
  asyncTest( "prepare script loading", 2, function() {
    function checkScripts() {
      ok( window.Popcorn, "prepare successfully loaded the Popcorn script" );
      ok( window.Popcorn.player, "prepare successfully loaded the Popcorn Player Module script" );
      start();
    }

    _page.prepare( checkScripts );
  });

});