// withRnfbNonModularFix — Expo config plugin.
//
// @react-native-firebase (RNFBApp/RNFBAuth) headers `#import <React/RCTConvert.h>`
// etc. from inside their own framework module. With expo-build-properties'
// `useFrameworks: "static"` (required for Firebase's Swift pods), CocoaPods'
// default Xcode settings treat that as a hard error:
//   "include of non-modular header inside framework module 'RNFBApp...'"
// This is a known, still-open incompatibility between Expo SDK 54 +
// react-native-firebase + static frameworks (see expo/expo#39607,
// invertase/react-native-firebase#8657/#6933).
//
// Two fixes exist: set `buildReactNativeFromSource: true` (simple, but
// rebuilds all of RN from source on every build — much slower CI/EAS
// builds), or patch the generated Podfile's post_install hook to relax just
// the RNFB targets' header-check setting (keeps builds fast). This plugin
// does the latter — it runs during `expo prebuild` (which EAS Build and any
// local/CI build both invoke) and edits ios/Podfile directly, so it doesn't
// need buildReactNativeFromSource at all.
const { withDangerousMod, createRunOncePlugin } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RNFB_TARGETS = ['RNFBApp', 'RNFBAuth', 'RNFBAnalytics', 'RNFBCrashlytics', 'RNFBFirestore', 'RNFBStorage'];

const SNIPPET = `
  # withRnfbNonModularFix — see plugins/withRnfbNonModularFix.js
  installer.pods_project.targets.each do |t|
    if ${JSON.stringify(RNFB_TARGETS)}.include?(t.name)
      t.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        other = config.build_settings['OTHER_CFLAGS'] ||= ['$(inherited)']
        config.build_settings['OTHER_CFLAGS'] = (other + ['-Wno-non-modular-include-in-framework-module']).uniq
      end
    end
  end
`;

function ensurePostInstall(podfile) {
  if (podfile.includes('post_install do |installer|')) return podfile;
  return `${podfile}\npost_install do |installer|\nend\n`;
}

// Finds the `end` that actually closes `post_install do |installer|`, not
// just the first `end` textually — the previous version used a non-greedy
// regex that stopped at the first `\nend` it found, which truncates as soon
// as the block contains any nested `do...end` (e.g. the standard
// `installer.pods_project.targets.each do |t| ... end` block that every
// generated RN Podfile has). That produced invalid Ruby (an orphaned `end`
// and the rest of the real post_install body left dangling outside the
// block). This walks token-by-token counting `do`/`end` depth so it finds
// the real matching `end` regardless of nesting.
function findPostInstallEnd(podfile, openIdx) {
  const re = /\b(do|end)\b/g;
  re.lastIndex = openIdx;
  let depth = 1; // the `do` in `post_install do |installer|` itself
  let m;
  while ((m = re.exec(podfile))) {
    if (m[1] === 'do') depth += 1;
    else depth -= 1;
    if (depth === 0) return m.index; // start of the matching `end`
  }
  return -1;
}

function injectSnippet(podfile) {
  podfile = ensurePostInstall(podfile);
  const openMatch = /post_install do \|installer\|/.exec(podfile);
  if (!openMatch) return podfile; // shouldn't happen after ensurePostInstall
  const bodyStart = openMatch.index + openMatch[0].length;
  const endIdx = findPostInstallEnd(podfile, bodyStart);
  if (endIdx === -1) {
    throw new Error(
      'withRnfbNonModularFix: could not find the end of the post_install block in ios/Podfile — ' +
      'refusing to edit it blindly. The Podfile template may have changed shape.',
    );
  }
  const body = podfile.slice(bodyStart, endIdx);
  if (body.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) return podfile; // already patched
  return podfile.slice(0, endIdx) + `${SNIPPET}` + podfile.slice(endIdx);
}

const withRnfbNonModularFix = (config) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      const original = fs.readFileSync(podfilePath, 'utf8');
      const updated = injectSnippet(original);
      if (updated !== original) fs.writeFileSync(podfilePath, updated);
      return cfg;
    },
  ]);

module.exports = createRunOncePlugin(withRnfbNonModularFix, 'withRnfbNonModularFix', '1.0.0');
