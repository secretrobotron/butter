define([], function(){
  
  function PhysicsComponent(componentOptions){

    var _this = this;
    var _body;
    var _bodyInitFunction;

    function init(componentOptions){
      if(componentOptions.bodyInitFunction){
        _this.setBodyInitFunction(componentOptions.bodyInitFunction);
      }
    }

    this.setBodyInitFunction = function(bodyInitFunction){
      _bodyInitFunction = bodyInitFunction;
    };

    this.createBody = function(world){
      _body = _bodyInitFunction(world);
    };

    this.destroyBody = function(world){
      world.destroyBody(_body);
    };

    this.getPosition = function(){
      var position = _body.GetPosition();
      return [
        position.get_x(),
        position.get_y()
      ];
    };

    this.setPosition = function(newPosition){
      var positionVector = new Box2D.b2Vec2(0.0, 0.0);
      positionVector.Set(newPosition[0], newPosition[1]);
      _body.SetTransform(positionVector, 0.0);
    };

    this.applyImpulse = function(impulseVector){
      var impulseVector = new Box2D.b2Vec2(impulseVector[0], impulseVector[1]);
      _body.ApplyLinearImpulse(impulseVector, _body.GetWorldCenter());
    };

    init(componentOptions || {});

  }

  return PhysicsComponent;

});