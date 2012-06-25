define([], function(){
  
  function TransformComponent(){

    var _this = this;
    var _matrix = this.matrix = mat3.create();
    var _resultant = this.resultant = mat3.create();

    _this.position = [0, 0];
    _this.rotation = [0, 0];
    _this.scale = [0, 0];
    _this.size = [0, 0];

    this.update = function(parentMatrix){
      mat3.identity(_matrix);
      mat3.translate(_matrix, _this.position);
      mat3.rotate(_matrix, _this.rotation);
      mat3.scale(_matrix, _this.scale);
      mat3.multiply(_matrix, parentMatrix, _resultant);
    };

  }

  return TransformComponent;

});