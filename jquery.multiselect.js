(function($) {
	$.widget("acinus.multiselect", {
		options: {
			data: null,
			id_name: 'ID',
			data_name: 'data',
			filter: false,
			change: function(ids) {alert('change callback missing: ' + ids);},
			select: function(elt) {alert('select callback missing: ' + $(elt).text());}
		},

		_create: function() {
			this.value = this.element.text();
			var tags = "";

			this.sel_list = $('<div class="ms-optlist"></div>').hide();
			if (this.options.filter) {
				var input = $("<input type='search'></input>");
				this.sel_list.append(input);
			}
			$.each(this.options.data, $.proxy(function(i, v) {
				var input = $("<input class='ms-optlistcheck' type='checkbox' data-id='" + v[this.options.id_name] + "' />").uniqueId();
				this.sel_list.append(input);
				this.sel_list.append("<label class='ms-optlistlabel' for='" + input.attr('id') + "'>" + v[this.options.data_name] + "</label>");
			}, this));
			$('body').append(this.sel_list);

			$.each(this.value.split(','), $.proxy(function(i, v) {
				if (v != '') {
					tags += this._buildOption(v);
					this.sel_list.find("input[data-id='" + v + "']").prop('checked', true);
				}
			}, this));
			tags += "<span class='ms-button ms-add'><a href='#'>+</a></span>";
			this.element.html(tags);
		},

		_init: function() {
			this._on({
				'click .ms-add': '_onShowOptions',
				'click .ms-remove': '_onRemoveOption',
				'click .ms-choice': '_onSelect',
				'click input[type=search]': '_onFilter'
			});
		},

		_buildOption: function(id) {
			var tag = $.grep(this.options.data, $.proxy(function(e, i) {
				return e[this.options.id_name] == id;
			}, this));
			return "<span class='ms-button'><a class='ms-remove' href='#'>x</a><a class='ms-choice' href='#' data-id='" + id + "'>" + tag[0][this.options.data_name] + "</a></span>";
		},

		hideOptions: function() {
			if (this.sel_list === undefined) {
				return;
			}
			this.sel_list.hide();
			this.element.find('.ms-add').text('+');
		},

		_showOptions: function() {
			var offs = this.element.offset(),
				height = this.element.height(),
				width = this.element.width(),
				sheight = $(window).height();
			this.sel_list.show();
			this.sel_list.offset({top: (offs.top + height), left: offs.left}).width(width).height(sheight - (offs.top + height + 20));
			this.element.find('.ms-add').text('-');
		},

		_onShowOptions: function() {
			if (this.element.find('.ms-add').text() == '+') {
				$(":data(acinus-multiselect)").multiselect("hideOptions");
				this._showOptions();				
			} else {
				var tagids = [];
				this.sel_list.find("input:checked").each($.proxy(function(i, v) {
					var id = $(v).data('id');
					var tag = this._buildOption(id);
					if (this.element.find("a[data-id='" + id + "']").length == 0) {
						this.element.find('.ms-add').before(tag);
					}
					tagids.push(id);
				}, this));
				this.sel_list.find("input:not(:checked)").each($.proxy(function(i, v) {
					this.element.find("a[data-id='" + $(v).data('id') + "']").parent().remove();
				}, this));
				this.hideOptions();
				this.options.change(tagids);
			}
		},

		_onRemoveOption: function(e) {
			this.sel_list.find("input[data-id='" + $(e.target).siblings('a').data('id') + "']").prop('checked', false);
			$(e.target).parent().remove();
			var tagids = this.sel_list.find("input:checked").map(function(i, e) {
				return $(e).data('id');
			}).get();
			this.options.change(tagids);
		},

		_onSelect: function(e) {
			this.options.select(e.target);
		},

		_onFilter: function(e) {
			// trim list here
			// this will likely cause issue with removing unchecked
			//    unless care is taken to hide and not remove checkboxes
		},
	});
} (jQuery));
