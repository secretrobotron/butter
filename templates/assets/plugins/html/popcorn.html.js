(function ( Popcorn ) {
  Popcorn.plugin( "html", {

    manifest: {
      about: {
        name: "html",
        version: "0.1",
        author: "@secretrobotron"
      },
      options: {
        html: {
          elem: "textarea",
          label: "HTML",
          "default": "Popcorn Maker"
        },
        start: {
          elem: "input",
          type: "text",
          label: "In",
          group: "advanced",
          "units": "seconds"
        },
        end: {
          elem: "input",
          type: "text",
          label: "Out",
          group: "advanced",
          "units": "seconds"
        }
      }
    },

    _setup: function( options ) {
      options.toString = function() {
        return options.html;
      };
    },

    start: function( event, options ) {
    },

    end: function( event, options ) {
    },

    _teardown: function( options ) {
    }
  });
}( window.Popcorn ));
