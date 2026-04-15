// Copyright (c) 2026, Delibrex and contributors
// For license information, please see license.txt

var LAYOUT_TYPES = [
	"Section Break", "Column Break", "Tab Break", "HTML",
	"Table", "Table MultiSelect",
];

frappe.ui.form.on("Field Type Demo", {
	onload(frm) {
		frm.meta.fields.forEach(function (df) {
			if (LAYOUT_TYPES.indexOf(df.fieldtype) !== -1) return;
			var field = frm.fields_dict[df.fieldname];
			if (!field || !field.$wrapper) return;

			field.$wrapper.on("change input", function () {
				setTimeout(function () {
					update_completion_bar(frm);
				}, 100);
			});
		});
	},

	refresh(frm) {
		update_completion_bar(frm);
	},
});

function get_completion(frm) {
	var data_fields = frm.meta.fields.filter(function (df) {
		return LAYOUT_TYPES.indexOf(df.fieldtype) === -1 && df.fieldname !== "amended_from";
	});

	var filled = data_fields.filter(function (df) {
		var val = frm.doc[df.fieldname];
		return val !== null && val !== undefined && val !== "" && val !== 0;
	}).length;

	var total = data_fields.length;
	var pct = total ? Math.round((filled / total) * 100) : 0;

	return { filled: filled, total: total, pct: pct };
}

function update_completion_bar(frm) {
	var c = get_completion(frm);
	var color = c.pct >= 70 ? "#38a169" : c.pct >= 30 ? "#dd6b20" : "#e53e3e";

	var $bar = frm.$wrapper.find(".ftd-completion-bar");

	if (!$bar.length) {
		var $el = $([
			'<div class="ftd-completion-bar" style="padding:14px 16px; margin-bottom:20px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.06);">',
			'  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">',
			'    <span class="ftd-completion-text" style="font-size:13px; color:#718096;"></span>',
			'    <span class="ftd-completion-pct" style="font-size:15px; font-weight:700;"></span>',
			'  </div>',
			'  <div style="width:100%; height:14px; background:#e2e8f0; border-radius:7px; overflow:hidden;">',
			'    <div class="ftd-completion-fill" style="height:100%; border-radius:7px; min-width:2%; transition:width 0.4s ease;"></div>',
			'  </div>',
			'</div>',
		].join(""));

		frm.$wrapper.find(".form-layout").prepend($el);
		$bar = $el;
	}

	$bar.find(".ftd-completion-fill").css({ width: c.pct + "%", background: color });
	$bar.find(".ftd-completion-pct").text(c.pct + "%").css("color", color);
	$bar.find(".ftd-completion-text").text(
		c.filled + " of " + c.total + " fields filled"
	);
}
