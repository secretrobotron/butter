(function(){
  var ctx = require.config({
    context: 'game',
  });

  ctx(['lib/box2d.js', 'platform', 'player'],
    function(Box2DDummy, Platform, Player){

    var requestAnimFrame = (function(){
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    || 
              window.oRequestAnimationFrame      || 
              window.msRequestAnimationFrame     || 
              function( callback ){
                window.setTimeout(callback, 1000 / 60);
              };
    })();

    var gravity = new Box2D.b2Vec2(0.0, 9.8);
    var world = new Box2D.b2World(gravity);
     var currentTime = 0;
     var lastTime = 0;

     var player = new Player(world);
    // var platform = new Platform(world);

    // player.setPosition([250, 170]);
    // platform.setPosition([250, 250]);

    // function update(){
    //   var dt;

    //   currentTime = Date.now();
    //   dt = currentTime - lastTime;

    //   world.Step(dt, 2, 2);

    //   lastTime = currentTime;

    //   platform.update();
    //   player.update();

    //   requestAnimFrame(update);
    // }

    // currentTime = lastTime = Date.now();

    // requestAnimFrame(update);
    
  });

})();
