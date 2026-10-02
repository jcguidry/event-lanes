# A runnable first timeline

The repository is the authoritative installation path until you choose a release tarball. No public npm-registry installation is assumed.

```sh
git clone https://github.com/jcguidry/event-lanes.git
cd event-lanes
npm install
npm run build
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://localhost:8000/examples/quickstart/`. It loads a generic three-event dataset, selects the `recovery` group, traces the declared chain, locates an effect without changing selection, and exports a saved view. The text beside the timeline shows the selected IDs and trace counts. Open `examples/quickstart/global.html` for the script-tag equivalent.

`app.js` is plain JavaScript. `typed.ts` is the equivalent typed integration and is compiled by `npm run check:examples`. To bundle it in another app, import from `@jcguidry/event-lanes` after installing the release package. The relative imports in these examples work because they are served from the repository root.

```js
import {createTimeline} from '@jcguidry/event-lanes';
const timeline = createTimeline(document.getElementById('timeline'), {
  selectionMode: 'group', timeZone: 'UTC'
});
timeline.setData(await (await fetch('/api/timeline')).json());
timeline.on('selection', ({eventIds, trace}) => {
  console.log(eventIds, trace.upstream, trace.downstream);
});
timeline.selectGroup('recovery');
timeline.fitTrace();
// On framework unmount:
// timeline.destroy();
```

Register listeners before selection when you need the initial callback. Set data before selecting IDs. `setData` accepts unknown JSON and validates references before replacing the current dataset. A browser cannot import bare package names without a bundler or import map. The global build exposes `window.EventLanes` and needs neither.

A view export is reloadable UI state for the same dataset; it does not include the dataset. Selection/analysis exports are application-defined payloads. PNG exports contain the visible canvas only. See [recipes](RECIPES.md) for refresh, filters and wrappers.
