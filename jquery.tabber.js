/*
 *
 */
(function($) {
	$.widget("acinus.tabber", {
		options: {
			opentab: null
		},

		_create: function() {
		},

		_init: function() {
			this._on(this.element.find('ul li a'), {'click': '_onTabClick'});
			this._showActiveTab();
		},

		_showActiveTab: function() {
			this.element.children('div').not(this.options.opentab).hide();
			this.element.children(this.options.opentab).show();
			this.element.children(this.options.opentab).children().trigger('show');
		},

		_onTabClick: function(e) {
			this.options.opentab = e.target.hash;
			this._showActiveTab();
		}
	});
} (jQuery));
