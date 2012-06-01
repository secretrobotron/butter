/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

define(

  [
    "core/config",
    "editor/module",
    "timeline/module",
    "cornfield/module",
    "plugin/module"
  ],
  function( Config ){

  var __moduleList = Array.prototype.slice.call( arguments, 1 );

  return {
    init: function( onReady ){

      var modules = [],
          loadedModules = 0,
          readyModules = 0;

      for( var i=0; i<__moduleList.length; ++i ){
        var name = __moduleList[ i ].__moduleName;
        butter[ name ] = new __moduleList[ i ]( butter, config.value( name ) );
        modules.push( butter[ name ] );
      }

      function onModuleReady(){
        readyModules++;
        if( readyModules === modules.length ){
          onReady();
        }
      }

      for( var i=0; i<modules.length; ++i ){
        if( modules[ i ]._start ){
          modules[ i ]._start( onModuleReady );
        }
        else{
          readyModules++;
        }
      }
    }
  };

});
