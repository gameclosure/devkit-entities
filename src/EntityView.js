import ui.ImageView as ImageView;
import ui.SpriteView as SpriteView;

import .utils;

exports = Class(SpriteView, function () {
  var supr = SpriteView.prototype;

  this.name = "EntityView";

  this.init = function (opts) {
    opts.tag = opts.tag || opts.entity.uid;
    this._entity = opts.entity;

    this._validateSprite(opts);
    if (!this.isSprite) {
      opts.image = opts.image || opts.url;
    }

    supr.init.call(this, opts);
  };

  this.reset = function (opts) {
    this.resetAllAnimations(opts);

    var s = this.style;
    var m = this._entity.model;
    opts.width = opts.width || m.shape.width || 2 * (m.shape.radius || 0);
    opts.height = opts.height || m.shape.height || 2 * (m.shape.radius || 0);
    this.updateOpts(opts);

    s.x = m.x;
    s.y = m.y;
    s.anchorX = opts.anchorX !== undefined ? opts.anchorX : (s.width || 0) / 2;
    s.anchorY = opts.anchorY !== undefined ? opts.anchorY : (s.height || 0) / 2;
    s.visible = true;
  };

  this.update = function (dt) {
    var s = this.style;
    var m = this._entity.model;
    s.x = m.x;
    s.y = m.y;
  };

  /**
   * SpriteView Extensions
   */

  this.resetAllAnimations = function (opts) {
    this._validateSprite(opts);

    if (this.isSprite) {
      supr.resetAllAnimations.call(this, opts);
      this.setImage(this._animations[opts.defaultAnimation].frames[0]);
    } else {
      // setImage is expensive, so only call it if we have to
      var image = opts.image || opts.url;
      if (image && this.setImage && this._currImage !== image) {
        this.setImage(image);
        this._currImage = image;
      }
    }
  };

  this.startAnimation = function (name, opts) {
    if (this.isSprite && this._animations[name]) {
      supr.startAnimation.call(this, name, opts);
    }
  };

  this._validateSprite = function(opts) {
    this.isSprite = !!SpriteView.allAnimations[opts.url];
  };

  /**
   * Helpers
   */

  utils.addReadOnlyProperty(this, 'minX', function () {
   var s = this.style;
   return s.x + s.offsetX;
  });

  utils.addReadOnlyProperty(this, 'maxX', function () {
   var s = this.style;
   return s.x + s.offsetX + s.width;
  });

  utils.addReadOnlyProperty(this, 'minY', function () {
   var s = this.style;
   return s.y + s.offsetY;
  });

  utils.addReadOnlyProperty(this, 'maxY', function () {
   var s = this.style;
   return s.y + s.offsetY + s.height;
  });

  Object.defineProperty(this, 'width', {
    enumerable: true,
    get: function () { return this.style.width; },
    set: function (value) { this.style.width = value; }
  });

  Object.defineProperty(this, 'height', {
    enumerable: true,
    get: function () { return this.style.height; },
    set: function (value) { this.style.height = value; }
  });

  Object.defineProperty(this, 'visible', {
    enumerable: true,
    get: function () { return this.style.visible; },
    set: function (value) { this.style.visible = value; }
  });

  /**
   * Debugging Utilities
   */

  this.showHitBounds = function () {
    this._debugDraw = true;
  };

  this.hideHitBounds = function () {
    this._debugDraw = false;
  };

  this.render = function (ctx) {
    supr.render.call(this, ctx);

    if (this._debugDraw) {
      ctx.save();

      // remove offsets and scale
      var invScale = 1 / this.style.scale;
      ctx.translate(-this.minX, -this.minY);
      ctx.scale(invScale, invScale);

      // draw debug lines
      var shape = this._entity.model.shape;
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      if (shape.radius) {
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI, false);
        ctx.fill();
      } else if (shape.width && shape.height) {
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
      }

      ctx.restore();
    }
  };

});
