/**
 * Custom standard-version updater for the shields.io version badge in README.md.
 *
 * Matches the pattern: version-X.Y.Z-orange in the badge URL and replaces the
 * semver portion with the new version during `standard-version` bumps.
 *
 * @see https://github.com/conventional-changelog/standard-version#custom-updaters
 */

const BADGE_PATTERN = /version-(\d+\.\d+\.\d+)-orange/;

module.exports.readVersion = function (contents) {
  const match = contents.match(BADGE_PATTERN);
  return match ? match[1] : '';
};

module.exports.writeVersion = function (contents, version) {
  return contents.replace(BADGE_PATTERN, `version-${version}-orange`);
};
