(function(){
  var ctx = require.config({
    context: 'game',
  });

  ctx(['lib/box2d.js', 'lib/gl-matrix-min.js', 'objects/platform', 'objects/player', 'engine/world'],
    function(Box2D, GLMatrix, Platform, Player, World){

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

    var currentTime, lastTime;

    var platform = new Platform({
      width: 200,
      height: 100
    });

    var player = new Player();

    var world = new World({
      width: 800,
      height: 600
    });

    world.addEntity(platform);
    world.addEntity(player);

    world.setActive(true);

    // Butter({
    //   config: 'template.conf'
    // });

    platform.setPosition([70, 200]);
    player.setPosition([30, 0]);

    function update(){
      var dt;

      currentTime = Date.now();
      dt = currentTime - lastTime;

      world.update(dt);

      lastTime = currentTime;
      requestAnimFrame(update);
    }

    currentTime = lastTime = Date.now();

    window.addEventListener('keydown', function(e){
      player.jump();
    }, false);

    requestAnimFrame(update);

  });

})();
