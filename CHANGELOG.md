# Changelog

All notable changes to this project will be documented in this file.

## [1.7.1] - 2024-12-16

### Fixed
- Corrected GitHub URL in HTML report header

---

## [1.7.0] - 2024-12-16

### Fixed
- **YAML-004 False Positives**: Updated sensitive key detection to use word-boundary matching
  - No longer flags `http.private.port`, `authorizationUrl`, or company names
  - Still correctly catches `password`, `secret`, `clientSecret`, `tokenSecret`, etc.

### Improved
- **Dashboard Charts**: Added subtitles to all chart sections for better context
- **Category Chart**: Each category now has a distinct color instead of uniform gray
- **Dynamic Version**: Report now displays actual package version instead of hardcoded value

---

## [1.6.0] - 2024-12-16

### Added
- **Modern HTML Report**: Completely rewritten interactive dashboard
  - Dashboard with summary cards and Chart.js charts (severity donut, top rules bar, categories bar)
  - Tabulator-based issues table with multiselect column filters
  - Frozen table header for better navigation
  - Full-width expandable layout
  - Global search and CSV export
  - Built with Tailwind CSS, Chart.js, and Tabulator

### Changed
- Updated README architecture diagram to include HTML formatter stack
- Enhanced HTML output documentation

---

## [1.4.0] - 2024-12-16

### Added
- **MULE-802 Fix**: Smart detection for standalone files (skips structure validation)
- **Developer Experience**: Added Prettier and EditorConfig support
- **Maintenance**: Updated dependencies

---

## [1.3.0] - 2024-12-16

### Added

#### New Features
- **YAML Properties Linting** - Lint MuleSoft YAML configuration files
- **Cyclomatic Complexity Analysis** - Detect complex flows that need refactoring

#### New Rules (4 rules, 29 total)
- **MULE-801**: Flow Complexity - Warns if flow complexity exceeds threshold
- **YAML-001**: Environment Files - Check for dev/qa/prod YAML files
- **YAML-003**: Property Naming - Keys should be `category.property` format
- **YAML-004**: Plaintext Secrets - Detect unencrypted sensitive values

#### New Dependencies
- `js-yaml` - YAML parsing for properties files

#### Core Utilities
- `YamlParser` - Parse and analyze YAML configuration files
- `ComplexityCalculator` - Calculate cyclomatic complexity for flows

---

## [1.2.0] - 2024-12-16

### Added
- MULE-402: HTTP Content-Type
- MULE-403: HTTP Timeout
- MULE-503: Large Choice Blocks
- MULE-604: Missing doc:name
- Comprehensive test fixtures

---

## [1.1.0] - 2024-12-16

### Added
- 11 extended rules for security, logging, naming, HTTP, performance
- New categories: HTTP, Documentation, Performance

---

## [1.0.0] - 2024-12-16

### Added
- Core MVP with 10 rules
- CLI with table, JSON, SARIF output
- XPath-based rule engine
