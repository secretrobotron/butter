/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

define( [ "core/config",
          "editor/module",
          "timeline/module",
          "cornfield/module",
          "plugin/module"
        ],
  function( Config ){

  var __modules = Array.prototype.slice.call( arguments, 1 ),
      __initializedModules = [];

  return {
    init: function( Butter ){
      for( var i = 0; i < __modules.length; ++i ){
        var name = __modules[ i ].__moduleName;
        Butter[ name ] = new __modules[ i ]( Butter, Config.value( name ) );
        __initializedModules.push( Butter[ name ] );
      }
    },
    start: function( onReady ) {
      var loadedModules = [],
          readyModules = 0;

      function onModuleReady(){
        readyModules++;
        if( readyModules === __initializedModules.length ){
          onReady();
        }
      }

      for( var i = 0; i < __initializedModules.length; ++i ){
        if( __initializedModules[ i ]._start ){
          __initializedModules[ i ]._start( onModuleReady );
        }
        else{
          readyModules++;
        }
      }
    }
  };

});
