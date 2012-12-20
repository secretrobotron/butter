define([], function(){
  
  function ButterScriptManager(butter, initialScope){
    var _globalScope = {
      butter: butter
    };

    function createScope(newScope){
      var scope = {};

      Object.keys(_globalScope).forEach(function(key){
        scope[key] = _globalScope[key];
      });
      Object.keys(newScope).forEach(function(key){
        scope[key] = newScope[key];
      });

      return scope;
    }

    this.createScript = function(code, additionalScope){
      var scope = createScope(additionalScope);
      var argKeys = Object.keys(scope);
      var argValues = argKeys.map(function(key){return scope[key]});
      var fn = new Function(argKeys.join(','), code);
      return function(){
        return fn.apply(fn, argValues);
      };
    };

    _globalScope = createScope(initialScope);
  }

  return {
    ButterScriptManager: ButterScriptManager
  };

});