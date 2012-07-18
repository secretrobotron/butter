/*global text,expect,ok,module,notEqual,test,window*/

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

(function(window, document, undefined ){

  window._testInitCallback = function(){};
  window._testBeforeCallback = function(){};
  window._testAfterCallback = function(){};

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

  function createButter( callback ){

    Butter({
      config: "../test-config.json",
      debug: false,
      ready: function( butter ){
        butterLifeCycle.rememberButter( butter );
        callback( butter );
      }
    });
  } //createButter

  module( "TrackEvent", butterLifeCycle );

  asyncTest( "Create TrackEvent object", 2, function(){

    createButter( function( butter ){

      Popcorn.plugin( "createTrackEventTest", function() {} );

      var m = butter.addMedia({ url: "../../external/popcorn-js/test/italia.ogg", target: "mediaDiv" }),
          t = m.addTrack(),
          te1 = t.addTrackEvent( { name: "TrackEvent 1", type: "test", popcornOptions: { start: 0, end: 1 } } ),
          te2 = t.addTrackEvent( { name: "TrackEvent 2", type: "createTrackEventTest", popcornOptions: { start: 1 } } );

      ok( te1.name === "TrackEvent 1" && te1.popcornOptions.start ===  0 && te1.popcornOptions.end === 1, "TrackEvent name is setup correctly" );
      ok( te2.popcornTrackEvent._natives.type === "createTrackEventTest" && te2.popcornTrackEvent.start === 1, "TrackEvent has correct popcornTrackEvent reference" );

      Popcorn.removePlugin( "createTrackEventTest" );
      start();
    });
  });

  asyncTest( "Add, retrieve, and remove TrackEvent", 13, function(){

    createButter( function( butter ){

      var eventState = 0,
          m = butter.addMedia(),
          t = m.addTrack();

      butter.listen( "trackeventadded", function( trackEvent ){
        eventState = [ 1, trackEvent.data ];
      });
      butter.listen( "trackeventremoved", function( trackEvent ){
        eventState = [ 0, trackEvent.data ];
      });

      var te1 = t.addTrackEvent( { name: "TrackEvent 1", type: "test", start: 0, end: 1 } );
      ok( eventState[ 0 ] === 1 && eventState[ 1 ] === te1, "trackeventadded event received" );

      var te2 = t.addTrackEvent( { name: "TrackEvent 2", type: "test", start: 1, end: 2 } );
      ok( eventState[ 0 ] === 1 && eventState[ 1 ] === te2, "trackeventadded event received" );

      var te3 = t.addTrackEvent( { name: "TrackEvent 3", type: "test", start: 2, end: 3 } );
      ok( eventState[ 0 ] === 1 && eventState[ 1 ] === te3, "trackeventadded event received" );

      ok( te1 === t.getTrackEventByName( "TrackEvent 1" ), "TrackEvent method 1 is correct" );
      ok( te2 === t.getTrackEventByName( "TrackEvent 2" ), "TrackEvent method 2 is correct" );
      ok( te3 === t.getTrackEventByName( "TrackEvent 3" ), "TrackEvent method 3 is correct" );

      t.removeTrackEvent( te1 );
      ok( eventState[ 0 ] === 0 && eventState[ 1 ] === te1, "trackeventremoved event received" );
      t.removeTrackEvent( te2 );
      ok( eventState[ 0 ] === 0 && eventState[ 1 ] === te2, "trackeventremoved event received" );
      t.removeTrackEvent( te3 );
      ok( eventState[ 0 ] === 0 && eventState[ 1 ] === te3, "trackeventremoved event received" );

      ok( t.getTrackEventByName( "TrackEvent 1" ) === undefined, "TrackEvent 1 doesn't exist" );
      ok( t.getTrackEventByName( "TrackEvent 2" ) === undefined, "TrackEvent 2 doesn't exist" );
      ok( t.getTrackEventByName( "TrackEvent 3" ) === undefined, "TrackEvent 3 doesn't exist" );

      var tracks = butter.tracks;
      for ( var track in tracks ) {
        ok( tracks[ track ].trackEvents.length === 0, "No TrackEvents remain" );
      }

      start();
    });

  });

  asyncTest( "Trackevents use plugin defaults", 1, function() {

    createButter(function( butter ) {
      var te1,
          m = butter.addMedia({ url: "../../external/popcorn-js/test/italia.ogg", target: "mediaDiv" }),
          t = m.addTrack();

      butter.listen( "mediaready", function( e ) {
        butter.listen( "trackeventupdated", function( e ) {
          equal( e.data.popcornOptions.text, "Popcorn.js", "Trackevent is given proper plugin defaults" );
          start();
        });

        te1 = t.addTrackEvent({
          name: "TrackEvent 1",
          type: "text",
          start: 0,
          end: 1
        });

        te1.update({
          start: 5,
          end: 6
        });
      });
    });
  });

  asyncTest( "Remove/Add Track events for constituent TrackEvents", 4, function(){

    createButter( function( butter ){

      var t1,
          te,
          state,
          m;

      m = butter.addMedia();

      t1 = m.addTrack(),
      te = t1.addTrackEvent({ name: "TrackEvent 3", type: "test", start: 2, end: 3 } ),
      state = undefined;

      butter.listen( "trackeventremoved", function( trackEvent ){
        state = trackEvent.data;
      } );

      butter.listen( "trackeventadded", function( trackEvent ){
        state = trackEvent.data;
      } );

      ok( t1.trackEvents.length === 1, "Track event stored" );

      m.removeTrack( t1 );
      ok( state === te, "Track event removal event" );

      state = undefined;

      m.addTrack( t1 );
      ok( state === te, "Track event added again" );
      ok( t1.trackEvents.length === 1, "Track event stored" );

      start();
    });

  });

  asyncTest( "Select all track events of a particular type using getTrackEvents", 2, function(){

    createButter( function( butter ){

      var m = butter.addMedia({ url: "../../external/popcorn-js/test/italia.ogg", target: "mediaDiv" }),
          t = m.addTrack(),
          te1 = t.addTrackEvent( { name: "TrackEvent 1", type: "text", popcornOptions: { start: 0, end: 1, target: "mediaDiv" } } ),
          te2 = t.addTrackEvent( { name: "TrackEvent 2", type: "test", popcornOptions: { start: 0, end: 3, target: "mediaDiv" } } );

      ok( butter.getTrackEvents( "type", "text" ).length === 1, "One text track event exists." );
      ok( butter.getTrackEvents().length === 2, "Selecting all track events by not providing parameters works." );

      start();
    });
  });

  asyncTest( "Select all track events of a particular type using getTrackEventsByType", 1, function(){

    createButter( function( butter ){

      var m = butter.addMedia({ url: "../../external/popcorn-js/test/italia.ogg", target: "mediaDiv" }),
          t = m.addTrack(),
          te1 = t.addTrackEvent( { name: "TrackEvent 1", type: "text", popcornOptions: { start: 0, end: 1, target: "mediaDiv" } } ),
          te2 = t.addTrackEvent( { name: "TrackEvent 2", type: "test", popcornOptions: { start: 0, end: 3, target: "mediaDiv" } } );

      ok( butter.getTrackEventsByType( "test" ).length === 1, "One test track event exists." );

      start();
    });
  });

}( window, window.document ));