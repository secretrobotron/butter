define([], function(){
  const SIZE = [50, 50];

  function Player(box2dWorld){
    var _this = this;

    var shape, bodyDef, body;
    var canJump = false;
    var keysDown = {};

    shape = new Box2D.b2PolygonShape();
    shape.SetAsBox(SIZE[0]/2, SIZE[1]/2);

    bodyDef = new Box2D.b2BodyDef();
    bodyDef.set_type(Box2D.b2_dynamicBody);
    bodyDef.set_position(new Box2D.b2Vec2(0.0, 0.0));

    body = box2dWorld.CreateBody(bodyDef);
    body.CreateFixture(shape, 0.0001);

    body.SetFixedRotation(true);

    this.setPosition = function(position){
      var positionVector = new Box2D.b2Vec2(0.0, 0.0);
      positionVector.Set(position[0], position[1]);
      body.SetTransform(positionVector, 0.0);
    };

    this.getPosition = function(){
      var position = body.GetPosition();
      return [
        position.get_x(),
        position.get_y()
      ];
    };

    this.jump = function(){
      if(canJump){
        canJump = false;
        body.ApplyLinearImpulse(new Box2D.b2Vec2(0, -500), body.GetWorldCenter());  
      }
    };

    var element = document.createElement('div');
    element.classList.add('player');
    element.style.width = SIZE[0] + 'px';
    element.style.height = SIZE[1] + 'px';
    document.body.appendChild(element);

    this.update = function(){
      var position = body.GetPosition();
      element.style.left = position.get_x() - SIZE[0]/2 + 'px';
      element.style.top = position.get_y() - SIZE[1]/2 + 'px';
      var contactList = body.GetContactList();
      if(contactList.a !== 0){
        canJump = true;
      }
      if(keysDown[32]){
        _this.jump();
      }
      if(keysDown[37]){
        body.ApplyLinearImpulse(new Box2D.b2Vec2(body.GetMass() * -1000, 0), body.GetWorldCenter());
      }
      if(keysDown[39]){
        body.ApplyLinearImpulse(new Box2D.b2Vec2(body.GetMass() * 1000, 0), body.GetWorldCenter());
      }
    };

    window.addEventListener('keyup', function(e){
      keysDown[e.which] = false;
    }, false);

    window.addEventListener('keydown', function(e){
      keysDown[e.which] = true;
    }, false);

  }

  return Player;
});