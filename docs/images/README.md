# Timeline screenshots

The root README and documentation index use real, unmodified Chromium screenshots from the generic browser acceptance fixture. All displayed data is synthetic and domain-neutral.

| File | What it shows | Browser test |
|---|---|---|
| `timeline-stacked-events.png` | Selected overlapping intervals on separate tracks within a resource lane | `detail stacking, density drill-down, resize and lifecycle` |
| `timeline-pinned-lanes.png` | Expanded lane controls and a sticky pinned resource above scrolled lanes | `lane search, sticky pinning and ordering are operable controls` |

Captured from [successful CI run 36946563399](https://github.com/jcguidry/event-lanes/actions/runs/36946563399), library revision `1e121fea76575ed767acba3c230d7fcb770cdefd` (v0.2.1). Images are stored in the repository so README previews do not depend on expiring Actions artifacts.

To refresh them, run the existing acceptance suite and copy the corresponding Chromium PNGs from `test-results/` into this directory. Alternatively download the `browser-acceptance-report` artifact from a successful CI run. Keep the original image bytes, update the source revision/run above, and visually check the captions before committing. Do not put private domain examples in this public repository.

```sh
npx playwright install --with-deps chromium
npm run build
npm run test:browser -- --project=chromium
```
