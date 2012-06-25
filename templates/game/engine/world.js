define(['engine/dom-component', 'engine/entity'], function(DOMComponent, Entity){
  
  function World(worldOptions){

    var _this = Entity(this);
    var _world;
    var _domComponent;
    var _entities = [];

    function init(worldOptions){
      var gravity = new Box2D.b2Vec2(0.0, 10.0);

      _world = new Box2D.b2World(gravity);

      _domComponent = _this.setComponent('dom', new DOMComponent('div'));
      _domComponent.addClasses('world');

      if(worldOptions.width && worldOptions.height){
        _this.size = [
          worldOptions.width,
          worldOptions.height
        ];
        _domComponent.setDimensions(_this.size);
      }
    }

    _this.setActive = function(state){
      if(state){
        document.body.appendChild(_domComponent.element);
      }
      else if(_domComponent.element.parentNode){
        document.body.removeChild(_domComponent.element);
      }
    };

    _this.addEntity = function(entity){
      entity.applyToComponent('dom', function(childDomComponent){
        _domComponent.element.appendChild(childDomComponent.element);
      });
      entity.applyToComponent('physics', function(childPhysicsComponent){
        childPhysicsComponent.createBody(_world);
      });
      _entities.push(entity);
    };

    _this.removeEntity = function(entity){
      entity.applyToComponent('dom', function(childDomComponent){
        _domComponent.element.removeChild(childDomComponent.element);
      });
      entity.applyToComponent('physics', function(childPhysicsComponent){
        childPhysicsComponent.destroyBody(_world);
      });
      _entities.splice(_entities.indexOf(entity), 1);
    };

    _this.update = function(dt){
      _world.Step(dt, 2, 2);
      for(var i=0, l=_entities.length; i<l; ++i){
        _entities[i].update();
      }
    };

    init(worldOptions);

  }

  return World;

});