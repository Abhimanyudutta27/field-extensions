# Copyright (c) 2026, Delibrex and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class FieldTypeDemo(Document):
	def validate(self):
		for field in ("progress_field", "progress_field_2"):
			value = getattr(self, field, None)
			if value is not None:
				setattr(self, field, max(0, min(100, float(value or 0))))
