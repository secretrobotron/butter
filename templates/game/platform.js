define([], function(){
  const SIZE = [200, 100];

  function Platform(box2dWorld){
    var shape, bodyDef, body;

    shape = new Box2D.b2PolygonShape();
    shape.SetAsBox(SIZE[0]/2, SIZE[1]/2);

    bodyDef = new Box2D.b2BodyDef();
    bodyDef.set_position(new Box2D.b2Vec2(0.0, 0.0));

    body = box2dWorld.CreateBody(bodyDef);
    body.CreateFixture(shape, 0.0);

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

    var element = document.createElement('div');
    element.classList.add('platform');
    element.style.width = SIZE[0] + 'px';
    element.style.height = SIZE[1] + 'px';
    document.body.appendChild(element);

    this.update = function(){
      var position = body.GetPosition();
      element.style.left = position.get_x() - SIZE[0]/2 + 'px';
      element.style.top = position.get_y() - SIZE[1]/2 + 'px';
    };
  }

  return Platform;
});