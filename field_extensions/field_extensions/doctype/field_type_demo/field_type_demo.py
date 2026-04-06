# Copyright (c) 2026, Delibrex and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FieldTypeDemo(Document):
	def validate(self):
		if self.progress_field is not None:
			self.progress_field = max(0, min(100, float(self.progress_field or 0)))
		if self.progress_field_2 is not None:
			self.progress_field_2 = max(0, min(100, float(self.progress_field_2 or 0)))
