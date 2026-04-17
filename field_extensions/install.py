import frappe


CUSTOM_FIELDTYPES = ["Date Range", "Progress", "Table Editor", "Tags", "Slider", "Toggle", "Rich Tags", "Address Autocomplete", "Radio"]

# DocType fieldname pairs that have the fieldtype Select dropdown
FIELDTYPE_SELECTS = [
	("DocField", "fieldtype"),
	("Custom Field", "fieldtype"),
	("Customize Form Field", "fieldtype"),
]


def after_migrate():
	"""Add custom field types to DocField/Custom Field/Customize Form Field dropdowns."""
	for doctype, fieldname in FIELDTYPE_SELECTS:
		_add_fieldtype_options(doctype, fieldname)
	frappe.clear_cache()


def _add_fieldtype_options(doctype, fieldname):
	"""Add our custom fieldtypes to the Select options of a doctype field."""
	meta = frappe.get_meta(doctype)
	df = meta.get_field(fieldname)
	if not df or not df.options:
		return

	current_options = df.options.split("\n")
	changed = False

	for ft in CUSTOM_FIELDTYPES:
		if ft not in current_options:
			current_options.append(ft)
			changed = True

	if changed:
		current_options.sort()
		new_options = "\n".join(current_options)

		# Use Property Setter so we don't modify core JSON files
		if frappe.db.exists("Property Setter", {
			"doc_type": doctype,
			"field_name": fieldname,
			"property": "options",
			"module": "Field Extensions",
		}):
			frappe.db.set_value("Property Setter", {
				"doc_type": doctype,
				"field_name": fieldname,
				"property": "options",
				"module": "Field Extensions",
			}, "value", new_options)
		else:
			ps = frappe.new_doc("Property Setter")
			ps.doctype_or_field = "DocField"
			ps.doc_type = doctype
			ps.field_name = fieldname
			ps.property = "options"
			ps.property_type = "Text"
			ps.value = new_options
			ps.module = "Field Extensions"
			ps.is_system_generated = 0
			ps.insert(ignore_permissions=True)


def before_uninstall():
	"""Remove property setters created by this app."""
	frappe.db.delete("Property Setter", {"module": "Field Extensions"})
	frappe.clear_cache()
