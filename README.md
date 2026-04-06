# Field Extensions

Advanced custom field types for the [Frappe Framework](https://frappeframework.com). Adds three new field types that can be used in any DocType — no core modifications required.

## Field Types

### Date Range

A two-date picker that stores both start and end dates in a single field.

- Renders a calendar range picker (start date to end date)
- Stored as comma-separated ISO dates: `2024-01-01,2024-01-31`
- DB column: `varchar(140)`
- Use cases: leave applications, project timelines, event scheduling

### Progress

A numeric field (0–100%) rendered as a visual progress bar.

- Color-coded: red (< 30%), yellow (< 70%), green (>= 70%)
- Input is clamped between 0 and 100
- DB column: `decimal(5,2)`
- Use cases: task completion, project milestones, upload status

### Table Editor

An inline spreadsheet-like table stored as JSON — no child DocType needed.

- Add, remove, and reorder rows and columns
- Editable column headers
- Resizable columns by dragging header borders
- Pin (sticky) columns that stay visible while scrolling horizontally
- Column dropdown menu with Sort A-Z / Z-A, Clear, Pin, and Delete
- Paste tabular data from Excel / Google Sheets
- Keyboard navigation: Tab, Enter, Ctrl+Delete
- Row and column selection for targeted deletion
- Empty state with quick-start button
- Data persisted as JSON: `{"columns": [...], "data": [[...], ...], "col_widths": [...], "sticky_cols": [...]}`
- DB column: `json / longtext`
- Use cases: quick reference tables, specs, config data, comparison matrices

## Installation

```bash
bench get-app https://github.com/Abhimanyudutta27/field-extensions --branch develop
bench --site your-site.localhost install-app field_extensions
bench --site your-site.localhost migrate
bench build --app field_extensions
```

After installation, the three new field types will appear in the field type dropdown when creating or editing DocType fields.

## How It Works

This app registers custom field types **without modifying Frappe core**:

| Concern | Mechanism |
|---|---|
| Field type constants | Monkey-patches `data_fieldtypes` and `numeric_fieldtypes` at import time |
| Database schema | Monkey-patches `setup_type_map()` on MariaDB and PostgreSQL database classes |
| UI dropdowns | Adds field type options via Property Setters on `after_migrate` |
| Frontend controls | Loaded via `app_include_js` — defines `ControlDateRange`, `ControlProgress`, `ControlTableEditor` |
| Formatters | Extends `frappe.form.formatters` for list views and print |
| Date Range serialization | Patches `BaseDocument.get_valid_dict` to convert arrays to strings |

On uninstall, all Property Setters are cleaned up automatically.

## Compatibility

- Frappe v15+
- MariaDB and PostgreSQL
- Works with ERPNext and any Frappe-based app

## Demo DocType

The app ships with a **Field Type Demo** DocType (`/app/field-type-demo`) that includes all three field types for quick testing.

## License

MIT
