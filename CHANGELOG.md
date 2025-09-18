## [8.0.2] - September 2025

### Removed

- Removed FLOW support

## [8.0.1] - April 2025

### Added

- Filtering for "run once" mode, configuration of wallets and transaction ids to fetch and sign

## [8.0.0] - January 2025

### Updated

- Dependency libraries updated to the latest versions

### Changed

- parameter `env-file` renamed to `envFile`
- parameter `api-key` renamed to `apiKey`
- Docker image now uses `node` user instead of `root`

### Added

- GitHub Actions pipeline revisited
- basic smoke tests added

## [7.0.7] - December 2024

### Added

- Reporting feature

## [7.0.6] - May 2024

### Updated

- Dependency libraries updated to the latest versions
- Fixed documentation links and dependencies

## [7.0.3] - April 2024

### Changed

- Fix Solana transaction not confirmed - fix for docker image
- Print result as json for generateManagedPrivateKeyBatch (#100)
- export wallets always export default path (#79)
