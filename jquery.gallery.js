/*
 *  Attach to container of links
 */
(function($) {
	$.widget("acinus.gallery", {
		options: {
			delay: 4000,
			control_delay: 3000,
			auto_thumbname: true,
			thumb_icon: "img/grid-icon.png",
			play_icon: "img/control-icon.png",
			pause_icon: "img/control-pause-icon.png",
			fullsize_icon: "img/image-resize-icon.png",
			fitsize_icon: "img/image-resize-actual-icon.png",
			fullscreen_icon: "img/arrow-out-icon.png",
			fitscreen_icon: "img/arrow-in-icon.png"
		},

		_create: function() {
			this.container = $('<div id="galleryContainer">');
			this.controls = $('<div id="galleryControls">')
				.append('<div class="ui button1" id="g-thumbs"><img src="' + this.options.thumb_icon + '"></div>')
				.append('<div class="ui button1" id="g-slideshow"><img src="' + this.options.play_icon + '"></div>')
				.append('<div class="ui button1" id="g-fullsize"><img src="' + this.options.fullsize_icon + '"></div>')
				.append('<div class="ui button1" id="g-fullscreen"><img src="' + this.options.fullscreen_icon + '"></div>')
				.append('<div class="ui button1 hidden" id="g-delay"><input type="range" name="delay" min="0" max="10" value="3" step="0.1"></delay>')
				.append('<div class="ui button2" id="g-prev">&lt;</div>')
				.append('<div class="ui button2" id="g-next">&gt;</div>')
				.append('<div class="ui info1" id="g-page"><span></span></div>')
				.append('<div class="ui info1" id="g-caption"><span></span></div>')
				.append('<div class="ui info2" id="g-loader">Loading...</div>')
				.fadeOut(400);
			this.slideholder = $('<div id="gallerySlideHolder">');
			this.thumbholder = $('<div id="galleryThumbHolder" class="hidden button1-shown">');
			this.thumbscroller = $('<div id="galleryThumbScroller">').perfectScrollbar();
			this.thumbs = $('<div id="galleryThumbs">');

			this.slideshow = [];
			$('a').each($.proxy(this._prepareLink, this));

			$('body').append(this.container.append(this.slideholder).append(this.controls).append(this.thumbholder.append(this.thumbscroller.append(this.thumbs))));

			$('body').on('orientationchange', $.proxy(this._updateSize, this));
			$(window).on('resize', $.proxy(this._updateSize, this));
			$(document).on('keydown', $.proxy(this._keyPress, this));

			$("#g-thumbs").click($.proxy(this._onThumbClick, this));
			$("#g-slideshow").click($.proxy(this._onSlideShow, this));
			$("#g-fullsize").click($.proxy(this._onFullSize, this));
			$("#g-fullscreen").click($.proxy(this._onFullScreen, this));

			$("#g-prev").click($.proxy(this._decrSlide, this));
			$("#g-next").click($.proxy(this._incrSlide, this));

			$("#g-slideshow").mouseenter(function() {
				$("#g-delay").fadeIn()
			});
			$("body").mouseleave(function() {
				$("#g-delay").fadeOut()
			});
			$("#g-thumbs").mouseenter(function() {
				$("#g-delay").fadeOut()
			});
			$("#g-page").mouseenter(function() {
				$("#g-delay").fadeOut()
			});
			$("#g-delay").mouseleave(function() {
				$("#g-delay").fadeOut()
			});
			$("#g-delay input").change($.proxy(this._changeDelay, this));

			$(".ui").mouseenter($.proxy(function() {
				this.container.mousemove();
				this.fade_id = "dontfade";
			}, this)).mouseleave($.proxy(function() {
				this.container.mousestop();
				this.fade_id = null;
			}, this));
			this.container.mousemove($.proxy(function() {
				this.controls.fadeIn(400);
				this.thumbholder.removeClass("button1-hidden").addClass("button1-shown");
				if (this.fade_id != "dontfade") {
					clearTimeout(this.fade_id);
					this.fade_id = null;
				}
			}, this)).mousestop($.proxy(function() {
				if (this.fade_id == null) {
					this.fade_id = setTimeout($.proxy(function() {
						this.thumbholder.removeClass("button1-shown").addClass("button1-hidden");
						this.controls.fadeOut(400);
					}, this), this.options.control_delay);
				}
			}, this));

			this.thumbs_visible = false;				
			this.is_loading = false;
			this.is_sliding = false;
			this.slide_id = null;
			this.is_fullsize = false;
			this.pause_thumbs = false;
			this.fade_id = null;
		},

		_destroy: function() {
			$("body").detach(container);
		},

		_init: function() {
			setTimeout($.proxy(this._loadThumbs, this), 0, 0);
			this._updateSize();
			this.curr_slide = this.slideshow[0];
			this._showSlide(this.curr_slide);
		},

		_keyPress: function(e) {
			switch (e.keyCode) {
			case 27:
				this._onFullScreen();
				break;
			case 37:
				this._decrSlide();
				break;
			case 39:
				this._incrSlide();
				break;
			case 70:
				this._onFullSize();
				break;
			case 83:
				this._onSlideShow();
				break;
			case 84:
				this._onThumbClick();
				break;
			}
		},

		_prepareLink: function(i, link) {
			var thumb;
			if (this.options.auto_thumbname) {
				thumb = link.href.replace("image", "thumb") + '&size=80';
			} else {
				thumb = $(link)[0].origin + $(link)[0].pathname + $(link).data('thumb') + '&size=80';
			}
			var slide = {
				image      : link.href,
				title      : link.title,
				thumb_href : thumb
			}
			this.slideshow.push(slide);
			slide.id = this.slideshow.length - 1;
			slide.thumb = $('<img src="" id="thumb-' + slide.id + '" class="thumb">').click($.proxy(function() {
				this._showSlide(slide);
			}, this));
			this.thumbs.append(slide.thumb);
		},

		_changeDelay: function(e) {
			this.options.delay = e.target.value * 1000;
			if (this.is_sliding) {
				window.clearInterval(this.slide_id);
				this.slide_id = window.setInterval($.proxy(this._incrSlide, this), this.options.delay);
			}
		},

		_loadThumbs: function(index) {
			if (!this.pause_thumbs) {
				this.slideshow[index].thumb
					.attr('src', this.slideshow[index].thumb_href)
					.load($.proxy(function() {
						if (this.thumbs_visible) {
							this.thumbscroller.perfectScrollbar('update');
							this.curr_slide.thumb[0].scrollIntoView();
						}
						if (index < this.slideshow.length) {
							setTimeout($.proxy(this._loadThumbs, this), 0, ++index);
						}
					}, this));
			} else if (index < this.slideshow.length) {
				setTimeout($.proxy(this._loadThumbs, this), 0, index);
			}
		},

		_updateSize: function() {
			this.container.height($(window).height());
			this._updateSlideSize();
		},

		_updateSlideSize: function(slide) {
			if (slide === undefined) {
				var slide = this.curr_slide;
			}
			if (slide && slide.img) {
				if (this.is_fullsize) {
					var wh = $(window).height();
					var ww = $(window).width();
					var nh = slide.img.prop("naturalHeight");
					var nw = slide.img.prop("naturalWidth");
					slide.img.css({
						"width"  : "auto",
						"height" : "auto"
					});
					var wid = (ww < nw) ? ww : nw;
					var hgt = (wh < nh) ? wh : nh;
					slide.img.css({
						"margin-left" : "-" + (0.5 * wid) + "px",
						"margin-top"  : "-" + (0.5 * hgt) + "px"
					});
				} else {
					var wh = $(window).height();
					var ww = $(window).width();
					if ((ww / wh) > (slide.img.width() / slide.img.height())) {
						slide.img.css({
							"height" : wh + "px",
							"width"  : "auto"
						});
					} else {
						slide.img.css({
							"height" : "auto",
							"width"  : ww + "px"
						});
					}
					slide.img.css({
						"margin-left" : "-" + (0.5 * slide.img.width()) + "px",
						"margin-top"  : "-" + (0.5 * slide.img.height()) + "px"
					});
				}
			}
		},

		_showSlide: function(nslide) {
			if (!this.is_loading) {
				var oslide = this.curr_slide;
				if (!("img" in nslide)) {
					this._startLoading();
					nslide.img = $('<img class="slide">')
						.css({
							"position"    : "absolute",
							"left"        : "50%",
							"top"         : "50%"
						})
						.hide()
						.load($.proxy(function(){
							this._stopLoading();
							this._changeSlide(this.curr_slide, nslide);
						}, this))
						.error(function(){
							nslide.error = true;
							this._stopLoading();
							$.error("error loading image!");
						})
						.attr("src", nslide.image);
					this.slideholder.append(nslide.img);
				} else {
					this._changeSlide(this.curr_slide, nslide);
				}
			}
		},

		_changeSlide: function(oslide, nslide) {
			if (oslide !== undefined) {
				this._endOfSlide(oslide)
				oslide.img.fadeOut();
				oslide.thumb.removeClass("curr-thumb");
			}
			if (nslide && !nslide.error) {
				nslide.img.fadeIn(this._startOfSlide(nslide));
			} else {
				this._startOfSlide(nslide);
			}
			this.curr_slide = nslide;
			if (this.thumbs_visible) {
				this.thumbscroller.perfectScrollbar('update');
				nslide.thumb[0].scrollIntoView();
			}
			nslide.thumb.addClass("curr-thumb");
			this._updateSlideSize(nslide);
			$("#g-page span").text((nslide.id+1) + " / " + this.slideshow.length);
		},

		_decrSlide: function() {
			var curr_id = this.curr_slide && this.curr_slide.id || 0;
			this._showSlide(this.slideshow[(curr_id - 1 + this.slideshow.length) % this.slideshow.length]);
		},

		_incrSlide: function(dir) {
			var curr_id = this.curr_slide && this.curr_slide.id || 0;
			this._showSlide(this.slideshow[(curr_id + 1) % this.slideshow.length]);
		},

		_startLoading: function() {
			$("#g-loader").show();
			this.is_loading = true;
			this.pause_thumbs = true;
		},

		_stopLoading: function() {
			$("#g-loader").hide();
			this.is_loading = false;
			this.pause_thumbs = false;
		},

		_startOfSlide: function(slide) {
			$("#g-caption span").text(slide.title);
		},

		_endOfSlide: function(slide) {
		},

		_onThumbClick: function() {
			if (this.thumbs_visible) {
				this.thumbholder.addClass("hidden");
			} else {
				this.thumbholder.removeClass("hidden");
				this.thumbscroller.perfectScrollbar('update');
				this.curr_slide.thumb[0].scrollIntoView();
			}
			this.thumbs_visible = !this.thumbs_visible;
		},

		_onSlideShow: function() {
			if (this.is_sliding) {
				window.clearInterval(this.slide_id);
				$("#g-slideshow img").attr("src", this.options.play_icon);
			} else {
				this.slide_id = window.setInterval($.proxy(this._incrSlide, this), this.options.delay);
				$("#g-slideshow img").attr("src", this.options.pause_icon);
			}
			this.is_sliding = !this.is_sliding;
		},

		_onFullSize: function() {
			if (this.is_fullsize) {
				$("#g-fullsize img").attr("src", this.options.fullsize_icon);
			} else {
				$("#g-fullsize img").attr("src", this.options.fitsize_icon);
			}
			this.is_fullsize = !this.is_fullsize;
			this._updateSize();
		},

		_onFullScreen: function() {
			if (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement) {
				if (document.cancelFullScreen) {
					document.cancelFullScreen();
				} else if (document.mozCancelFullScreen) {
					$("html").css("overflow", "auto");
					$(document).scrollTop(this.mozScrollTop);
					document.mozCancelFullScreen();
				} else if (document.webkitCancelFullScreen) {
					document.webkitCancelFullScreen();
					$("html").css("height", "100%");
				}
				$("#g-fullscreen img").attr('src', this.options.fullscreen_icon);
			} else {
				var con = this.container[0];
				if (con.requestFullScreen) {
					con.requestFullScreen();
				} else if (con.mozRequestFullScreen) {
					con.mozRequestFullScreen();
					this.mozScrollTop = $(document).scrollTop();
					$("html").css("overflow", "hidden");
				} else if (con.webkitRequestFullScreen) {
					con.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
				}
			}
			if (this.thumbs_visible) {
				this.thumbscroller.perfectScrollbar('update');
				this.curr_slide.thumb[0].scrollIntoView();
			}
			$("#g-fullscreen img").attr('src', this.options.fitscreen_icon);
		},

		_setOption: function(key, value) {
			this.options[key] = value;
		}
	});
} (jQuery));
