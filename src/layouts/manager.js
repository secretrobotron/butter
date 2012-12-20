define(["util/lang"], function(LangUtils){
  
  function LayoutManager(){

    var _layouts = {};
    var _mixins = {};

    function collectMixins(layout){
      var mixins = layout.querySelectorAll('*[butter-mixin]');
      Array.prototype.forEach.call(mixins, function(element){
        var name = element.getAttribute('butter-mixin');
        _mixins[name] = element;
      });
    }

    function replaceMixins(element){
      var childMixin;
      var contentDestination;
      var replacementElement;
      var mixin;

      if(element.nodeName === 'BUTTERMIXIN' && _mixins[element.getAttribute('type')]){
        mixin = _mixins[element.getAttribute('type')];
        replacementElement = mixin.cloneNode(true);
        contentDestination = replacementElement.querySelector('[butter-mixin-content-destination]') || replacementElement;
      }

      while(true){
        childMixin = element.querySelector('buttermixin');
        if(!childMixin) break;
        replaceMixins(childMixin);
      }

      if(mixin){
        var parent = element.parentNode;

        contentDestination.removeAttribute('butter-mixin-content-destination');
        replacementElement.removeAttribute('butter-mixin');

        while(element.childNodes.length > 0){
          contentDestination.appendChild(element.firstChild);
        }

        parent.replaceChild(replacementElement, element);

        var classInsertElements = parent.querySelectorAll('[butter-mixin-classes]');
        Array.prototype.forEach.call(classInsertElements, function(classInsertElement){
          var classType = classInsertElement.getAttribute('butter-mixin-classes');
          var classesElement = element.querySelector('[' + classType + '-classes]') || element;
          if(classesElement && classesElement.getAttribute(classType + '-classes')){
            classInsertElement.className = classInsertElement.className + ' ' + classesElement.getAttribute(classType + '-classes');
          }
          classInsertElement.removeAttribute('butter-mixin-classes');
        });

        if(element.hasAttribute('classes')){
         replacementElement.className = replacementElement.className + ' ' + element.getAttribute('classes');
         element.removeAttribute('classes');
        }
      }

    }

    this.addLayout = function(name, htmlString){
      var layout = _layouts[name] = LangUtils.domFragment(htmlString);
      collectMixins(layout);
    };

    this.getLayout = function(name, selector){
      var layout = _layouts[name];
      if(layout){
        if(selector){
          layout = layout.querySelector(selector);
        }
        replaceMixins(layout);
      }
      return layout;
    };

  }

  return {
    LayoutManager: LayoutManager
  }

});