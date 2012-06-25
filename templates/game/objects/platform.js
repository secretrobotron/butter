define(['engine/dom-component', 'engine/physics-component', 'engine/transform-component', 'engine/entity'],
  function(DOMComponent, PhysicsComponent, TransformComponent, Entity){
  
  function Platform(platformOptions){

    var _this = Entity(this);

    var _domComponent = _this.setComponent('dom', new DOMComponent('div'));
    var _physicsComponent = _this.setComponent('physics', new PhysicsComponent());

    _domComponent.addClasses('platform');

    _physicsComponent.setBodyInitFunction(function(world){
      var shape, bodyDef, body;

      shape = new Box2D.b2PolygonShape();
      shape.SetAsBox(_this.size[0], _this.size[1]);

      bodyDef = new Box2D.b2BodyDef();
      bodyDef.set_position(new Box2D.b2Vec2(0.0, 0.0));

      body = world.CreateBody(bodyDef);
      body.CreateFixture(shape, 0.0);

      return body;
    });

    _this.update = function(){
      if(_this.dirty){
        _physicsComponent.setPosition(_this.position);
      }
      var position = _physicsComponent.getPosition();
      _this.position[0] = position[0];
      _this.position[1] = position[1];
      _domComponent.setPosition([_this.position[0], _this.position[1] - _this.size[1]]);
      _this.dirty = false;
    };

    if(platformOptions.width && platformOptions.height){
      _this.size[0] = platformOptions.width;
      _this.size[1] = platformOptions.height;
      _domComponent.setDimensions(_this.size);
    }

  }

  return Platform;

});