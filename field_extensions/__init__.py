__version__ = "0.0.1"

import frappe.model


def _register_custom_fieldtypes():
	"""Monkey-patch Frappe to register custom field types at import time.
	This runs once when the app module is first imported."""

	NEW_DATA_TYPES = ("Date Range", "Progress", "Table Editor")
	NEW_NUMERIC_TYPES = ("Progress",)

	# Extend data_fieldtypes (tuple – must replace)
	new_data_fieldtypes = frappe.model.data_fieldtypes + NEW_DATA_TYPES
	frappe.model.data_fieldtypes = new_data_fieldtypes

	# Extend numeric_fieldtypes
	frappe.model.numeric_fieldtypes = frappe.model.numeric_fieldtypes + NEW_NUMERIC_TYPES

	# CRITICAL: Also patch modules that import data_fieldtypes directly,
	# since they hold a reference to the OLD tuple object.
	# meta.py uses it in get_valid_columns() — without this, fields are
	# silently excluded from saves.
	import sys

	for mod_name in (
		"frappe.model.meta",
		"frappe.model.create_new",
		"frappe.core.report.permitted_documents_for_user.permitted_documents_for_user",
	):
		mod = sys.modules.get(mod_name)
		if mod and hasattr(mod, "data_fieldtypes"):
			mod.data_fieldtypes = new_data_fieldtypes

	# Patch MariaDB type_map
	from frappe.database.mariadb.database import MariaDBDatabase

	_orig_mariadb_setup = MariaDBDatabase.setup_type_map

	def _patched_mariadb_setup(self):
		_orig_mariadb_setup(self)
		self.type_map["Date Range"] = ("varchar", self.VARCHAR_LEN)
		self.type_map["Progress"] = ("decimal", "5,2")
		self.type_map["Table Editor"] = ("json", "")

	MariaDBDatabase.setup_type_map = _patched_mariadb_setup

	# Patch Postgres type_map
	try:
		from frappe.database.postgres.database import PostgresDatabase

		_orig_postgres_setup = PostgresDatabase.setup_type_map

		def _patched_postgres_setup(self):
			_orig_postgres_setup(self)
			self.type_map["Date Range"] = ("varchar", self.VARCHAR_LEN)
			self.type_map["Progress"] = ("decimal", "5,2")
			self.type_map["Table Editor"] = ("json", "")

		PostgresDatabase.setup_type_map = _patched_postgres_setup
	except ImportError:
		pass

	# Patch BaseDocument.get_valid_dict to handle Date Range list values
	from frappe.model.base_document import BaseDocument

	_orig_get_valid_dict = BaseDocument.get_valid_dict

	def _patched_get_valid_dict(self, **kwargs):
		meta = getattr(self, "meta", None)
		if meta:
			for df in meta.fields:
				if df.fieldtype == "Date Range":
					value = self.get(df.fieldname)
					if isinstance(value, list):
						self.set(df.fieldname, ",".join(str(v) for v in value))
				elif df.fieldtype == "Table Editor":
					# MariaDB JSON columns reject empty strings — must be valid JSON or NULL
					value = self.get(df.fieldname)
					if not value or value == "":
						self.set(df.fieldname, None)
		return _orig_get_valid_dict(self, **kwargs)

	BaseDocument.get_valid_dict = _patched_get_valid_dict


_register_custom_fieldtypes()


def _ensure_meta_patched():
	"""Ensure meta.py has the updated data_fieldtypes even if it was
	imported after our __init__.py ran (lazy import scenario)."""
	import frappe.model.meta as meta_mod

	if "Date Range" not in getattr(meta_mod, "data_fieldtypes", ()):
		meta_mod.data_fieldtypes = frappe.model.data_fieldtypes


# Also hook into frappe.get_meta to ensure patching on first access
_orig_get_meta = frappe.get_meta


def _patched_get_meta(*args, **kwargs):
	_ensure_meta_patched()
	return _orig_get_meta(*args, **kwargs)


frappe.get_meta = _patched_get_meta
