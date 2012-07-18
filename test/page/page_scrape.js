/*global Butter,asyncTest,equal,start,ok*/
require( [], function() {
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

  }());

  function createButter( callback ){

    Butter({
      config: "test-config.json",
      debug: false,
      ready: function( butter ){
        function runTests() {
          callback( butter );
        }
        butterLifeCycle.rememberButter( butter );
        butter.currentMedia.onReady( runTests );
      }
    });
  }

  module( "Page", butterLifeCycle );
  asyncTest( "scrape media target and media elements", 2, function() {
    createButter( function( butter ) {
      var scrapedPage;

      scrapedPage = butter.page.scrape();

      equal( scrapedPage.media.length, 1, "Scrape retrieved one media element" );
      equal( scrapedPage.target.length, 2, "Scrape retrieved two target elements" );
      start();
    });
  });

});
