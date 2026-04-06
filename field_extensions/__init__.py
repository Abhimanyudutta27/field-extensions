__version__ = "0.0.1"

import frappe.model


def _register_custom_fieldtypes():
	"""Monkey-patch Frappe to register custom field types at import time.
	This runs once when the app module is first imported."""

	NEW_DATA_TYPES = ("Date Range", "Progress", "Table Editor")
	NEW_NUMERIC_TYPES = ("Progress",)

	# Extend data_fieldtypes (tuple – must replace)
	frappe.model.data_fieldtypes = frappe.model.data_fieldtypes + NEW_DATA_TYPES

	# Extend numeric_fieldtypes
	frappe.model.numeric_fieldtypes = frappe.model.numeric_fieldtypes + NEW_NUMERIC_TYPES

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
		# Before calling original, serialize any Date Range list values to strings
		meta = getattr(self, "meta", None)
		if meta:
			for df in meta.fields:
				if df.fieldtype == "Date Range":
					value = self.get(df.fieldname)
					if isinstance(value, list):
						self.set(df.fieldname, ",".join(str(v) for v in value))
		return _orig_get_valid_dict(self, **kwargs)

	BaseDocument.get_valid_dict = _patched_get_valid_dict


_register_custom_fieldtypes()
