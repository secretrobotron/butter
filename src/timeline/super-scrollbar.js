/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

define( [ "text!layouts/super-scrollbar.html", "util/lang" ],
  function( SUPER_SCROLLBAR_LAYOUT, LangUtils ) {

  function SuperScrollbar(){

    var _this = this,
        _element;

    _this.element = null;

    function init() {
      var layoutSrc = LangUtils.domFragment( SUPER_SCROLLBAR_LAYOUT );
      _element = _this.element = layoutSrc;
    }

    init();
  }

  return SuperScrollbar;

});