define([], function(){
  
  function DOMComponent(type){

    var _this = this;

    var _element = document.createElement(type);

    _this.element = _element;

    _this.setDimensions = function(dimensions){
      _this.width = dimensions[0];
      _this.height = dimensions[1];
      _element.style.width = dimensions[0] + 'px';
      _element.style.height = dimensions[1] + 'px';
    };

    _this.setPosition = function(position){
      _this.x = position[0];
      _this.y = position[1];
      _element.style.left = position[0] + 'px';
      _element.style.top = position[1] + 'px';
    };

    _this.addClasses = function(){
      var i, l=arguments.length;
      for(i=0; i<l; ++i){
        _element.classList.add(arguments[i]);
      }
    };

    _this.removeClasses = function(){
      var i, l=arguments.length;
      for(i=0; i<l; ++i){
        _element.classList.remove(arguments[i]);
      }
    };

    _this.setDimensions([0, 0]);
    _this.setPosition([0, 0]);

  }

  return DOMComponent;

});