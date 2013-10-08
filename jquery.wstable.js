/*
 *  
 */
(function($) {
	$.widget("acinus.wstable", {
		options: {
			ws_url: null,
			ws_msg: null,
			size: 10,
			filter_startsWith: false,
			filter_ignoreCase: true,
			sort_list: [[0, 0]],
			pager_msg: '{startRow} to {endRow} of {totalRows} rows'
		},

		_create: function() {
			
			this._establishWS();
		},

		_destroy: function() {
		},

		_init: function() {
			this.page = 0;
			this.options.size = this.options.container.find('.pagesize').val();

			this.options.container.find('.first').click($.proxy(function() {
				if (this.page > 0) {
					this.page = 0;
					this._getWS();
				}
			}, this));
			this.options.container.find('.last').click($.proxy(function() {
				if (this.page < this.total_pages - 1) {
					this.page = this.total_pages - 1;
					this._getWS();
				}
			}, this));
			this.options.container.find('.prev').click($.proxy(function() {
				if (this.page > 0) {
					this.page--;
					this._getWS();
				}
			}, this));
			this.options.container.find('.next').click($.proxy(function() {
				if (this.page < this.total_pages - 1) {
					this.page++;
					this._getWS();
				}
			}, this));
			this.options.container.find('.pagesize').change($.proxy(function(e) {
				this.options.size = e.target.value;
				this._getWS();
			}, this));
			this.element.find('th').click($.proxy(function(e) {
				if (e.ctrlKey) {
					var found = false, i, len = this.options.sort_list.length;
					for (i = 0; i < len; i++) {
						if (this.options.sort_list[i][0] == e.target.cellIndex) {
							found = true;
							this.options.sort_list[i][1] = this.options.sort_list[i][1] == 1 ? 0 : 1;
							break;
						}
					}
					if (!found) {
						this.options.sort_list.push([e.target.cellIndex, 0]);
					}
				} else {
					if (this.options.sort_list[0][0] == e.target.cellIndex) {
						this.options.sort_list = [[e.target.cellIndex, this.options.sort_list[0][1] == 1 ? 0 : 1]];
					} else {
						this.options.sort_list = [[e.target.cellIndex, 0]];
					}
				}
				this._getWS();
			}, this));
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
			var filters = $.makeArray($(this).find('thead').eq(0).children('tr').find('select.tablesorter-filter, input.tablesorter-filter').map(function() {
				return $(this).val() || '';
			}));
			var msg = (this.options.ws_msg) ? this.options.ws_msg.replace(/\{page\}/g, this.page).replace(/\{size\}/g, this.options.size) : '',
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
				var comma = '';
				$.each(filters, function(i,v) {
					if (v != '') {
						col = col + comma + '"' + i + '":{';
						col = col + '"filter":"' + startpct + v + '%"';
						col = col + ',"nocase":' + this.options.filter_ignoreCase + '}';
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
			var result = this.options.ajaxProcessing(data) || [ 0, [], [] ],
				rows = result[1] || [],
				headers = result[2] || [],
				len = rows.length, rowlen, i, j, tds = '';
			for (i = 0; i < len; i++) {
				tds += '<tr class="' + (i % 2 == 1 ? "odd" : "even") + '">';
				rowlen = rows[i].length;
				for (j = 0; j < rowlen; j++) {
					tds += '<td>' + rows[i][j] + '</td>';
				}
				tds += '</tr>';
			}
			this.element.children('tbody').html(tds);

			this.total_rows = result[0];
			this.total_pages = Math.ceil(this.total_rows / this.options.size);
			this.start_row = this.page * this.options.size + 1;
			this.end_row = Math.min((this.page + 1) * this.options.size, this.total_rows);
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
		},

		_notthis: function(data, exception) {
			var i, j, hsh, $f, $sh,
			$t = $(table),
			tc = table.config,
			$b = $(table.tBodies).filter(':not(.' + tc.cssInfoBlock + ')'),
			hl = $t.find('thead th').length, tds = '',
			err = '<tr class="' + tc.selectorRemove + '"><td style="text-align: center;" colspan="' + hl + '">' +
				(exception ? exception.message + ' (' + exception.name + ')' : 'No rows found') + '</td></tr>',
			result = c.ajaxProcessing(data) || [ 0, [] ],
			d = result[1] || [],
			l = d.length,
			th = result[2];
			if ( l > 0 ) {
				for ( i = 0; i < l; i++ ) {
					tds += '<tr>';
					for ( j = 0; j < d[i].length; j++ ) {
						tds += '<td>' + d[i][j] + '</td>';
					}
					tds += '</tr>';
				}
			}
			if ( th && th.length === hl ) {
				hsh = $t.hasClass('hasStickyHeaders');
				$sh = $t.find('.' + ((tc.widgetOptions && tc.widgetOptions.stickyHeaders) || 'tablesorter-stickyheader'));
				$f = $t.find('tfoot tr:first').children();
				$t.find('th.' + tc.cssHeader).each(function(j){
					var $t = $(this), icn;
					if ( $t.find('.' + tc.cssIcon).length ) {
						icn = $t.find('.' + tc.cssIcon).clone(true);
						$t.find('.tablesorter-header-inner').html( th[j] ).append(icn);
						if ( hsh && $sh.length ) {
							icn = $sh.find('th').eq(j).find('.' + tc.cssIcon).clone(true);
							$sh.find('th').eq(j).find('.tablesorter-header-inner').html( th[j] ).append(icn);
						}
					} else {
						$t.find('.tablesorter-header-inner').html( th[j] );
						$sh.find('th').eq(j).find('.tablesorter-header-inner').html( th[j] );
					}
					$f.eq(j).html( th[j] );
				});
			}
			if ( exception ) {
				$t.find('thead').append(err);
			} else {
				$b.html(tds);
			}
			c.temp.remove();
			$t.trigger('update');
			c.totalRows = result[0] || 0;
			c.totalPages = Math.ceil( c.totalRows / c.size );
			updatePageDisplay(table, c);
			fixHeight(table, c);
			if (c.initialized) { $t.trigger('pagerChange', c); }
		}
	});
} (jQuery));
