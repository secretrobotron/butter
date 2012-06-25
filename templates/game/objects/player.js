define(['engine/dom-component', 'engine/physics-component', 'engine/transform-component', 'engine/entity'],
  function(DOMComponent, PhysicsComponent, TransformComponent, Entity){
  
  const PLAYER_SIZE = [50, 50];

  function Platform(platformOptions){

    var _this = Entity(this);

    var _domComponent = _this.setComponent('dom', new DOMComponent('div'));
    var _physicsComponent = _this.setComponent('physics', new PhysicsComponent());

    _domComponent.addClasses('player');

    _physicsComponent.setBodyInitFunction(function(world){
      var shape, bodyDef, body;

      shape = new Box2D.b2PolygonShape();
      shape.SetAsBox(_this.size[0], _this.size[1]);

      bodyDef = new Box2D.b2BodyDef();
      bodyDef.set_type(Box2D.b2_dynamicBody);
      bodyDef.set_position(new Box2D.b2Vec2(0.0, 0.0));

      body = world.CreateBody(bodyDef);
      body.CreateFixture(shape, 5.0);

      return body;
    });

    _this.update = function(){
      if(_this.dirty){
        _physicsComponent.setPosition(_this.position);
      }
      var position = _physicsComponent.getPosition();
      _this.position[0] = position[0];
      _this.position[1] = position[1];
      _domComponent.setPosition([_this.position[0], _this.position[1]]);
      _this.dirty = false;
    };

    _this.jump = function(){
      console.log('jump');
      _physicsComponent.applyImpulse([0, 1000]);
    };

    _this.size[0] = PLAYER_SIZE[0];
    _this.size[1] = PLAYER_SIZE[1];
    _domComponent.setDimensions(_this.size);

  }

  return Platform;

});