define([], function(){
  
  function __nullFunction(){};

  function Entity(object, entityOptions){

    entityOptions = entityOptions || {};

    var _components = object.components = {};
    var _children = object.children = [];

    object.position = [0, 0];
    object.rotation = 0;
    object.scale = [1, 1];
    object.size = [0, 0];

    object.dirty = true;

    object.setPosition = function(position){
      object.position = position;
      object.dirty = true;
    };

    object.setSize = function(size){
      object.size = size;
      object.dirty = true;
    };

    object.setComponent = function(name, component){
      _components[name] = component;
      return component;
    };

    object.applyToComponent = function(componentName, applicationFunction){
      if(_components[componentName]){
        applicationFunction(_components[componentName]);
      }
    };

    object.addChild = function(childEntity){
      _children.push(childEntity);
    };

    object.removeChild = function(childEntity){
      _children.splice(_children.indexOf(childEntity), 1);
    };

    object.update = entityOptions.update || __nullFunction;

    return object;
  }

  return Entity;

});