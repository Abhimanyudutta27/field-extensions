import frappe
from frappe import _
from frappe.utils import cint

# Field types that store complex structured data and must not appear in list view
LIST_VIEW_BLOCKED_FIELDTYPES = {"Table Editor", "Tags", "Rich Tags", "Address Autocomplete"}


def validate_docfield(doc, method=None):
	"""Block complex field types from being enabled in list view."""
	if doc.fieldtype in LIST_VIEW_BLOCKED_FIELDTYPES and cint(doc.in_list_view):
		frappe.throw(
			_("Field type '{0}' cannot be shown in list view. "
			  "This field type stores complex structured data that does not display correctly in list view. "
			  "Please uncheck 'In List View' for this field.").format(doc.fieldtype)
		)
