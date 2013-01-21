define( [ "util/lang" ], function( LangUtils ) {
  
  function LayoutManager() {

    var _layouts = {};
    var _mixins = {};

    function collectMixins( layout ) {
      var mixins = layout.querySelectorAll( "*[butter-mixin]" );
      Array.prototype.forEach.call( mixins, function( element ) {
        var name = element.getAttribute( "butter-mixin" );
        _mixins[ name ] = element;
      });
    }

    function replaceMixins( element, classes ) {
      var childMixin;
      var contentDestination;
      var replacementElement;
      var mixin;
      var mixinType;

      // Clone the classes object to make sure namespace collisions between two child nodes don't arise
      classes = LangUtils.clone( classes );

      function collectClasses( element ) {
        var attributeNode;

        // Churn through attributes on the element to see if any end with "-classes". Atributes of this kind
        // are assumed to be for scoping mixin classes.
        for ( var i = element.attributes.length - 1; i >= 0; --i ) {
          attributeNode = element.attributes[ i ];
          if ( attributeNode.nodeName.indexOf( "-classes" ) === attributeNode.nodeName.length - 8 ) {
            classes[ attributeNode.nodeName.substr( 0, attributeNode.nodeName.length - 8 ) ] = attributeNode.value;
          }
        }
      }

      // If a mixin is found...
      if ( element.nodeName === "BUTTERMIXIN" ) {

        mixinType = element.getAttribute( "type" );

        // ...and a corresponding recipe exists...
        mixin = _mixins[ mixinType ];

        if ( mixin ) {
          // ...prepare a replacement node tree.
          replacementElement = mixin.cloneNode( true );

          // The node tree might need to be placed in a slightly different position in the main tree.
          contentDestination = replacementElement.querySelector( "[butter-mixin-content-destination]" ) || replacementElement;

          // If there are mixin classes to carry throughout this scope, collect them here.
          collectClasses( element );
        }
      }

      // Until there are no more...
      while ( true ) {
        childMixin = element.querySelector( "buttermixin" );
        if( !childMixin ) break;

        // ... replace child mixins
        replaceMixins( childMixin, classes );
      }

      // If this element was indeed a valid mixin...
      if ( mixin ) {
        var parent = element.parentNode;

        // Clean up nodes. Don't need most mixin attributes anymore.
        contentDestination.removeAttribute( "butter-mixin-content-destination" );
        replacementElement.removeAttribute( "butter-mixin" );

        // Place the new nodes where they belong.
        while ( element.childNodes.length > 0 ) {
          contentDestination.appendChild( element.firstChild );
        }

        // Replace the <buttermixin> element with exploded content.
        parent.replaceChild( replacementElement, element );

        // Find elements that can accept butter-mixin-classes.
        var classInsertElements = parent.querySelectorAll( "[butter-mixin-classes]" );

        Array.prototype.forEach.call(classInsertElements, function( classInsertElement ) {

          // From new elements, find out classList augmentation is necessary by looking for the
          // "butter-mixin-classes" attribute on them.
          var classType = classInsertElement.getAttribute( "butter-mixin-classes" );

          // See if there appropriate mixin classes in this scope.
          var mixinSpecificClasses = classes[ classType ];

          // And if there are, add them to this element.
          if ( mixinSpecificClasses ) {
            classInsertElement.className = classInsertElement.className + " " + mixinSpecificClasses;
          }

          // No need for the mixin-classes attribute anymore.
          classInsertElement.removeAttribute( "butter-mixin-classes" );
        });

        // If there are extra classes to add to this specific element, append them to the classList now.
        if ( element.hasAttribute( "classes" ) ) {
          replacementElement.className = replacementElement.className + " " + element.getAttribute( "classes" );
          element.removeAttribute( "classes" );
        }
      }

    }

    this.addLayout = function( name, htmlString ) {
      var layout = _layouts[ name ] = LangUtils.domFragment( htmlString );
      collectMixins( layout );
    };

    this.getLayout = function( name, selector ) {
      var layout = _layouts[ name ];
      if ( layout ) {
        if ( selector ) {
          layout = layout.querySelector( selector );
        }
        replaceMixins( layout, {} );
      }
      return layout;
    };

  }

  return {
    LayoutManager: LayoutManager
  }

});