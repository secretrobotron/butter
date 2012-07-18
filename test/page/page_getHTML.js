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
  asyncTest( "getHTML functionality", 9, function() {
    createButter( function( butter ) {
      var fakeScript = [ "var i = 1 + 1;" ],
          html = butter.page.getHTML( fakeScript ),
          testDiv = document.createElement( "div" ),
          headString = html.substring( html.indexOf( "<head>" ) + 6, html.indexOf( "</head>" ) ),
          expectedBaseSrc = location.protocol + "//" + location.hostname + ( location.port ? ":" + location.port : "" ) + "/test/page/",
          bodyString = html.substring( html.indexOf( "<body>" ) + 6, html.indexOf( "</body>" ) );

      // inject elements into div to test for expected elements
      testDiv.innerHTML = headString;

      // Check that all the expected butter attributes were removed
      equal( html.indexOf( "data-butter-source" ), -1, "Removed all data-butter-source attributes" );
      equal( html.indexOf( "data-butter-exclude" ), -1, "Removed all data-butter-exclude elements" );
      equal( html.indexOf( "data-butter-default" ), -1, "Removed all data-butter-default attributes" );

      var baseTag = testDiv.getElementsByTagName( "base" )[ 0 ];

      equal( baseTag.href, expectedBaseSrc, "Generated expected base tag" );

      testDiv.innerHTML = bodyString;

      var popcornScripts = testDiv.getElementsByTagName( "script" )[ 0 ],
          butterCleanDiv = testDiv.querySelector( "#test" );

      ok( !butterCleanDiv.hasAttribute( "butter-clean" ), "Removed the butter-clean attribute" );
      ok( !butterCleanDiv.hasAttribute( "data-butter" ), "Removed the data-butter attribute on element with butter-clean=true" );
      ok( !butterCleanDiv.hasAttribute( "data-butter-default" ), "Removed the data-butter-default attribute on element with butter-clean=true" );
      ok( popcornScripts, "getHTML generated a script element in the body" );
      ok( popcornScripts.innerHTML.indexOf( fakeScript[ 0 ] ), "Added expected popcornScripts to the HTML" );
      start();
    });
  });

});
