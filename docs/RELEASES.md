# Releases and compatibility

The current package version is 0.2.1, with data/view `schemaVersion: 1`. v0.2 adds optional saved-view fields and new APIs; old schema-1 views remain valid. Runtime validation remains authoritative. Default trace semantics remain causes/enables, both directions, unlimited depth.

Before 1.0, breaking API changes require a minor version; fixes and compatible documentation updates use a patch. After 1.0 use ordinary SemVer. Breaking JSON changes require a new schema version and migration notes, not silent reinterpretation. Release tags are immutable.

CI publishes a versioned GitHub release only after model, Python, example, package and three-browser acceptance checks succeed on main. The release contains the package tarball, standalone global JavaScript, schema and SHA-256 checksums. The workflow skips an already-existing tag. npm registry publication is not part of this workflow.

Install a downloaded release tarball into any JavaScript application:

```sh
npm install ./jcguidry-event-lanes-0.2.1.tgz
```

Or pin a GitHub release tarball URL once the release exists. CI for consumers should pin a release or exact commit, never assume main is immutable. The private demo pins the exact public library revision.

Release process: update package version and CHANGELOG, run checks, merge/push main, inspect CI/release assets, then update consumers. `npm pack --dry-run` lists package contents. Built ESM includes declarations/maps; the script-tag build exposes EventLanes. Package smoke tests import the tarball contents and check the schema/global build without a runtime dependency.
