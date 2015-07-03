var min = Math.min;
var max = Math.max;
var abs = Math.abs;
var sqrt = Math.sqrt;

// this value helps resolve colliding state between entities
var COLLISION_OFFSET = 0.001;

// shape-to-function maps
var SHAPE_COLLIDE_MAP = {
  Rect: {
    Rect: "rectCollidesWithRect",
    Circle: "rectCollidesWithCircle"
  },
  Circle: {
    Rect: "circleCollidesWithRect",
    Circle: "circleCollidesWithCircle"
  }
};

var SHAPE_RESOLVE_MAP = {
  Rect: {
    Rect: "resolveCollidingRects",
    Circle: "resolveCollidingRectCircle"
  },
  Circle: {
    Rect: "resolveCollidingCircleRect",
    Circle: "resolveCollidingCircles"
  }
};

var SHAPE_INSIDE_MAP = {
  Rect: {
    Rect: "rectInsideRect",
    Circle: "rectInsideCircle"
  },
  Circle: {
    Rect: "circleInsideRect",
    Circle: "circleInsideCircle"
  }
};

var _genericResolution = function(genericName, lookupMap, defaultResult) {
  return function (model1, model2) {
    var fn = null;
    var result = defaultResult;
    var shape1 = model1.shape || model1;
    var shape2 = model2.shape || model2;
    var map = lookupMap[shape1.name];
    if (map) {
      fn = map[shape2.name];
    }

    if (fn) {
      result = this[fn](shape1, shape2);
    } else {
      logger.warn(genericName + " function not found for:", shape1, shape2);
    }
    return result;
  };
};

/**
 * IMPORTANT NOTES:
 * ~ by default, collisions support circles and axis-aligned rectangles only
 * ~ these are NOT continuous collision detection algorithms, meaning a large
 *   value of dt could cause entities to pass through each other - it's up to the
 *   developer to manage the time step of his/her game to prevent this behavior
 */
exports = {
  /**
   * ~ collide defines how collisions are detected
   * ~ by default, only works with circles and axis-aligned rectangles
   */
  collide: _genericResolution('Collide', SHAPE_COLLIDE_MAP, false),

  /**
   * ~ resolveCollision guarantees that two models are not colliding
   *   by pushing them apart
   * ~ shapes with fixed = true are never moved
   * ~ returns total distance moved to separate the objects
   */
  resolveCollision: _genericResolution('Resolve', SHAPE_RESOLVE_MAP, 0),

  /**
   * ~ REQUIRED
   * ~ isInside is used to determine if one entity is fully contained by another
   * ~ by default, returns a bool, and only works with circles and rects
   */
  isInside: _genericResolution('Inside', SHAPE_INSIDE_MAP, false),

  circleCollidesWithCircle: function (circ1, circ2) {
    var x1 = circ1.x;
    var y1 = circ1.y;
    var r1 = circ1.radius;
    var x2 = circ2.x;
    var y2 = circ2.y;
    var r2 = circ2.radius;
    var dx = x2 - x1;
    var dy = y2 - y1;
    var distSqrd = dx * dx + dy * dy;
    var distColl = r1 + r2;
    var distCollSqrd = distColl * distColl;
    return distSqrd <= distCollSqrd;
  },

  circleCollidesWithRect: function (circ, rect) {
    var cx = circ.x;
    var cy = circ.y;
    var cr = circ.radius;
    var rwHalf = rect.width / 2;
    var rhHalf = rect.height / 2;
    var rx = rect.x + rwHalf;
    var ry = rect.y + rhHalf;
    var dx = abs(cx - rx);
    var dy = abs(cy - ry);
    if (dx > rwHalf + cr || dy > rhHalf + cr) {
      // far case: circle's center is too far from rect's center
      return false;
    } else if (dx <= rwHalf || dy <= rhHalf) {
      // close case: circle's center is close enough to rect's center
      return true;
    } else {
      // corner case: rect corner within a radius of the circle's center
      var dcx = dx - rwHalf;
      var dcy = dy - rhHalf;
      var cornerDistSqrd = dcx * dcx + dcy * dcy;
      return cornerDistSqrd <= cr * cr;
    }
  },

  rectCollidesWithCircle: function (rect, circ) {
    return this.circleCollidesWithRect(circ, rect);
  },

  rectCollidesWithRect: function (rect1, rect2) {
    var x1 = rect1.x;
    var y1 = rect1.y;
    var xf1 = x1 + rect1.width;
    var yf1 = y1 + rect1.height;
    var x2 = rect2.x;
    var y2 = rect2.y;
    var xf2 = x2 + rect2.width;
    var yf2 = y2 + rect2.height;
    return x1 <= xf2 && xf1 >= x2 && y1 <= yf2 && yf1 >= y2;
  },

  /**
   * ~ resolveCollidingCircles forces two circles apart based on their centers
   */
  resolveCollidingCircles: function (circ1, circ2) {
    var x1 = circ1.x;
    var y1 = circ1.y;
    var r1 = circ1.radius;
    var mult1 = 0.5;
    var x2 = circ2.x;
    var y2 = circ2.y;
    var r2 = circ2.radius;
    var mult2 = 0.5;
    var dx = x2 - x1;
    var dy = y2 - y1;
    var dist = sqrt(dx * dx + dy * dy);
    var distColl = r1 + r2 + COLLISION_OFFSET;

    // if concentric, force a very small distance
    if (dist === 0) {
      dx = COLLISION_OFFSET;
      dist = COLLISION_OFFSET;
    }

    var dd = distColl - dist;

    // fixed entities cannot be moved by physics
    if (circ1.fixed && circ2.fixed) {
      dd = 0;
    } else if (circ1.fixed) {
      mult1 = 0;
      mult2 = 1;
    } else if (circ2.fixed) {
      mult1 = 1;
      mult2 = 0;
    }

    circ1.x += mult1 * dd * -(dx / dist);
    circ1.y += mult1 * dd * -(dy / dist);
    circ2.x += mult2 * dd * (dx / dist);
    circ2.y += mult2 * dd * (dy / dist);
    return dd;
  },

  /**
   * ~ resolveCollidingCircleRect forces apart a circle and rect
   * ~ good default collision behavior for landing on a platforms vs.
   *   hitting the side (missing the platform)
   */
  resolveCollidingCircleRect: function (circ, rect) {
    var cx = circ.x;
    var cy = circ.y;
    var cr = circ.radius;
    var rwHalf = rect.width / 2;
    var rhHalf = rect.height / 2;
    var rx = rect.x + rwHalf;
    var ry = rect.y + rhHalf;
    var dx = abs(cx - rx);
    var dy = abs(cy - ry);
    if (dx > rwHalf + cr || dy > rhHalf + cr || (circ.fixed && rect.fixed)) {
      // far case: circle's center too far or both entities are fixed
      return 0;
    } else if (dx <= rwHalf || dy <= rhHalf) {
      // close case: treat the circle like another rect, then resolve
      var tempHitBounds = {
        x: cx - cr,
        y: cy - cr,
        width: 2 * cr,
        height: 2 * cr,
        fixed: circ.fixed
      };
      var dd = this.resolveCollidingRects(rect, tempHitBounds);
      circ.x = tempHitBounds.x + cr;
      circ.y = tempHitBounds.y + cr;
      return dd;
    } else {
      // corner case: the two meet at a rect corner, push them away
      var mult1 = 0.5;
      var mult2 = 0.5;
      // get the right corner point
      var nx = cx < rx ? rx - rwHalf : rx + rwHalf;
      var ny = cy < ry ? ry - rhHalf : ry + rhHalf;
      dx = nx - cx;
      dy = ny - cy;
      var dist = sqrt(dx * dx + dy * dy);
      var distColl = cr + COLLISION_OFFSET;
      var dd = distColl - dist;

      // fixed entities cannot be moved by physics
      if (circ.fixed) {
        mult1 = 0;
        mult2 = 1;
      } else if (rect.fixed) {
        mult1 = 1;
        mult2 = 0;
      }

      circ.x += mult1 * dd * -(dx / dist);
      circ.y += mult1 * dd * -(dy / dist);
      rect.x += mult2 * dd * (dx / dist);
      rect.y += mult2 * dd * (dy / dist);
      return dd;
    }
  },

  resolveCollidingRectCircle: function (rect, circ) {
    return resolveCollidingCircleRect(circ, rect);
  },

  /**
   * ~ resolveCollidingRects forces two rects apart, but only in one direction
   * ~ good default collision behavior for landing on a platforms vs.
   *   hitting the side (missing the platform)
   */
  resolveCollidingRects: function (rect1, rect2) {
    var x1 = rect1.x;
    var y1 = rect1.y;
    var w1 = rect1.width;
    var h1 = rect1.height;
    var xf1 = x1 + w1;
    var yf1 = y1 + h1;
    var mult1 = 0.5;
    var x2 = rect2.x;
    var y2 = rect2.y;
    var w2 = rect2.width;
    var h2 = rect2.height;
    var xf2 = x2 + w2;
    var yf2 = y2 + h2;
    var mult2 = 0.5;

    // find shallowest collision overlap, positive value means no overlap
    var dx = 1;
    var dx1 = x1 - xf2;
    var dx2 = x2 - xf1;
    if (dx1 <= 0 && dx2 <= 0) {
      dx = max(dx1, dx2) - COLLISION_OFFSET;
    } else if (dx1 <= 0) {
      dx = dx1 - COLLISION_OFFSET;
    } else if (dx2 <= 0) {
      dx = dx2 - COLLISION_OFFSET;
    }

    var dy = 1;
    var dy1 = y1 - yf2;
    var dy2 = y2 - yf1;
    if (dy1 <= 0 && dy2 <= 0) {
      dy = max(dy1, dy2) - COLLISION_OFFSET;
    } else if (dy1 <= 0) {
      dy = dy1 - COLLISION_OFFSET;
    } else if (dy2 <= 0) {
      dy = dy2 - COLLISION_OFFSET;
    }

    // step out in only one direction, pick the smallest overlap
    if (dx <= 0 && dy <= 0) {
      if (dx > dy) {
        dy = 0;
      } else {
        dx = 0;
      }
    } else if (dx <= 0) {
      dy = 0;
    } else if (dy <= 0) {
      dx = 0;
    } else {
      // there was no collision to begin with
      dx = 0;
      dy = 0;
    }

    // fixed entities cannot be moved by physics
    if (rect1.fixed && rect2.fixed) {
      dx = 0;
      dy = 0;
    } else if (rect1.fixed) {
      mult1 = 0;
      mult2 = 1;
    } else if (rect2.fixed) {
      mult1 = 1;
      mult2 = 0;
    }

    // dx and dy are never positive; so fix signs here based on rect centers
    var cx1 = x1 + w1 / 2;
    var cx2 = x2 + w2 / 2;
    var cy1 = y1 + h1 / 2;
    var cy2 = y2 + h2 / 2;
    var sign = (dx && cx1 > cx2) || (dy && cy1 > cy2) ? -1 : 1;
    rect1.x += mult1 * sign * dx;
    rect1.y += mult1 * sign * dy;
    rect2.x += mult2 * sign * -dx;
    rect2.y += mult2 * sign * -dy;

    // one of these will always be 0, so this is also the delta distance
    return dx + dy;
  },

  /**
   * ~ circleInsideCircle returns true if circ1 is fully contained in circ2
   */
  circleInsideCircle: function (circ1, circ2) {
    var x1 = circ1.x;
    var y1 = circ1.y;
    var r1 = circ1.radius;
    var x2 = circ2.x;
    var y2 = circ2.y;
    var r2 = circ2.radius;
    var dx = x2 - x1;
    var dy = y2 - y1;
    var dist = sqrt(dx * dx + dy * dy);
    return dist <= (r2 - r1);
  },

  /**
   * ~ circleInsideRect returns true if circ is fully contained in rect
   */
  circleInsideRect: function (circ, rect) {
    var cx = circ.x;
    var cy = circ.y;
    var cr = circ.radius;
    var tempHitBounds = {
      x: cx - cr,
      y: cy - cr,
      width: 2 * cr,
      height: 2 * cr
    };
    return this.rectInsideRect(tempHitBounds, rect);
  },

  /**
   * ~ rectInsideCircle returns true if rect is fully contained in circ
   */
  rectInsideCircle: function (rect, circ) {
    var l = rect.x;
    var r = l + rect.width;
    var t = rect.y;
    var b = t + rect.height;
    return circ.contains(l, t)
        && circ.contains(r, t)
        && circ.contains(r, b)
        && circ.contains(l, b);
  },

  /**
   * ~ rectInsideRect returns true if rect1 is fully contained in rect2
   */
  rectInsideRect: function (rect1, rect2) {
    var l = rect1.x;
    var r = l + rect1.width;
    var t = rect1.y;
    var b = t + rect1.height;
    return rect2.contains(l, t)
        && rect2.contains(r, t)
        && rect2.contains(r, b)
        && rect2.contains(l, b);
  }

};
