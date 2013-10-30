/*
 *
 */
(function($) {
	$.widget("acinus.wstable", {
		options: {
			parent: this,
			ws_url: null,
			ws_protocol: null,
			ws_msg: null,
			size: 10,
			autosize: 30,
			autostep: 5,
			filter: true,
			filter_startsWith: false,
			filter_ignoreCase: true,
			sort_list: [[0, 0]],
			pager_msg: '{startRow} to {endRow} of {totalRows} rows',
			process_data: function() {alert('process_data must be implemented');}
		},

		_create: function() {
			if (this.options.filter) {
				var filters = $('<tr class="filter"/>');
				this.element.find('thead th').each(function(i, v) {
					$(v).append('<img class="wstable-sort none">');
					filters.append($('<th>').append('<input type="search">'));
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
			this.saveddata = null;
			this.back = false;
			this.options.size = this.options.container.find('.pagesize').val();

			this._on(this.element, {'show': '_onShow'});

			this._on(this.element.find('tr.header th'), {'click': '_onSortTable'});
			this._on(this.element.find('tr.filter input'), {'search': '_onFilter'});

			this._on(this.options.container.find('.first'), {'click': '_onFirstPage'});
			this._on(this.options.container.find('.last'), {'click': '_onLastPage'});
			this._on(this.options.container.find('.prev'), {'click': '_onPrevPage'});
			this._on(this.options.container.find('.next'), {'click': '_onNextPage'});
			this._on(this.options.container.find('.pagesize'), {'change': '_onPageSize'});
			this._on(this.options.container.find('.gotopage'), {'change': '_onGotoPage'});

			this._setSortIcons();
		},

		_establishWS: function() {
			if (this.options.ws_protocol)
				this.wsocket = new WebSocket(this.options.ws_url, this.options.ws_protocol);
			else
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

		_buildRow: function(i, row) {
			var trow = "<tr class='"+(i%2==0?"even":"odd")+"'>",
				j,
				rowlen = row.length;
			for (j = 0; j < rowlen; j++) {
				if (row[j] === undefined) {
					trow += '<td></td>';
				} else {
					var match = row[j].match(/{([\w-]+):([\w\.-]+)}(.*)/);
					if (match !== null)
						trow += '<td ' + match[1] + '="' + match[2] + '">' + match[3] + '</td>';
					else
						trow += '<td>' + row[j] + '</td>';
				}
			}
			trow += "</tr>";

			return trow;
		},

		_renderWS: function(data, exception) {
			if (this.element.is(":hidden")) {
				this.saveddata = data;
				return;
			}
			var result = this.options.process_data(data) || [ 0, [] ],
				rows = result[1] || [],
				tbody = this.element.children('tbody'),
				len = rows.length, rowlen, i, j,
				automode = this.options.container.find('.pagesize').val() == 'Auto';

			if (this.offset > result[0]) {
				this.offset = 0;
				this._getWS();
				return;
			}

			$(tbody).empty();
			if (this.back) {
				for (i = len - 1; i >= 0; i--) {
					var trow = this._buildRow(i, rows[i]);
					if (automode) {
						var tr = $(trow);
						$(tbody).prepend(tr);
						if (this.options.parent.outerHeight(true) + tr.height() >= $(window).height()) {
							while (this.options.parent.outerHeight(true) + tr.height() >= $(window).height()) {
								tr.remove();
								i++;
							}
							this.options.size = len - i;
							this.offset = (this.offset + this.options.autosize) - this.options.size;
							break;
						}
					} else {
						$(tbody).prepend(trow);
					}
				}
			} else {
				for (i = 0; i < len; i++) {
					var trow = this._buildRow(i, rows[i]);
					if (automode) {
						var tr = $(trow);
						$(tbody).append(tr);
						if (this.options.parent.outerHeight(true) + tr.height() >= $(window).height()) {
							while (this.options.parent.outerHeight(true) + tr.height() >= $(window).height()) {
								tr.remove();
								i--;
							}
							this.options.size = i + 1;
							break;
						}
						if (i == len - 1 && this.offset + this.options.size < result[0]) {
							this.options.autosize += this.options.autostep;
							this._getWS();
							return;
						}
					} else {
						$(tbody).append(trow);
					}
				}
			}

			var old_total_rows = this.total_rows,
				old_total_pages = this.total_pages;
			this.total_rows = result[0];
			this.total_pages = Math.floor(this.total_rows / this.options.size);
			if (automode) {
				this.start_row = Math.max(1, this.offset + 1);
				this.end_row = Math.min(this.start_row + this.options.size - 1, this.total_rows);
				this.offset = this.start_row - 1;
			} else {
				this.start_row = Math.max(1, this.page * this.options.size + 1);
				this.end_row = Math.min(this.start_row + (this.options.size - 1), this.total_rows)
				this.offset = this.start_row - 1;
			}

			if (this.start_row <= 1) {
				this.options.container.find('.first').addClass('ui-state-disabled');
				this.options.container.find('.prev').addClass('ui-state-disabled');
			} else {
				this.options.container.find('.first').removeClass('ui-state-disabled');
				this.options.container.find('.prev').removeClass('ui-state-disabled');
			}
			if (this.end_row >= this.total_rows) {
				this.options.container.find('.last').addClass('ui-state-disabled');
				this.options.container.find('.next').addClass('ui-state-disabled');
			} else {
				this.options.container.find('.last').removeClass('ui-state-disabled');
				this.options.container.find('.next').removeClass('ui-state-disabled');
			}

			if (old_total_rows != this.total_rows) {
				this.options.container.find('.pagesize').find('option:contains("All")').val(this.total_rows);
			}

			if (old_total_pages != this.total_pages) {
				this.options.container.find('.gotopage').empty();
				for (i = 0; i < this.total_pages; i++) {
					this.options.container.find('.gotopage').append(new Option(i+1, i, this.page == i));
				}
				this.options.container.find('.gotopage').val(this.page);
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

			this.back = false;
		},

		_setSortIcons: function() {
			this.element.find('.wstable-sort').removeClass('asc desc');
			this.element.find('.wstable-sort').addClass('none');
			$.each(this.options.sort_list, $.proxy(function(i, v) {
				this.element.find('.wstable-sort:eq(' + v[0] + ')').addClass(v[1] == 1 ? 'asc' : 'desc');
			}, this));
		},

		_changePage: function() {
			this._getWS();
			this.options.container.find('.gotopage').val(this.page);
		},

		_onShow: function() {
			if (this.saveddata != null) {
				this._renderWS(this.saveddata);
			}
			this.saveddata = null;
		},

		_onFirstPage: function(e) {
			this.page = 0;
			this.offset = 0;
			this._changePage();
		},

		_onLastPage: function(e) {
			this.page = this.total_pages;
			this.offset = this.page * this.options.size;
			this._changePage();
		},

		_onPrevPage: function(e) {
			this.page--;
			this.offset -= (this.options.container.find('.pagesize').val() == 'Auto') ? this.options.autosize : this.options.size;
			this.back = true;
			this._changePage();
		},

		_onNextPage: function(e) {
			this.page++;
			this.offset += this.options.size;
			this._changePage();
		},

		_onPageSize: function(e) {
			var size = parseInt($(e.target).val());
			if (isNaN(size)) {
				this._changePage();
				return;
			}
			this.total_pages = Math.floor(this.total_rows / this.options.size);
			this.page = Math.floor((Math.min(this.page, this.total_pages) * this.options.size) / size);
			this.options.size = size;
			this.offset = this.page * this.options.size;
			this._changePage();
		},

		_onGotoPage: function(e) {
			this.page = parseInt($(e.target).val());
			this.offset = this.page * this.options.size;
			this._changePage();
		},

		_onSortTable: function(e) {
			var target = $(e.target).find('img'),
				index = e.target.cellIndex;
			if (target.length == 0) {
				target = $(e.target);
				index = e.target.parentElement.cellIndex;
			}
			if (index === undefined) {
				return;
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
		},

		_onFilter: function(e) {
			this._getWS();
		}
	});
} (jQuery));
