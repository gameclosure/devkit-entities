import ui.resource.loader as loader;
var _imageMap = loader.getMap();

import .Rect;
import .Circle;

var ShapeFactory = Class(function () {
  /**
   * returns a new shape
   */
  this.getShape = function (opts) {
    opts = opts || {};

    if (opts.radius === undefined
      && (opts.width === undefined || opts.height === undefined))
    {
      this.applyImageDimensions(opts);
    }

    if (opts.radius !== undefined) {
      return new Circle(opts);
    } else {
      return new Rect(opts);
    }
  };

  /**
   * updates an opts object for default view dimensions based on art
   */
  this.applyDefaultViewOpts = function (opts) {
    opts = opts || {};

    if (opts.width === undefined || opts.height === undefined) {
      this.applyImageDimensions(opts);
    }

    return opts;
  };

  /**
   * returns a hit bounds object with defaults based on image or sprite url
   */
  this.applyImageDimensions = function (opts) {
    if (!opts) {
      return null;
    }

    var img = opts.image;
    var url = opts.url;
    if (!img && url) {
      // support SpriteViews by finding the first animation match for url
      for (var prop in _imageMap) {
        if (prop.indexOf(url) >= 0) {
          img = prop;
          break;
        }
      }
    }

    var map = _imageMap[img || url];
    if (map) {
      opts.width = opts.width || (map.w + map.marginLeft + map.marginRight);
      opts.height = opts.height || (map.h + map.marginTop + map.marginBottom);
    }

    return opts;
  };
});

// class exposed for inheritance
exports = ShapeFactory;

// used as a singleton
var _instance = new ShapeFactory();
exports.get = function () {
  return _instance;
};
