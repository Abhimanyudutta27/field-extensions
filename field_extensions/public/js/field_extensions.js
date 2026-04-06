/**
 * Field Extensions
 * Registers custom field controls and formatters for:
 *   - Date Range (overrides built-in filter-only control)
 *   - Progress
 *   - Table Editor
 */

// ============================================================
//  DATE RANGE CONTROL (override)
// ============================================================
frappe.ui.form.ControlDateRange = class ControlDateRange extends frappe.ui.form.ControlData {
	make_input() {
		super.make_input();
		this.set_date_options();
		this.set_datepicker();
		this.refresh();
	}
	set_date_options() {
		var me = this;
		let lang = frappe.boot?.user?.language;
		this.datepicker_options = {
			language: $.fn.datepicker.language[lang] ? lang : "en",
			range: true,
			autoClose: true,
			toggleSelected: false,
			firstDay: frappe.datetime.get_first_day_of_the_week_index(),
		};
		this.datepicker_options.dateFormat = frappe.boot.sysdefaults.date_format || "yyyy-mm-dd";
		this.datepicker_options.onSelect = function () {
			me.$input.trigger("change");
		};
	}
	set_datepicker() {
		this.$input.datepicker(this.datepicker_options);
		this.datepicker = this.$input.data("datepicker");
	}
	set_input(value, value2) {
		this.last_value = this.value;
		if (value && value2) {
			this.value = [value, value2];
		} else if (typeof value === "string" && value.includes(",")) {
			var parts = value.split(",");
			this.value = [parts[0].trim(), parts[1].trim()];
		} else {
			this.value = value;
		}
		if (this.value && Array.isArray(this.value)) {
			let formatted = this.format_for_input(this.value[0], this.value[1]);
			this.$input && this.$input.val(formatted);
		} else {
			this.$input && this.$input.val("");
		}
		this.set_disp_area(value || "");
		this.set_mandatory && this.set_mandatory(value);
	}
	get_value() {
		if (Array.isArray(this.value)) {
			return this.value.join(",");
		}
		return this.value;
	}
	parse(value) {
		if (value == undefined || typeof value == "object") return value;
		const to = __("{0} to {1}").replace("{0}", "").replace("{1}", "");
		value = value && value.replace(to, ",");
		if (value && value.includes(",")) {
			var vals = value.split(",");
			var from_date = moment(frappe.datetime.user_to_obj(vals[0])).format("YYYY-MM-DD");
			var to_date = moment(frappe.datetime.user_to_obj(vals[vals.length - 1])).format("YYYY-MM-DD");
			return [from_date, to_date];
		}
	}
	format_for_input(value1, value2) {
		if (value1 && value2) {
			value1 = frappe.datetime.str_to_user(value1, false, true);
			value2 = frappe.datetime.str_to_user(value2, false, true);
			return __("{0} to {1}", [value1, value2]);
		}
		return "";
	}
};


// ============================================================
//  PROGRESS CONTROL
// ============================================================
frappe.ui.form.ControlProgress = class ControlProgress extends frappe.ui.form.ControlFloat {
	make_input() {
		super.make_input();
		this.$input.attr("min", 0).attr("max", 100).attr("step", "0.01");
		this.progress_area = $(`
			<div class="progress cfp-progress" style="margin-top: 8px; height: 12px; border-radius: 6px;">
				<div class="progress-bar" role="progressbar"
					style="width: 0%; transition: width 0.3s ease; border-radius: 6px;"></div>
			</div>
		`);
		$(this.input_area).append(this.progress_area);
	}
	set_formatted_input(value) {
		super.set_formatted_input(value);
		this.update_progress_bar(value);
	}
	update_progress_bar(value) {
		value = Math.min(100, Math.max(0, parseFloat(value) || 0));
		if (!this.progress_area) return;
		let color;
		if (value < 30) color = "var(--red-500)";
		else if (value < 70) color = "var(--yellow-500)";
		else color = "var(--green-500)";
		this.progress_area.find(".progress-bar")
			.css("width", value + "%")
			.css("background-color", color);
	}
	validate(value) {
		value = parseFloat(value);
		if (isNaN(value)) return 0;
		return Math.min(100, Math.max(0, value));
	}
	get_precision() {
		return this.df.precision || 2;
	}
};


// ============================================================
//  TABLE EDITOR CONTROL
// ============================================================
frappe.ui.form.ControlTableEditor = class ControlTableEditor extends frappe.ui.form.ControlData {
	static horizontal = false;
	static trigger_change_on_input_event = false;

	make_input() {
		this.has_input = true;
		this.selected_row = null;
		this.selected_col = null;
		this.col_widths = null;
		this.sticky_cols = new Set();

		this.$input = $('<input type="hidden">');
		$(this.input_area).append(this.$input);
		this.make_table_editor();
	}

	make_table_editor() {
		this.wrapper_el = $(`<div class="table-editor-wrapper"></div>`);
		$(this.input_area).append(this.wrapper_el);

		this.toolbar = $(`
			<div class="te-toolbar">
				<div class="te-toolbar-group">
					<button class="btn btn-xs btn-default te-btn btn-add-row" type="button" title="${__("Add row")}">
						<svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
						${__("Row")}
					</button>
					<button class="btn btn-xs btn-default te-btn btn-add-col" type="button" title="${__("Add column")}">
						<svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
						${__("Column")}
					</button>
				</div>
				<div class="te-toolbar-group">
					<button class="btn btn-xs btn-danger-light te-btn btn-del-row" type="button" title="${__("Click a row number first")}">
						<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6h8" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
						${__("Row")}
					</button>
					<button class="btn btn-xs btn-danger-light te-btn btn-del-col" type="button" title="${__("Click a column header first")}">
						<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6h8" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
						${__("Column")}
					</button>
				</div>
				<div class="te-toolbar-group te-toolbar-right">
					<button class="btn btn-xs btn-default te-btn btn-clear-all" type="button">${__("Clear All")}</button>
				</div>
			</div>
		`);

		this.table_area = $(`<div class="te-table-scroll"></div>`);
		this.status_bar = $(`<div class="te-status-bar">
			<span class="te-status-text"></span>
			<span class="te-hint-text">${__("Click row # to select row, click header to select column")}</span>
		</div>`);

		this.wrapper_el.append(this.toolbar);
		this.wrapper_el.append(this.table_area);
		this.wrapper_el.append(this.status_bar);

		this.toolbar.find(".btn-add-row").on("click", () => this.add_row());
		this.toolbar.find(".btn-add-col").on("click", () => this.add_column());
		this.toolbar.find(".btn-del-row").on("click", () => this.delete_selected_row());
		this.toolbar.find(".btn-del-col").on("click", () => this.delete_selected_col());
		this.toolbar.find(".btn-clear-all").on("click", () => this.clear_all());

		this.render_empty_state();
		this.update_delete_buttons();
	}

	get_default_data() {
		return { columns: [__("Column 1"), __("Column 2"), __("Column 3")], data: [["","",""]], col_widths: [150,150,150], sticky_cols: [] };
	}

	// ---- empty state ----
	render_empty_state() {
		this.table_area.html(`
			<div class="te-empty-state">
				<div class="te-empty-icon">
					<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
						<rect x="6" y="10" width="36" height="28" rx="3" stroke="var(--gray-400)" stroke-width="2" fill="none"/>
						<line x1="6" y1="20" x2="42" y2="20" stroke="var(--gray-400)" stroke-width="2"/>
						<line x1="20" y1="10" x2="20" y2="38" stroke="var(--gray-400)" stroke-width="2"/>
						<line x1="34" y1="10" x2="34" y2="38" stroke="var(--gray-400)" stroke-width="2"/>
					</svg>
				</div>
				<div class="te-empty-title">${__("No data yet")}</div>
				<div class="te-empty-subtitle">${__("Add rows and columns to start building your table")}</div>
				<div class="te-empty-actions">
					<button class="btn btn-sm btn-primary-light te-btn te-empty-start" type="button">
						<svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
						${__("Start with a 3×3 table")}
					</button>
				</div>
			</div>
		`);
		this.table_area.find(".te-empty-start").on("click", () => {
			this.render_table(this.get_default_data());
			this.sync_and_rerender();
		});
		this.update_delete_buttons();
	}

	// ---- render table ----
	render_table(td) {
		if (!td || !td.columns) td = this.get_default_data();
		let nc = td.columns.length;
		let w = td.col_widths || []; while (w.length < nc) w.push(150);
		this.col_widths = w.slice(0, nc);
		if (td.sticky_cols) this.sticky_cols = new Set(td.sticky_cols);
		let rn = 40, so = [], sl = {};
		for (let i = 0; i < nc; i++) if (this.sticky_cols.has(i)) so.push(i);
		let rl = rn; for (let i of so) { sl[i] = rl; rl += this.col_widths[i]; }
		let tw = this.col_widths.reduce((a,b) => a + b, 0);

		let h = `<table class="te-table" style="min-width:${tw+rn}px;"><thead><tr>`;
		h += `<th class="te-row-num-header" style="width:${rn}px;min-width:${rn}px;position:sticky;left:0;z-index:4;">#</th>`;
		td.columns.forEach((col, ci) => {
			let sel = this.selected_col === ci, stk = this.sticky_cols.has(ci);
			let s = `width:${w[ci]}px;min-width:60px;max-width:${w[ci]}px;`;
			if (stk) s += `position:sticky;left:${sl[ci]}px;z-index:5;`;
			h += `<th class="te-header-cell${sel?" te-col-selected":""}${stk?" te-sticky-col":""}" data-col="${ci}" style="${s}">`;
			h += `<div class="te-header-inner"><input type="text" class="te-header-input" data-col="${ci}" value="${frappe.utils.escape_html(col||"")}" spellcheck="false">`;
			h += `<div class="te-col-menu-btn" data-col="${ci}"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>`;
			h += `<div class="te-resize-handle" data-col="${ci}"></div></th>`;
		});
		h += '</tr></thead><tbody>';
		(td.data||[]).forEach((row, ri) => {
			let rs = this.selected_row === ri;
			h += `<tr${rs?' class="te-row-selected"':''} data-row="${ri}"><td class="te-row-num" data-row="${ri}" style="position:sticky;left:0;z-index:3;">${ri+1}</td>`;
			td.columns.forEach((_, ci) => {
				let cv = (row&&row[ci]!==undefined)?row[ci]:"", cs = this.selected_col===ci, stk = this.sticky_cols.has(ci);
				let s = `width:${w[ci]}px;min-width:60px;max-width:${w[ci]}px;`;
				if (stk) s += `position:sticky;left:${sl[ci]}px;z-index:2;`;
				h += `<td class="te-cell${cs?" te-col-selected":""}${stk?" te-sticky-col":""}" style="${s}"><input type="text" class="te-cell-input" data-row="${ri}" data-col="${ci}" value="${frappe.utils.escape_html(String(cv))}" spellcheck="false"></td>`;
			});
			h += '</tr>';
		});
		h += '</tbody></table>';
		this.table_area.html(h);
		this.bind_cell_events();
		this.update_status(td);
		this.update_delete_buttons();
	}

	bind_cell_events() {
		const me = this;
		this.table_area.find(".te-cell-input, .te-header-input").on("input", () => me.debounced_sync());

		this.table_area.find(".te-cell-input").on("keydown", function(e) {
			let r = parseInt($(this).data("row")), c = parseInt($(this).data("col"));
			if (e.key === "Tab") { e.preventDefault(); me.move_focus(r,c,e.shiftKey?-1:1,"col"); }
			else if (e.key === "Enter" && !e.ctrlKey) { e.preventDefault(); me.move_focus(r,c,e.shiftKey?-1:1,"row"); }
			else if (e.key === "Delete" && e.ctrlKey) { e.preventDefault(); $(this).val(""); me.debounced_sync(); }
		});

		this.table_area.find(".te-row-num").on("click", function(e) {
			e.stopPropagation();
			let r = parseInt($(this).data("row"));
			me.selected_row = me.selected_row === r ? null : r;
			me.selected_col = null;
			me.refresh_visual_selection();
		});

		this.table_area.find(".te-header-cell").on("mousedown", function(e) {
			let $t = $(e.target);
			if ($t.hasClass("te-header-input") || $t.hasClass("te-resize-handle") || $t.closest(".te-col-menu-btn").length) return;
			e.preventDefault();
			let c = parseInt($(this).data("col"));
			me.selected_col = me.selected_col === c ? null : c;
			me.selected_row = null;
			me.refresh_visual_selection();
		});

		this.table_area.find(".te-col-menu-btn").on("click", function(e) {
			e.stopPropagation(); e.preventDefault();
			me.show_col_menu(parseInt($(this).data("col")), $(this));
		});

		this.table_area.find(".te-resize-handle").on("mousedown", function(e) {
			e.preventDefault(); e.stopPropagation();
			me.start_resize(parseInt($(this).data("col")), e.pageX);
		});

		this.table_area.find(".te-cell-input").on("paste", function(e) {
			let cb = e.originalEvent.clipboardData; if (!cb) return;
			let t = cb.getData("text/plain");
			if (!t || (!t.includes("\t") && !t.includes("\n"))) return;
			e.preventDefault();
			me.paste_data(t, parseInt($(this).data("row")), parseInt($(this).data("col")));
		});
	}

	// ---- sync ----
	debounced_sync() { if (this._st) clearTimeout(this._st); this._st = setTimeout(() => this.sync_to_model(), 400); }
	sync_to_model() { let j = JSON.stringify(this.read_table_data()); this.$input.val(j); this.parse_validate_and_set_in_model(j); }
	sync_and_rerender() { let d = this.read_table_data(); d.col_widths = this.col_widths?[...this.col_widths]:undefined; d.sticky_cols = [...this.sticky_cols]; let j = JSON.stringify(d); this.$input.val(j); this.parse_validate_and_set_in_model(j); }

	// ---- selection ----
	refresh_visual_selection() {
		this.table_area.find("tr").removeClass("te-row-selected");
		this.table_area.find("th, td").removeClass("te-col-selected");
		if (this.selected_row !== null) this.table_area.find(`tr[data-row="${this.selected_row}"]`).addClass("te-row-selected");
		if (this.selected_col !== null) {
			this.table_area.find(`.te-header-cell[data-col="${this.selected_col}"]`).addClass("te-col-selected");
			this.table_area.find(`.te-cell-input[data-col="${this.selected_col}"]`).closest("td").addClass("te-col-selected");
		}
		this.update_delete_buttons();
	}

	update_delete_buttons() {
		let d = this.read_table_data();
		this.toolbar.find(".btn-del-row").prop("disabled", !(this.selected_row !== null && (d.data||[]).length > 1));
		this.toolbar.find(".btn-del-col").prop("disabled", !(this.selected_col !== null && (d.columns||[]).length > 1));
	}

	// ---- column menu ----
	show_col_menu(col, $btn) {
		$(".te-col-dropdown").remove();
		this.table_area.find(".te-col-menu-btn").removeClass("te-menu-open");
		$btn.addClass("te-menu-open");
		let stk = this.sticky_cols.has(col), $th = $btn.closest(".te-header-cell");
		let $m = $(`<div class="te-col-dropdown">
			<div class="te-col-dropdown-item te-toggle-sticky"><svg width="14" height="14" viewBox="0 0 14 14" style="margin-right:6px"><path d="M7 1v5M4 6h6v2l-1 4H5L4 8V6z" stroke="currentColor" stroke-width="1.2" fill="${stk?"currentColor":"none"}" stroke-linecap="round" stroke-linejoin="round"/></svg>${stk?__("Unpin Column"):__("Pin Column")}</div>
			<div class="te-col-dropdown-item te-sort-asc"><svg width="14" height="14" viewBox="0 0 14 14" style="margin-right:6px"><path d="M7 11V3M4 5l3-3 3 3" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>${__("Sort A → Z")}</div>
			<div class="te-col-dropdown-item te-sort-desc"><svg width="14" height="14" viewBox="0 0 14 14" style="margin-right:6px"><path d="M7 3v8M4 9l3 3 3-3" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>${__("Sort Z → A")}</div>
			<div class="te-col-dropdown-divider"></div>
			<div class="te-col-dropdown-item te-clear-col"><svg width="14" height="14" viewBox="0 0 14 14" style="margin-right:6px"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>${__("Clear Column")}</div>
			<div class="te-col-dropdown-item te-delete-col te-danger-item"><svg width="14" height="14" viewBox="0 0 14 14" style="margin-right:6px"><path d="M3 4h8M5 4V3h4v1M4 4v7a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>${__("Delete Column")}</div>
		</div>`);
		let r = $th[0].getBoundingClientRect();
		$m.css({ top: r.bottom + 2, left: r.left });
		$("body").append($m);
		let mr = $m[0].getBoundingClientRect();
		if (mr.right > window.innerWidth) $m.css("left", window.innerWidth - mr.width - 8);
		const me = this, close = () => { $m.remove(); $btn.removeClass("te-menu-open"); };
		$m.find(".te-toggle-sticky").on("click", () => { me.toggle_sticky_col(col); close(); });
		$m.find(".te-sort-asc").on("click", () => { me.sort_column(col, "asc"); close(); });
		$m.find(".te-sort-desc").on("click", () => { me.sort_column(col, "desc"); close(); });
		$m.find(".te-clear-col").on("click", () => { me.clear_column(col); close(); });
		$m.find(".te-delete-col").on("click", () => { me.delete_column(col); close(); });
		setTimeout(() => $(document).one("mousedown", e => { if (!$(e.target).closest(".te-col-dropdown").length) close(); }), 0);
	}

	toggle_sticky_col(c) { this.sticky_cols.has(c) ? this.sticky_cols.delete(c) : this.sticky_cols.add(c); let d = this.read_table_data(); d.col_widths = this.col_widths; d.sticky_cols = [...this.sticky_cols]; this.render_table(d); this.sync_and_rerender(); }
	sort_column(c, dir) { let d = this.read_table_data(); d.data.sort((a,b)=>{ let va=(a[c]||"").toString().toLowerCase(), vb=(b[c]||"").toString().toLowerCase(), na=parseFloat(va), nb=parseFloat(vb); if(!isNaN(na)&&!isNaN(nb)) return dir==="asc"?na-nb:nb-na; return dir==="asc"?va.localeCompare(vb):vb.localeCompare(va); }); d.col_widths=this.col_widths; d.sticky_cols=[...this.sticky_cols]; this.render_table(d); this.sync_and_rerender(); }
	clear_column(c) { let d = this.read_table_data(); d.data.forEach(r=>{r[c]=""}); d.col_widths=this.col_widths; d.sticky_cols=[...this.sticky_cols]; this.render_table(d); this.sync_and_rerender(); }
	delete_column(c) { let d=this.read_table_data(); if(d.columns.length<=1){frappe.show_alert({message:__("Cannot delete the last column"),indicator:"orange"});return;} d.columns.splice(c,1); this.col_widths.splice(c,1); d.data.forEach(r=>r.splice(c,1)); this.sticky_cols.delete(c); let ns=new Set(); for(let s of this.sticky_cols) ns.add(s>c?s-1:s); this.sticky_cols=ns; d.col_widths=this.col_widths; d.sticky_cols=[...this.sticky_cols]; this.selected_col=null; this.render_table(d); this.sync_and_rerender(); }

	// ---- navigation ----
	move_focus(r, c, d, dir) { let td=this.read_table_data(), nr=td.data.length, nc=td.columns.length; if(dir==="col"){c+=d;if(c>=nc){c=0;r++;}if(c<0){c=nc-1;r--;}}else{r+=d;} if(r>=0&&r<nr&&c>=0&&c<nc) this.table_area.find(`.te-cell-input[data-row="${r}"][data-col="${c}"]`).focus().select(); }

	// ---- paste ----
	paste_data(text, sr, sc) {
		let d=this.read_table_data(), rows=text.split(/\r?\n/).filter(r=>r.length>0);
		rows.forEach((rt,ri)=>{ let cells=rt.split("\t"), tr=sr+ri; while(tr>=d.data.length) d.data.push(new Array(d.columns.length).fill("")); cells.forEach((cell,ci)=>{ let tc=sc+ci; while(tc>=d.columns.length){d.columns.push(__("Column")+" "+(d.columns.length+1));this.col_widths.push(150);d.data.forEach(r=>r.push(""));} d.data[tr][tc]=cell; }); });
		d.col_widths=this.col_widths; d.sticky_cols=[...this.sticky_cols]; this.render_table(d); this.sync_and_rerender();
	}

	// ---- resize ----
	start_resize(col, sx) {
		let sw=this.col_widths[col];
		const mv=e=>{ let nw=Math.max(60,sw+(e.pageX-sx)); this.col_widths[col]=nw; let ws=`width:${nw}px;min-width:60px;max-width:${nw}px;`; this.table_area.find(`th[data-col="${col}"]`).each(function(){let b=$(this).attr("style").replace(/width:[^;]+;/g,"").replace(/min-width:[^;]+;/g,"").replace(/max-width:[^;]+;/g,"");$(this).attr("style",ws+b);}); this.table_area.find(`.te-cell-input[data-col="${col}"]`).closest("td").each(function(){let b=$(this).attr("style").replace(/width:[^;]+;/g,"").replace(/min-width:[^;]+;/g,"").replace(/max-width:[^;]+;/g,"");$(this).attr("style",ws+b);}); this.table_area.find(".te-table").css("min-width",(this.col_widths.reduce((a,b)=>a+b,0)+40)+"px"); };
		const up=()=>{ $(document).off("mousemove",mv).off("mouseup",up); $("body").css("cursor",""); this.debounced_sync(); };
		$("body").css("cursor","col-resize"); $(document).on("mousemove",mv).on("mouseup",up);
	}

	// ---- data ops ----
	add_row() { let d=this.read_table_data(); if(!d.columns.length){this.render_table(this.get_default_data());this.sync_and_rerender();return;} let nc=d.columns.length, at=this.selected_row!==null?this.selected_row+1:d.data.length; d.data.splice(at,0,new Array(nc).fill("")); d.col_widths=this.col_widths; d.sticky_cols=[...this.sticky_cols]; this.selected_row=null; this.render_table(d); this.sync_and_rerender(); setTimeout(()=>this.table_area.find(`.te-cell-input[data-row="${at}"][data-col="0"]`).focus(),50); }
	add_column() { let d=this.read_table_data(); if(!d.columns.length){this.render_table(this.get_default_data());this.sync_and_rerender();return;} let at=this.selected_col!==null?this.selected_col+1:d.columns.length; d.columns.splice(at,0,__("Column")+" "+(d.columns.length+1)); this.col_widths.splice(at,0,150); d.data.forEach(r=>r.splice(at,0,"")); d.col_widths=this.col_widths; d.sticky_cols=[...this.sticky_cols]; this.selected_col=null; this.render_table(d); this.sync_and_rerender(); }
	delete_selected_row() { if(this.selected_row===null)return; let d=this.read_table_data(); if(d.data.length<=1)return; d.data.splice(this.selected_row,1); d.col_widths=this.col_widths; d.sticky_cols=[...this.sticky_cols]; this.selected_row=null; this.render_table(d); this.sync_and_rerender(); }
	delete_selected_col() { if(this.selected_col===null)return; this.delete_column(this.selected_col); }
	clear_all() { frappe.confirm(__("Clear all data in this table?"),()=>{ this.selected_row=null; this.selected_col=null; this.col_widths=null; this.sticky_cols=new Set(); this.render_empty_state(); this.$input.val(""); this.parse_validate_and_set_in_model(null); }); }

	// ---- read DOM ----
	read_table_data() {
		if (!this.table_area || !this.table_area.find(".te-header-input").length) return { columns: [], data: [], col_widths: [], sticky_cols: [] };
		let cols=[]; this.table_area.find(".te-header-input").each(function(){cols.push($(this).val());});
		let nc=cols.length||1, data=[], cells=this.table_area.find(".te-cell-input"), nr=Math.floor(cells.length/nc);
		for(let r=0;r<nr;r++){let row=[];for(let c=0;c<nc;c++)row.push(cells.eq(r*nc+c).val());data.push(row);}
		return { columns: cols, data, col_widths: this.col_widths?[...this.col_widths]:undefined, sticky_cols: [...this.sticky_cols] };
	}

	update_status(d) { this.status_bar.find(".te-status-text").text(__("{0} rows, {1} columns",[(d.data||[]).length,(d.columns||[]).length])); }

	// ---- form integration ----
	set_formatted_input(value) {
		if (!this.table_area) return;
		if (this.table_area.find(".te-cell-input:focus, .te-header-input:focus").length) return;
		if (!value) { this.render_empty_state(); return; }
		try {
			let d = typeof value === "string" ? JSON.parse(value) : value;
			if (d && d.columns && d.data) { if (d.col_widths) this.col_widths=d.col_widths; if (d.sticky_cols) this.sticky_cols=new Set(d.sticky_cols); this.render_table(d); }
			else this.render_empty_state();
		} catch(e) { this.render_empty_state(); }
	}

	get_input_value() { return this.$input ? this.$input.val() : ""; }
	parse(v) { if(!v)return null; if(typeof v==="object")return JSON.stringify(v); try{JSON.parse(v);return v;}catch(e){return null;} }

	set_disp_area(value) {
		if (!value || !this.disp_area) return;
		try {
			let d = typeof value === "string" ? JSON.parse(value) : value;
			if (!d || !d.columns) { $(this.disp_area).html(value); return; }
			let h='<table class="table table-bordered table-condensed" style="margin:0"><thead><tr>';
			d.columns.forEach(c => h+=`<th style="padding:6px 10px;font-weight:600">${frappe.utils.escape_html(c||"")}</th>`);
			h+='</tr></thead><tbody>';
			(d.data||[]).forEach(r => { h+='<tr>'; (r||[]).forEach(c => h+=`<td style="padding:6px 10px">${frappe.utils.escape_html(String(c||""))}</td>`); h+='</tr>'; });
			h+='</tbody></table>'; $(this.disp_area).html(h);
		} catch(e) { $(this.disp_area).html(value); }
	}
};


// ============================================================
//  FORMATTERS
// ============================================================
Object.assign(frappe.form.formatters, {
	// Override DateRange to handle comma-separated string from DB
	DateRange: function(value) {
		if (typeof value === "string" && value.includes(",")) {
			var parts = value.split(",");
			return __("{0} to {1}", [frappe.datetime.str_to_user(parts[0].trim()), frappe.datetime.str_to_user(parts[1].trim())]);
		}
		if (Array.isArray(value)) {
			return __("{0} to {1}", [frappe.datetime.str_to_user(value[0]), frappe.datetime.str_to_user(value[1])]);
		}
		return value || "";
	},
	Progress: function(value, docfield, options) {
		if (value === null || value === undefined) return "";
		value = Math.min(100, Math.max(0, parseFloat(value) || 0));
		var color = value < 30 ? "var(--red-500)" : value < 70 ? "var(--yellow-500)" : "var(--green-500)";
		if (options && options.only_value) return value + "%";
		return '<div style="display:flex;align-items:center;gap:8px"><div class="progress" style="flex:1;height:10px;margin:0;border-radius:5px"><div class="progress-bar" style="width:'+value+'%;background-color:'+color+';border-radius:5px"></div></div><span style="font-size:var(--text-xs);white-space:nowrap">'+format_number(value,null,1)+'%</span></div>';
	},
	TableEditor: function(value) {
		if (!value) return "";
		try {
			var d = JSON.parse(value);
			if (!d || !d.columns) return value;
			var h = '<table class="table table-bordered table-condensed" style="margin:0;font-size:var(--text-sm)"><thead><tr>';
			d.columns.forEach(function(c) { h += '<th style="padding:4px 8px">'+frappe.utils.escape_html(c||"")+'</th>'; });
			h += '</tr></thead><tbody>';
			(d.data||[]).forEach(function(r) { h += '<tr>'; (r||[]).forEach(function(c) { h += '<td style="padding:4px 8px">'+frappe.utils.escape_html(String(c||""))+'</td>'; }); h += '</tr>'; });
			h += '</tbody></table>'; return h;
		} catch(e) { return value; }
	},
});
