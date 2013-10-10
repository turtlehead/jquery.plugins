/*
 *  
 */
(function($) {
	$.widget("acinus.wstable", {
		options: {
			ws_url: null,
			ws_msg: null,
			size: 10,
			autosize: 35,
			filter: true,
			filter_startsWith: false,
			filter_ignoreCase: true,
			sort_list: [[0, 0]],
			pager_msg: '{startRow} to {endRow} of {totalRows} rows'
		},

		_create: function() {
			if (this.options.filter) {
				var filters = $('<tr class="filter"/>');
				this.element.find('thead th').each(function(i, v) {
					$(v).append('<img class="wstable-sort none">');
					var filter = $('<th>').append('<input type="search">');
					filters.append(filter);
				});
				this.element.find('thead').append(filters);
			}
			this.options.container.find('.pagesize').prepend(new Option('Auto', 'Auto')).append(new Option('All', this.options.size)).val('Auto');
			
			this._establishWS();
		},

		_destroy: function() {
		},

		_init: function() {
			this.page = 0;
			this.offset = 0;
			this.dir = 'last';
			this.clear = false;
			this.options.size = this.options.container.find('.pagesize').val();

			this.options.container.find('.first').click($.proxy(function(e) {
				if ($(e.target).hasClass('disabled')) {
					return;
				}
				if (this.page > 0 || this.offset > 0) {
					this.page = 0;
					this.offset = 0;
					this.dir = 'first';
					this.clear = true;
					this._getWS();
				}
			}, this));
			this.options.container.find('.last').click($.proxy(function(e) {
				if ($(e.target).hasClass('disabled')) {
					return;
				}
				if (this.page < this.total_pages - 1 || this.offset < this.total_rows) {
					this.page = this.total_pages;
					this.offset = (this.options.container.find('.pagesize').val() == 'Auto' ? this.total_rows - this.options.autosize : (this.page * this.options.size));
					this.dir = 'last';
					this.clear = true;
					this._getWS();
				}
			}, this));
			this.options.container.find('.prev').click($.proxy(function(e) {
				if ($(e.target).hasClass('disabled')) {
					return;
				}
				if (this.page > 0 || this.offset > 0) {
					this.page--;
					this.offset -= this.options.container.find('.pagesize').val() == 'Auto' ? this.options.autosize : this.options.size;
					this.dir = 'first';
					this.clear = false;
					this._getWS();
				}
			}, this));
			this.options.container.find('.next').click($.proxy(function(e) {
				if ($(e.target).hasClass('disabled')) {
					return;
				}
				if (this.page < this.total_pages - 1 || this.offset < this.total_rows) {
					this.page++;
					this.offset += 1 * this.options.size;
					this.dir = 'last';
					this.clear = false;
					this._getWS();
				}
			}, this));
			this.options.container.find('.pagesize').change($.proxy(function(e) {
				this.options.size = e.target.value;
				this._getWS();
			}, this));
			this.element.find('tr.header th').click($.proxy(this._onSortTable, this));

			this.element.find('tr.filter input').on('keyup', $.proxy(function() {
				this._getWS();
			}, this));
			this.element.find('tr.filter input').on('search', $.proxy(function() {
				this._getWS();
			}, this));

			this._setSortIcons();
		},

		_establishWS: function() {
			this.wsocket = new WebSocket(this.options.ws_url);
			this.wsocket.onmessage = $.proxy(function(msg) {
				this._renderWS(JSON.parse(msg.data));
			}, this);
			this.wsocket.onerror = $.proxy(function(error) {
				this._renderWS(null, error);
			}, this);
			this.wsocket.onopen = $.proxy(function() {
				this._getWS();
			}, this);
			this.wsocket.onclose = $.proxy(function() {
				this._establishWS();
			}, this);
		},

		_getWS: function() {
			var filters = $.makeArray(this.element.find('tr.filter input').map(function() {
				return $(this).val() || '';
			}));
			if (this.options.container.find('.pagesize').val() == 'Auto') {
				if (this.offset < 0) {
					this.options.size = this.options.autosize + this.offset;
				} else {
					this.options.size = this.options.autosize;
				}
			}
			var msg = (this.options.ws_msg) ? this.options.ws_msg.replace(/\{page\}/g, this.page).replace(/\{size\}/g, this.options.size).replace(/\{offset\}/g, this.offset) : '',
				arry = [],
				sl = this.options.sort_list,
				col = msg.match(/\{sortList[\s+]?:[\s+]?(.*?)\}/);
			if (col) {
				col = '"' + col[1] + '":{';
				var comma = '';
				$.each(sl, function(i,v) {
					col = col + comma + '"' + v[0] + '":' + v[1];
					comma = ',';
				});
				col = col + '}';
				msg = msg.replace(/(\{sortList[\s+]?:[\s+]?.*?\})/g, col);
			}

			col = msg.match(/\{filterList[\s+]?:[\s+]?(.*?)\}/);
			if (col) {
				var startpct = (typeof this.options.filter_startsWith != 'undefined' && this.options.filter_startsWith === true) ? "" : "%";
				col = '"' + col[1] + '":{';
				var comma = '',
					ignore_case = this.options.filter_ignoreCase;
				$.each(filters, function(i,v) {
					if (v != '') {
						col = col + comma + '"' + i + '":{';
						col = col + '"filter":"' + startpct + v + '%"';
						col = col + ',"nocase":' + ignore_case + '}';
						comma = ',';
					}
				});
				col = col + '}';
				msg = msg.replace(/(\{filterList[\s+]?:[\s+]?.*?\})/g, col);
			}
			if ( msg !== '' ) {
				if (this.wsocket == null) {
					this._establishWS();
				}
				this.wsocket.send(msg);
			}
		},

		_renderWS: function(data, exception) {
			if (this.clear) {
				this.element.children('tbody').empty();
				this.dir = this.dir == 'first' ? 'last' : 'first';
			}

			var result = this.options.ajaxProcessing(data) || [ 0, [], [] ],
				rows = result[1] || [],
				len = rows.length, i, j,
				automode = this.options.container.find('.pagesize').val() == 'Auto',
				oldrows = this.element.children('tbody').children('tr').size(),
				height = $(window).height(), lastrow;

			if (!automode) {
				this.element.children('tbody').empty();
			}

			for (i = 0; i < len; i++) {
				var trow = "<tr>",
					rowlen = rows[i].length, j;
				for (j = 0; j < rowlen; j++) {
					var match = rows[i][j].match(/{([\w-]+):([\w\.-]+)}(.*)/);
					if (match !== null)
						trow += '<td ' + match[1] + '="' + match[2] + '">' + match[3] + '</td>';
					else
						trow += '<td>' + rows[i][j] + '</td>';
				}
				trow += "</tr>";
				if (this.dir == 'first') {
					var newrow = $(trow);
					if (i == 0) {
						this.element.children('tbody').prepend(newrow);
					} else {
						lastrow.after(newrow);
					}
					lastrow = newrow;
				} else {
					this.element.children('tbody').append(trow);
				}
			}

			if (automode) {
				if ((this.element.height() + this.options.container.height()) >= height) {
					while ((this.element.height() + this.options.container.height()) >= height && oldrows > 0) {
						this.element.children('tbody').children('tr').filter(this.dir == 'first' ? ':last' : ':first').remove();
						oldrows--;
					}
					while ((this.element.height() + this.options.container.height()) >= height) {
						this.element.children('tbody').children('tr').filter(':' + this.dir).remove();
						len--;
					}
				}
				if (this.dir == 'first') {
					this.offset = (this.options.autosize + this.offset) - len;
				}
				this.options.size = len + oldrows;
			}

			this.element.children('tbody').children('tr').removeClass('odd even');
			this.element.children('tbody').children('tr').filter(':even').addClass('even');
			this.element.children('tbody').children('tr').filter(':odd').addClass('odd');

			var old_total_rows = this.total_rows;
			this.total_rows = result[0];
			this.total_pages = Math.floor(this.total_rows / this.options.size);
			if (automode) {
				this.start_row = this.offset + 1;
				this.end_row = Math.min(this.offset + this.options.size, this.total_rows);
			} else {
				this.start_row = this.page * this.options.size + 1;
				this.end_row = Math.min(this.start_row + (this.options.size - 1), this.total_rows)
			}

			if (this.page == 0) {
				this.options.container.find('.first').addClass('disabled');
				this.options.container.find('.prev').addClass('disabled');
			} else {
				this.options.container.find('.first').removeClass('disabled');
				this.options.container.find('.prev').removeClass('disabled');
			}
			if (this.page == this.total_pages || this.total_pages == 1 || this.end_row == this.total_rows) {
				this.options.container.find('.last').addClass('disabled');
				this.options.container.find('.next').addClass('disabled');
			} else {
				this.options.container.find('.last').removeClass('disabled');
				this.options.container.find('.next').removeClass('disabled');
			}
			if (old_total_rows != this.total_rows) {
				this.options.container.find('.pagesize').find('option:contains("All")').val(this.total_rows);
			}

			var pager_text = this.options.pager_msg.replace(/\{(page|filteredRows|filteredPages|totalPages|startRow|endRow|totalRows)\}/gi, $.proxy(function(m){
							return {
								'{page}'	: this.page + 1,
								'{totalPages}'	: this.total_pages,
								'{startRow}'	: this.start_row,
								'{endRow}'	: this.end_row,
								'{totalRows}'	: this.total_rows
							}[m];
						}, this));
			this.options.container.find('.pagedisplay').text(pager_text);
			this.element.trigger("updateComplete");
		},

		_setSortIcons: function() {
			this.element.find('.wstable-sort').removeClass('asc desc');
			this.element.find('.wstable-sort').addClass('none');
			$.each(this.options.sort_list, $.proxy(function(i, v) {
				this.element.find('.wstable-sort:eq(' + v[0] + ')').addClass(v[1] == 1 ? 'asc' : 'desc');
			}, this));
		},

		_onSortTable: function(e) {
			var target = $(e.target).find('img'),
				index = e.target.cellIndex;
			if (target.length == 0) {
				target = $(e.target);
				index = e.target.parentElement.cellIndex;
			}

			if (e.ctrlKey) {
				var found = false, i, len = this.options.sort_list.length;
				for (i = 0; i < len; i++) {
					if (this.options.sort_list[i][0] == index) {
						found = true;
						this.options.sort_list[i][1] = 1 - this.options.sort_list[i][1];
						target.removeClass('asc desc').addClass(this.options.sort_list[i][1] == 1 ? 'asc' : 'desc');
						break;
					}
				}
				if (!found) {
					this.options.sort_list.push([index, 0]);
					target.removeClass('none').addClass('asc');
				}
			} else {
				this.element.find('.wstable-sort').removeClass('asc desc').addClass('none');
				var sortdir = this.options.sort_list[0][0] == index ? 1 - this.options.sort_list[0][1] : 0;
				this.options.sort_list = [[index, sortdir]];
				target.removeClass('none').addClass(sortdir == 1 ? 'asc' : 'desc');
			}
			this._getWS();
		}
	});
} (jQuery));
