
(function($) {
	
	//If the UI scope is not availalable, add it
	$.ui = $.ui || {};
	
	//Add methods that are vital for all mouse interaction stuff (plugin registering)
	$.extend($.ui, {
		plugin: {
			add: function(w, c, o, p) {
				var a = $.ui[w].prototype; if(!a.plugins[c]) a.plugins[c] = [];
				a.plugins[c].push([o,p]);
			},
			call: function(instance, name, arguments) {
				var c = instance.plugins[name]; if(!c) return;
				var o = instance.interaction ? instance.interaction.options : instance.options;
				var e = instance.interaction ? instance.interaction.element : instance.element;
				
				for (var i = 0; i < c.length; i++) {
					if (o[c[i][0]]) c[i][1].apply(e, arguments);
				}	
			}	
		}
	});
	
	$.fn.mouseInteractionDestroy = function() {
		this.each(function() {
			if($.data(this, "ui-mouse")) $.data(this, "ui-mouse").destroy(); 	
		});
	}
	
	$.ui.mouseInteraction = function(el,o) {
	
		if(!o) var o = {};
		this.element = el;
		$.data(this.element, "ui-mouse", this);
		
		this.options = {};
		$.extend(this.options, o);
		$.extend(this.options, {
			handle : o.handle ? ($(o.handle, el)[0] ? $(o.handle, el) : $(el)) : $(el),
			helper: o.helper || 'original',
			preventionDistance: o.preventionDistance || 0,
			dragPrevention: o.dragPrevention ? o.dragPrevention.toLowerCase().split(',') : ['input','textarea','button','select','option'],
			cursorAt: { top: ((o.cursorAt && o.cursorAt.top) ? o.cursorAt.top : 0), left: ((o.cursorAt && o.cursorAt.left) ? o.cursorAt.left : 0), bottom: ((o.cursorAt && o.cursorAt.bottom) ? o.cursorAt.bottom : 0), right: ((o.cursorAt && o.cursorAt.right) ? o.cursorAt.right : 0) },
			cursorAtIgnore: (!o.cursorAt) ? true : false, //Internal property
			appendTo: o.appendTo || 'parent'			
		})
		o = this.options; //Just Lazyness
		
		if(!this.options.nonDestructive && (o.helper == 'clone' || o.helper == 'original')) {

			// Let's save the margins for better reference
			o.margins = {
				top: parseInt($(el).css('marginTop')) || 0,
				left: parseInt($(el).css('marginLeft')) || 0,
				bottom: parseInt($(el).css('marginBottom')) || 0,
				right: parseInt($(el).css('marginRight')) || 0
			};

			// We have to add margins to our cursorAt
			if(o.cursorAt.top != 0) o.cursorAt.top = o.margins.top;
			if(o.cursorAt.left != 0) o.cursorAt.left += o.margins.left;
			if(o.cursorAt.bottom != 0) o.cursorAt.bottom += o.margins.bottom;
			if(o.cursorAt.right != 0) o.cursorAt.right += o.margins.right;
			
			
			if(o.helper == 'original')
				o.wasPositioned = $(el).css('position');
			
		} else {
			o.margins = { top: 0, left: 0, right: 0, bottom: 0 };
		}
		
		var self = this;
		this.mousedownfunc = function(e) { // Bind the mousedown event
			return self.click.apply(self, [e]);	
		}
		o.handle.bind('mousedown', this.mousedownfunc);
		
		//Prevent selection of text when starting the drag in IE
		if($.browser.msie) $(this.element).attr('unselectable', 'on');
		
	}
	
	$.extend($.ui.mouseInteraction.prototype, {
		plugins: {},
		currentTarget: null,
		lastTarget: null,
		timer: null,
		slowMode: false,
		init: false,
		destroy: function() {
			this.options.handle.unbind('mousedown', this.mousedownfunc);
		},
		trigger: function(e) {
			return this.click.apply(this, arguments);
		},
		click: function(e) {

			var o = this.options;
			
			window.focus();
			if(e.which != 1) return true; //only left click starts dragging
		
			// Prevent execution on defined elements
			var targetName = (e.target) ? e.target.nodeName.toLowerCase() : e.srcElement.nodeName.toLowerCase();
			for(var i=0;i<o.dragPrevention.length;i++) {
				if(targetName == o.dragPrevention[i]) return true;
			}

			//Prevent execution on condition
			if(o.startCondition && !o.startCondition.apply(this, [e])) return true;

			var self = this;
			this.mouseup = function(e) { return self.stop.apply(self, [e]); }
			this.mousemove = function(e) { return self.drag.apply(self, [e]); }

			var initFunc = function() { //This function get's called at bottom or after timeout
				$(document).bind('mouseup', self.mouseup);
				$(document).bind('mousemove', self.mousemove);
				self.opos = [e.pageX,e.pageY]; // Get the original mouse position
			}
			
			if(o.preventionTimeout) { //use prevention timeout
				if(this.timer) clearInterval(this.timer);
				this.timer = setTimeout(function() { initFunc(); }, o.preventionTimeout);
				return false;
			}
		
			initFunc();
			return false;
			
		},
		start: function(e) {
			
			var o = this.options; var a = this.element;
			o.co = $(a).offset(); //get the current offset
				
			this.helper = typeof o.helper == 'function' ? $(o.helper.apply(a, [e,this]))[0] : (o.helper == 'clone' ? $(a).clone()[0] : a);

			if(o.appendTo == 'parent') { // Let's see if we have a positioned parent
				var cp = a.parentNode;
				while (cp) {
					if(cp.style && ($(cp).css('position') == 'relative' || $(cp).css('position') == 'absolute')) {
						o.pp = cp;
						o.po = $(cp).offset();
						o.ppOverflow = !!($(o.pp).css('overflow') == 'auto' || $(o.pp).css('overflow') == 'scroll'); //TODO!
						break;	
					}
					cp = cp.parentNode ? cp.parentNode : null;
				};
				
				if(!o.pp) o.po = { top: 0, left: 0 };
			}
			
			this.pos = [this.opos[0],this.opos[1]]; //Use the relative position
			this.rpos = [this.pos[0],this.pos[1]]; //Save the absolute position
			
			if(o.cursorAtIgnore) { // If we want to pick the element where we clicked, we borrow cursorAt and add margins
				o.cursorAt.left = this.pos[0] - o.co.left + o.margins.left;
				o.cursorAt.top = this.pos[1] - o.co.top + o.margins.top;
			}



			if(o.pp) { // If we have a positioned parent, we pick the draggable relative to it
				this.pos[0] -= o.po.left;
				this.pos[1] -= o.po.top;
			}
			
			this.slowMode = (o.cursorAt && (o.cursorAt.top-o.margins.top > 0 || o.cursorAt.bottom-o.margins.bottom > 0) && (o.cursorAt.left-o.margins.left > 0 || o.cursorAt.right-o.margins.right > 0)) ? true : false; //If cursorAt is within the helper, set slowMode to true
			
			if(!o.nonDestructive) $(this.helper).css('position', 'absolute');
			if(o.helper != 'original') $(this.helper).appendTo((o.appendTo == 'parent' ? a.parentNode : o.appendTo)).show();

			// Remap right/bottom properties for cursorAt to left/top
			if(o.cursorAt.right && !o.cursorAt.left) o.cursorAt.left = this.helper.offsetWidth+o.margins.right+o.margins.left - o.cursorAt.right;
			if(o.cursorAt.bottom && !o.cursorAt.top) o.cursorAt.top = this.helper.offsetHeight+o.margins.top+o.margins.bottom - o.cursorAt.bottom;
		
			this.init = true;	

			if(o._start) o._start.apply(a, [this.helper, this.pos, o.cursorAt, this, e]); // Trigger the start callback
			this.helperSize = { width: outerWidth(this.helper), height: outerHeight(this.helper) }; //Set helper size property
			return false;
						
		},
		stop: function(e) {			
			
			var o = this.options; var a = this.element; var self = this;

			$(document).unbind('mouseup', self.mouseup);
			$(document).unbind('mousemove', self.mousemove);

			if(this.init == false) return this.opos = this.pos = null;
			if(o._beforeStop) o._beforeStop.apply(a, [this.helper, this.pos, o.cursorAt, this, e]);

			if(this.helper != a && !o.beQuietAtEnd) { // Remove helper, if it's not the original node
				$(this.helper).remove(); this.helper = null;
			}
			
			if(!o.beQuietAtEnd) {
				//if(o.wasPositioned)	$(a).css('position', o.wasPositioned);
				if(o._stop) o._stop.apply(a, [this.helper, this.pos, o.cursorAt, this, e]);
			}

			this.init = false;
			this.opos = this.pos = null;
			return false;
			
		},
		drag: function(e) {

			if (!this.opos || ($.browser.msie && !e.button)) return this.stop.apply(this, [e]); // check for IE mouseup when moving into the document again
			var o = this.options;
			
			this.pos = [e.pageX,e.pageY]; //relative mouse position
			if(this.rpos && this.rpos[0] == this.pos[0] && this.rpos[1] == this.pos[1]) return false;
			this.rpos = [this.pos[0],this.pos[1]]; //absolute mouse position
			
			if(o.pp) { //If we have a positioned parent, use a relative position
				this.pos[0] -= o.po.left;
				this.pos[1] -= o.po.top;	
			}
			
			if( (Math.abs(this.rpos[0]-this.opos[0]) > o.preventionDistance || Math.abs(this.rpos[1]-this.opos[1]) > o.preventionDistance) && this.init == false) //If position is more than x pixels from original position, start dragging
				this.start.apply(this,[e]);			
			else {
				if(this.init == false) return false;
			}
		
			if(o._drag) o._drag.apply(this.element, [this.helper, this.pos, o.cursorAt, this, e]);
			return false;
			
		}
	});

	var num = function(el, prop) {
		return parseInt($.css(el.jquery?el[0]:el,prop))||0;
	};
	function outerWidth(el) {
		var $el = $(el), ow = $el.width();
		for (var i = 0, props = ['borderLeftWidth', 'paddingLeft', 'paddingRight', 'borderRightWidth']; i < props.length; i++)
			ow += num($el, props[i]);
		return ow;
	}
	function outerHeight(el) {
		var $el = $(el), oh = $el.width();
		for (var i = 0, props = ['borderTopWidth', 'paddingTop', 'paddingBottom', 'borderBottomWidth']; i < props.length; i++)
			oh += num($el, props[i]);
		return oh;
	}

 })($);






(function($) {

	//Make nodes selectable by expression
	$.extend($.expr[':'], { droppable: "(' '+a.className+' ').indexOf(' ui-droppable ')" });

	//Macros for external methods that support chaining
	var methods = "destroy,enable,disable".split(",");
	for(var i=0;i<methods.length;i++) {
		var cur = methods[i], f;
		eval('f = function() { var a = arguments; return this.each(function() { if(jQuery(this).is(".ui-droppable")) jQuery.data(this, "ui-droppable")["'+cur+'"](a); }); }');
		$.fn["droppable"+cur.substr(0,1).toUpperCase()+cur.substr(1)] = f;
	};
	
	//get instance method
	$.fn.droppableInstance = function() {
		if($(this[0]).is(".ui-droppable")) return $.data(this[0], "ui-droppable");
		return false;
	};

	$.fn.droppable = function(o) {
		return this.each(function() {
			new $.ui.droppable(this,o);
		});
	}
	
	$.ui.droppable = function(el,o) {

		if(!o) var o = {};			
		this.element = el; if($.browser.msie) el.droppable = 1;
		$.data(el, "ui-droppable", this);
		
		this.options = {};
		$.extend(this.options, o);
		
		var accept = o.accept;
		$.extend(this.options, {
			accept: o.accept && o.accept.constructor == Function ? o.accept : function(d) {
				return $(d).is(accept);	
			},
			tolerance: o.tolerance || 'intersect'
		});
		o = this.options;
		var self = this;
		
		this.mouseBindings = [function(e) { return self.move.apply(self, [e]); },function(e) { return self.drop.apply(self, [e]); }];
		$(this.element).bind("mousemove", this.mouseBindings[0]);
		$(this.element).bind("mouseup", this.mouseBindings[1]);
		
		$.ui.ddmanager.droppables.push({ item: this, over: 0, out: 1 }); // Add the reference and positions to the manager
		$(this.element).addClass("ui-droppable");
			
	};
	
	$.extend($.ui.droppable.prototype, {
		plugins: {},
		prepareCallbackObj: function(c) {
			return {
				draggable: c,
				droppable: this,
				element: c.element,
				helper: c.helper,
				options: this.options	
			}			
		},
		destroy: function() {
			$(this.element).removeClass("ui-droppable").removeClass("ui-droppable-disabled");
			$(this.element).unbind("mousemove", this.mouseBindings[0]);
			$(this.element).unbind("mouseup", this.mouseBindings[1]);
			
			for(var i=0;i<$.ui.ddmanager.droppables.length;i++) {
				if($.ui.ddmanager.droppables[i].item == this) $.ui.ddmanager.droppables.splice(i,1);
			}
		},
		enable: function() {
			$(this.element).removeClass("ui-droppable-disabled");
			this.disabled = false;
		},
		disable: function() {
			$(this.element).addClass("ui-droppable-disabled");
			this.disabled = true;
		},
		move: function(e) {

			if(!$.ui.ddmanager.current) return;

			var o = this.options;
			var c = $.ui.ddmanager.current;
			
			/* Save current target, if no last target given */
			var findCurrentTarget = function(e) {
				if(e.currentTarget) return e.currentTarget;
				var el = e.srcElement; 
				do { if(el.droppable) return el; el = el.parentNode; } while (el); //This is only used in IE! references in DOM are evil!
			}
			if(c && o.accept(c.element)) c.currentTarget = findCurrentTarget(e);
			
			c.drag.apply(c, [e]);
			e.stopPropagation ? e.stopPropagation() : e.cancelBubble = true;
			
		},
		over: function(e) {

			var c = $.ui.ddmanager.current;
			if (!c || c.element == this.element) return; // Bail if draggable and droppable are same element
			
			var o = this.options;
			if (o.accept(c.element)) {
				$.ui.plugin.call(this, 'over', [e, this.prepareCallbackObj(c)]);
				$(this.element).triggerHandler("dropover", [e, this.prepareCallbackObj(c)], o.over);
			}
			
		},
		out: function(e) {

			var c = $.ui.ddmanager.current;
			if (!c || c.element == this.element) return; // Bail if draggable and droppable are same element

			var o = this.options;
			if (o.accept(c.element)) {
				$.ui.plugin.call(this, 'out', [e, this.prepareCallbackObj(c)]);
				$(this.element).triggerHandler("dropout", [e, this.prepareCallbackObj(c)], o.out);
			}
			
		},
		drop: function(e) {

			var c = $.ui.ddmanager.current;
			if (!c || c.element == this.element) return; // Bail if draggable and droppable are same element
			
			var o = this.options;
			if(o.accept(c.element)) { // Fire callback
				if(o.greedy && !c.slowMode) {
					if(c.currentTarget == this.element) {
						$.ui.plugin.call(this, 'drop', [e, {
							draggable: c,
							droppable: this,
							element: c.element,
							helper: c.helper	
						}]);
						$(this.element).triggerHandler("drop", [e, {
							draggable: c,
							droppable: this,
							element: c.element,
							helper: c.helper	
						}], o.drop);
					}
				} else {
					$.ui.plugin.call(this, 'drop', [e, this.prepareCallbackObj(c)]);
					$(this.element).triggerHandler("drop", [e, this.prepareCallbackObj(c)], o.drop);
				}
			}
			
		},
		activate: function(e) {
			var c = $.ui.ddmanager.current;
			$.ui.plugin.call(this, 'activate', [e, this.prepareCallbackObj(c)]);
			if(c) $(this.element).triggerHandler("dropactivate", [e, this.prepareCallbackObj(c)], this.options.activate);	
		},
		deactivate: function(e) {
			var c = $.ui.ddmanager.current;
			$.ui.plugin.call(this, 'deactivate', [e, this.prepareCallbackObj(c)]);
			if(c) $(this.element).triggerHandler("dropdeactivate", [e, this.prepareCallbackObj(c)], this.options.deactivate);
		}
	});
	
	$.ui.intersect = function(oDrag, oDrop, toleranceMode) {
		if (!oDrop.offset)
			return false;
		var x1 = oDrag.rpos[0] - oDrag.options.cursorAt.left + oDrag.options.margins.left, x2 = x1 + oDrag.helperSize.width,
		    y1 = oDrag.rpos[1] - oDrag.options.cursorAt.top + oDrag.options.margins.top, y2 = y1 + oDrag.helperSize.height;
		var l = oDrop.offset.left, r = l + oDrop.item.element.offsetWidth, 
		    t = oDrop.offset.top,  b = t + oDrop.item.element.offsetHeight;
		switch (toleranceMode) {
			case 'fit':
				return (   l < x1 && x2 < r
					&& t < y1 && y2 < b);
				break;
			case 'intersect':
				return (   l < x1 + (oDrag.helperSize.width  / 2)        // Right Half
					&&     x2 - (oDrag.helperSize.width  / 2) < r    // Left Half
					&& t < y1 + (oDrag.helperSize.height / 2)        // Bottom Half
					&&     y2 - (oDrag.helperSize.height / 2) < b ); // Top Half
				break;
			case 'pointer':
				return (   l < oDrag.rpos[0] && oDrag.rpos[0] < r
					&& t < oDrag.rpos[1] && oDrag.rpos[1] < b);
				break;
			case 'touch':
				return (   (l < x1 && x1 < r && t < y1 && y1 < b)    // Top-Left Corner
					|| (l < x1 && x1 < r && t < y2 && y2 < b)    // Bottom-Left Corner
					|| (l < x2 && x2 < r && t < y1 && y1 < b)    // Top-Right Corner
					|| (l < x2 && x2 < r && t < y2 && y2 < b) ); // Bottom-Right Corner
				break;
			default:
				return false;
				break;
		}
	}
	
})($);








(function($) {

	//Make nodes selectable by expression
	$.extend($.expr[':'], { draggable: "(' '+a.className+' ').indexOf(' ui-draggable ')" });


	//Macros for external methods that support chaining
	var methods = "destroy,enable,disable".split(",");
	for(var i=0;i<methods.length;i++) {
		var cur = methods[i], f;
		eval('f = function() { var a = arguments; return this.each(function() { if(jQuery(this).is(".ui-draggable")) jQuery.data(this, "ui-draggable")["'+cur+'"](a); }); }');
		$.fn["draggable"+cur.substr(0,1).toUpperCase()+cur.substr(1)] = f;
	};
	
	//get instance method
	$.fn.draggableInstance = function() {
		if($(this[0]).is(".ui-draggable")) return $.data(this[0], "ui-draggable");
		return false;
	};

	$.fn.draggable = function(o) {
		return this.each(function() {
			new $.ui.draggable(this, o);
		});
	}
	
	$.ui.ddmanager = {
		current: null,
		droppables: [],
		prepareOffsets: function(t, e) {
			var dropTop = $.ui.ddmanager.dropTop = [];
			var dropLeft = $.ui.ddmanager.dropLeft;
			var m = $.ui.ddmanager.droppables;
			for (var i = 0; i < m.length; i++) {
				if(m[i].item.disabled) continue;
				m[i].offset = $(m[i].item.element).offset();
				if (t && m[i].item.options.accept(t.element)) //Activate the droppable if used directly from draggables
					m[i].item.activate.call(m[i].item, e);
			}
		},
		fire: function(oDrag, e) {
			
			var oDrops = $.ui.ddmanager.droppables;
			var oOvers = $.grep(oDrops, function(oDrop) {
				
				if (!oDrop.item.disabled && $.ui.intersect(oDrag, oDrop, oDrop.item.options.tolerance))
					oDrop.item.drop.call(oDrop.item, e);
			});
			$.each(oDrops, function(i, oDrop) {
				if (!oDrop.item.disabled && oDrop.item.options.accept(oDrag.element)) {
					oDrop.out = 1; oDrop.over = 0;
					oDrop.item.deactivate.call(oDrop.item, e);
				}
			});
		},
		update: function(oDrag, e) {
			
			if(oDrag.options.refreshPositions) $.ui.ddmanager.prepareOffsets();
			
			var oDrops = $.ui.ddmanager.droppables;
			var oOvers = $.grep(oDrops, function(oDrop) {
				if(oDrop.item.disabled) return false; 
				var isOver = $.ui.intersect(oDrag, oDrop, oDrop.item.options.tolerance)
				if (!isOver && oDrop.over == 1) {
					oDrop.out = 1; oDrop.over = 0;
					oDrop.item.out.call(oDrop.item, e);
				}
				return isOver;
			});
			$.each(oOvers, function(i, oOver) {
				if (oOver.over == 0) {
					oOver.out = 0; oOver.over = 1;
					oOver.item.over.call(oOver.item, e);
				}
			});
		}
	};
	
	$.ui.draggable = function(el, o) {
		
		var options = {};
		$.extend(options, o);
		var self = this;
		$.extend(options, {
			_start: function(h, p, c, t, e) {
				self.start.apply(t, [self, e]); // Trigger the start callback				
			},
			_beforeStop: function(h, p, c, t, e) {
				self.stop.apply(t, [self, e]); // Trigger the start callback
			},
			_drag: function(h, p, c, t, e) {
				self.drag.apply(t, [self, e]); // Trigger the start callback
			},
			startCondition: function(e) {
				return !(e.target.className.indexOf("ui-resizable-handle") != -1 || self.disabled);	
			}			
		});
		
		$.data(el, "ui-draggable", this);
		
		if (options.ghosting == true) options.helper = 'clone'; //legacy option check
		$(el).addClass("ui-draggable");
		this.interaction = new $.ui.mouseInteraction(el, options);
		
	}
	
	$.extend($.ui.draggable.prototype, {
		plugins: {},
		currentTarget: null,
		lastTarget: null,
		destroy: function() {
			$(this.interaction.element).removeClass("ui-draggable").removeClass("ui-draggable-disabled");
			this.interaction.destroy();
		},
		enable: function() {
			$(this.interaction.element).removeClass("ui-draggable-disabled");
			this.disabled = false;
		},
		disable: function() {
			$(this.interaction.element).addClass("ui-draggable-disabled");
			this.disabled = true;
		},
		prepareCallbackObj: function(self) {
			return {
				helper: self.helper,
				position: { left: self.pos[0], top: self.pos[1] },
				offset: self.options.cursorAt,
				draggable: self,
				options: self.options	
			}			
		},
		start: function(that, e) {
			
			var o = this.options;
			$.ui.ddmanager.current = this;
			
			$.ui.plugin.call(that, 'start', [e, that.prepareCallbackObj(this)]);
			$(this.element).triggerHandler("dragstart", [e, that.prepareCallbackObj(this)], o.start);
			
			if (this.slowMode && $.ui.droppable && !o.dropBehaviour)
				$.ui.ddmanager.prepareOffsets(this, e);
			
			return false;
						
		},
		stop: function(that, e) {			
			
			var o = this.options;
			
			$.ui.plugin.call(that, 'stop', [e, that.prepareCallbackObj(this)]);
			$(this.element).triggerHandler("dragstop", [e, that.prepareCallbackObj(this)], o.stop);

			if (this.slowMode && $.ui.droppable && !o.dropBehaviour) //If cursorAt is within the helper, we must use our drop manager
				$.ui.ddmanager.fire(this, e);

			$.ui.ddmanager.current = null;
			$.ui.ddmanager.last = this;

			return false;
			
		},
		drag: function(that, e) {

			var o = this.options;

			$.ui.ddmanager.update(this, e);

			this.pos = [this.pos[0]-o.cursorAt.left, this.pos[1]-o.cursorAt.top];

			$.ui.plugin.call(that, 'drag', [e, that.prepareCallbackObj(this)]);
			var nv = $(this.element).triggerHandler("drag", [e, that.prepareCallbackObj(this)], o.drag);

			var nl = (nv && nv.left) ? nv.left : this.pos[0];
			var nt = (nv && nv.top) ? nv.top : this.pos[1];
			
			$(this.helper).css('left', nl+'px').css('top', nt+'px'); // Stick the helper to the cursor
			return false;
			
		}
	});

})($);





/* Copyright (c) 2007 Paul Bakaus (paul.bakaus@googlemail.com) and Brandon Aaron (brandon.aaron@gmail.com || http://brandonaaron.net)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * $LastChangedDate: 2007-09-11 02:38:31 +0000 (Tue, 11 Sep 2007) $
 * $Rev: 3238 $
 *
 * Version: @VERSION
 *
 * Requires: jQuery 1.2+
 */

(function($){
	
$.dimensions = {
	version: '@VERSION'
};

// Create innerHeight, innerWidth, outerHeight and outerWidth methods
$.each( [ 'Height', 'Width' ], function(i, name){
	
	// innerHeight and innerWidth
	$.fn[ 'inner' + name ] = function() {
		if (!this[0]) return;
		
		var torl = name == 'Height' ? 'Top'    : 'Left',  // top or left
		    borr = name == 'Height' ? 'Bottom' : 'Right'; // bottom or right
		
		return this[ name.toLowerCase() ]() + num(this, 'padding' + torl) + num(this, 'padding' + borr);
	};
	
	// outerHeight and outerWidth
	$.fn[ 'outer' + name ] = function(options) {
		if (!this[0]) return;
		
		var torl = name == 'Height' ? 'Top'    : 'Left',  // top or left
		    borr = name == 'Height' ? 'Bottom' : 'Right'; // bottom or right
		
		options = $.extend({ margin: false }, options || {});
		
		return this[ name.toLowerCase() ]()
				+ num(this, 'border' + torl + 'Width') + num(this, 'border' + borr + 'Width')
				+ num(this, 'padding' + torl) + num(this, 'padding' + borr)
				+ (options.margin ? (num(this, 'margin' + torl) + num(this, 'margin' + borr)) : 0);
	};
});

// Create scrollLeft and scrollTop methods
$.each( ['Left', 'Top'], function(i, name) {
	$.fn[ 'scroll' + name ] = function(val) {
		if (!this[0]) return;
		
		return val != undefined ?
		
			// Set the scroll offset
			this.each(function() {
				this == window || this == document ?
					window.scrollTo( 
						name == 'Left' ? val : $(window)[ 'scrollLeft' ](),
						name == 'Top'  ? val : $(window)[ 'scrollTop'  ]()
					) :
					this[ 'scroll' + name ] = val;
			}) :
			
			// Return the scroll offset
			this[0] == window || this[0] == document ?
				self[ (name == 'Left' ? 'pageXOffset' : 'pageYOffset') ] ||
					$.boxModel && document.documentElement[ 'scroll' + name ] ||
					document.body[ 'scroll' + name ] :
				this[0][ 'scroll' + name ];
	};
});

$.fn.extend({
	position: function() {
		var left = 0, top = 0, elem = this[0], offset, parentOffset, offsetParent, results;
		
		if (elem) {
			// Get *real* offsetParent
			offsetParent = this.offsetParent();
			
			// Get correct offsets
			offset       = this.offset();
			parentOffset = offsetParent.offset();
			
			// Subtract element margins
			offset.top  -= num(elem, 'marginTop');
			offset.left -= num(elem, 'marginLeft');
			
			// Add offsetParent borders
			parentOffset.top  += num(offsetParent, 'borderTopWidth');
			parentOffset.left += num(offsetParent, 'borderLeftWidth');
			
			// Subtract the two offsets
			results = {
				top:  offset.top  - parentOffset.top,
				left: offset.left - parentOffset.left
			};
		}
		
		return results;
	},
	
	offsetParent: function() {
		var offsetParent = this[0].offsetParent;
		while ( offsetParent && (!/^body|html$/i.test(offsetParent.tagName) && $.css(offsetParent, 'position') == 'static') )
			offsetParent = offsetParent.offsetParent;
		return $(offsetParent);
	}
});

var num = function(el, prop) {
	return parseInt($.css(el.jquery?el[0]:el,prop))||0;
};

})(jQuery);


if (window.Node && Node.prototype && !Node.prototype.contains) {
	Node.prototype.contains = function (arg) {
		return !!(this.compareDocumentPosition(arg) & 16)
	}
}

(function($) {

	//Make nodes selectable by expression
	$.extend($.expr[':'], { sortable: "(' '+a.className+' ').indexOf(' ui-sortable ')" });

	$.fn.sortable = function(o) {
		return this.each(function() {
			new $.ui.sortable(this,o);	
		});
	}
	
	//Macros for external methods that support chaining
	var methods = "destroy,enable,disable,refresh".split(",");
	for(var i=0;i<methods.length;i++) {
		var cur = methods[i], f;
		eval('f = function() { var a = arguments; return this.each(function() { if(jQuery(this).is(".ui-sortable")) jQuery.data(this, "ui-sortable")["'+cur+'"](a); }); }');
		$.fn["sortable"+cur.substr(0,1).toUpperCase()+cur.substr(1)] = f;
	};
	
	//get instance method
	$.fn.sortableInstance = function() {
		if($(this[0]).is(".ui-sortable")) return $.data(this[0], "ui-sortable");
		return false;
	};
	
	$.ui.sortable = function(el,o) {
	
		this.element = el;
		this.set = [];
		var options = {};
		var self = this;
		$.data(this.element, "ui-sortable", this);
		$(el).addClass("ui-sortable");
		
		$.extend(options, o);
		$.extend(options, {
			items: options.items || '> li',
			smooth: options.smooth != undefined ? options.smooth : true,
			helper: 'clone',
			containment: options.containment ? (options.containment == 'sortable' ? el : options.containment) : null,
			zIndex: options.zIndex || 1000,
			_start: function(h,p,c,t,e) {
				self.start.apply(t, [self, e]); // Trigger the onStart callback				
			},
			_beforeStop: function(h,p,c,t,e) {
				self.stop.apply(t, [self, e]); // Trigger the onStart callback
			},
			_drag: function(h,p,c,t,e) {
				self.drag.apply(t, [self, e]); // Trigger the onStart callback
			},
			startCondition: function() {
				return !self.disabled;	
			}			
		});
		
		//Get the items
		var items = $(options.items, el);
		
		//Let's determine the floating mode
		options.floating = /left|right/.test(items.css('float'));
		
		//Let's determine the parent's offset
		if($(el).css('position') == 'static') $(el).css('position', 'relative');
		options.offset = $(el).offset({ border: false });

		items.each(function() {
			new $.ui.mouseInteraction(this,options);
		});
		
		//Add current items to the set
		items.each(function() {
			self.set.push([this,null]);
		});
		
		this.options = options;
	}
	
	$.extend($.ui.sortable.prototype, {
		plugins: {},
		currentTarget: null,
		lastTarget: null,
		prepareCallbackObj: function(self, that) {
			if (!self.pos) self.pos = [0, 0]; 
			return {
				helper: self.helper,
				position: { left: self.pos[0], top: self.pos[1] },
				offset: self.options.cursorAt,
				draggable: self,
				current: that,
				options: self.options
			}			
		},
		refresh: function() {

			//Get the items
			var self = this;
			var items = $(this.options.items, this.element);

			var unique = [];
			items.each(function() {
				old = false;
				for(var i=0;i<self.set.length;i++) { if(self.set[i][0] == this) old = true;	}
				if(!old) unique.push(this);
			});
			
			for(var i=0;i<unique.length;i++) {
				new $.ui.mouseInteraction(unique[i],self.options);
			}
			
			//Add current items to the set
			this.set = [];
			items.each(function() {
				self.set.push([this,null]);
			});
			
		},
		destroy: function() {
			$(this.element).removeClass("ui-sortable").removeClass("ui-sortable-disabled");
			$(this.options.items, this.element).mouseInteractionDestroy();
			
		},
		enable: function() {
			$(this.element).removeClass("ui-sortable-disabled");
			this.disabled = false;
		},
		disable: function() {
			$(this.element).addClass("ui-sortable-disabled");
			this.disabled = true;
		},
		start: function(that, e) {
			
			var o = this.options;

			if(o.hoverClass) {
				that.helper = $('<div class="'+o.hoverClass+'"></div>').appendTo('body').css({
					height: this.element.offsetHeight+'px',
					width: this.element.offsetWidth+'px',
					position: 'absolute'	
				});
			}
			
			if(o.zIndex) {
				if($(this.helper).css("zIndex")) o.ozIndex = $(this.helper).css("zIndex");
				$(this.helper).css('zIndex', o.zIndex);
			}
			
			that.firstSibling = $(this.element).prev()[0];
				
			$(this.element).triggerHandler("sortstart", [e, that.prepareCallbackObj(this)], o.start);
			$(this.element).css({'opacity':'0.3','border':'1px dashed #000'});
			
			return false;
						
		},
		stop: function(that, e) {			
			
			var o = this.options;
			var self = this;
			

			if(o.smooth) {
				var os = $(this.element).offset();
				o.beQuietAtEnd = true;
				$(this.helper).animate({ left: os.left - o.po.left, top: os.top - o.po.top }, 100, stopIt);
			} else {
				stopIt();
			}
				
			function stopIt() {

				$(self.element).css({'opacity':'1','border':'1px solid gray'});
				if(that.helper) that.helper.remove();
				if(self.helper != self.element) $(self.helper).remove(); 

				if(o.ozIndex)
					$(self.helper).css('zIndex', o.ozIndex);
					
					
				//Let's see if the position in DOM has changed
				if($(self.element).prev()[0] != that.firstSibling) {
					//$(self.element).triggerHandler("sortupdate", [e, that.prepareCallbackObj(self, that)], o.update);
				}
				//setTimeout(function () { alert(); }, 2000);
				
				//if placed on right position than remove the error
				if($(self.element).attr('id')==$(self.element).parent().attr('id'))
				{
					$(self.element).find('.correct').remove();
					$(self.element).css('background','#E7E7E7');
				}
				
				//Check sequance
				if($('.unmovable').length==0)
					$('#seq').trigger('click');
				
				//clear the results
				if($('#0').length==0 || $('#r').length!=0) $('#result').trigger('click');
				
				//Remove the mixed list when test done
				if(!$('#0').find('li').length>0)
				{
					$('#result').trigger('click');
					//$('#0').parent().remove();
					//$('#shu').replaceWith("<a href='index.htm'>Start again</a>");
				}
			}
			

			return false;
			
		},
		drag: function(that, e) {

			var o = this.options;

			this.pos = [this.pos[0]-(o.cursorAt.left ? o.cursorAt.left : 0), this.pos[1]-(o.cursorAt.top ? o.cursorAt.top : 0)];
			var nv =  $(this.element).triggerHandler("sort", [e, that.prepareCallbackObj(this)], o.sort);
			var nl = (nv && nv.left) ? nv.left :  this.pos[0];
			var nt = (nv && nv.top) ? nv.top :  this.pos[1];
			

			var m = that.set;
			var p = this.pos[1];
			
			for(var i=0;i<m.length;i++) {
				
				var ci = $(m[i][0]); var cio = m[i][0];
				if(this.element.contains(cio)) continue;
				var cO = ci.offset(); //TODO: Caching
				cO = { top: cO.top, left: cO.left };
				
				var mb = function(e) { if(true || o.lba != cio) { ci.before(e); o.lba = cio; } }
				var ma = function(e) { if(true || o.laa != cio) { ci.after(e); o.laa = cio; } }
				
				if(o.floating) {
					
					var overlap = ((cO.left - (this.pos[0]+(this.options.po ? this.options.po.left : 0)))/this.helper.offsetWidth);

					if(!(cO.top < this.pos[1]+(this.options.po ? this.options.po.top : 0) + cio.offsetHeight/2 && cO.top + cio.offsetHeight > this.pos[1]+(this.options.po ? this.options.po.top : 0) + cio.offsetHeight/2)) continue;								
					
				} else {

					var overlap = ((cO.top - (this.pos[1]+(this.options.po ? this.options.po.top : 0)))/this.helper.offsetHeight);

					if(!(cO.left < this.pos[0]+(this.options.po ? this.options.po.left : 0) + cio.offsetWidth/2 && cO.left + cio.offsetWidth > this.pos[0]+(this.options.po ? this.options.po.left : 0) + cio.offsetWidth/2)) continue;

				}
				
				if(overlap >= 0 && overlap <= 0.5) { //Overlapping at top
					ci.prev().length ? ma(this.element) : mb(this.element);
				}

				if(overlap < 0 && overlap > -0.5) { //Overlapping at bottom
					ci.next()[0] == this.element ? mb(this.element) : ma(this.element);
				}

			}
			
			//Let's see if the position in DOM has changed
			if($(this.element).prev()[0] != that.lastSibling) {
				$(this.element).triggerHandler("sortchange", [e, that.prepareCallbackObj(this, that)], this.options.change);
				that.lastSibling = $(this.element).prev()[0];	
			}

			if(that.helper) { //reposition helper if available
				var to = $(this.element).offset();
				that.helper.css({
					top: to.top+'px',
					left: to.left+'px'	
				});
			}	
			
			$(this.helper).css('left', nl+'px').css('top', nt+'px'); // Stick the helper to the cursor
			return false;
			
		}
	});

 })($);



jQuery.fn.swap = function(b){
   b = jQuery(b)[0];
   var a = this[0];
   var t = a.parentNode.insertBefore(document.createTextNode(''), a);
   b.parentNode.insertBefore(a, b);
   t.parentNode.insertBefore(b, t);
   t.parentNode.removeChild(t);
   return this;
};



(function($){$.fn.shuffle=function(){return this.each(function(){var items=$(this).children();return(items.length)?$(this).html($.shuffle(items)):this;});}
$.shuffle=function(arr){for(var j,x,i=arr.length;i;j=parseInt(Math.random()*i),x=arr[--i],arr[i]=arr[j],arr[j]=x);return arr;}})(jQuery);
