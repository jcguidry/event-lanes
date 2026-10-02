import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {validateData} from '../../../dist/core.js';

// The input supplies an offset, not an IANA timezone. Preserve the instant and
// the original text; never infer a geographical timezone from the offset.
function utcMilliseconds(value, actionId) {
  if (typeof value !== 'string' || !/T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new TypeError(`Action ${actionId} needs an explicit timezone offset`);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isSafeInteger(milliseconds)) {
    throw new TypeError(`Action ${actionId} has an invalid timestamp`);
  }
  return milliseconds;
}

export function convertInput(input) {
  const data = {
    schemaVersion: 1,
    lanes: input.resources.map(resource => ({id: resource.key, label: resource.name})),
    eventGroups: input.packages.map(pkg => ({id: pkg.key, label: pkg.name})),
    events: input.actions.map(action => ({
      id: action.key,
      label: action.name,
      time: utcMilliseconds(action.at, action.key),
      laneIds: [...action.resources],
      ...(action.packages === undefined ? {} : {groupIds: [...action.packages]}),
      ...(action.movement === undefined ? {} : {
        transfers: [{
          from: action.movement.source,
          to: action.movement.destination,
          itemId: action.movement.item
        }]
      }),
      metadata: {sourceTimestamp: action.at}
    })),
    relationships: input.links.map(link => ({
      id: link.key,
      source: link.from,
      target: link.to,
      kind: link.type
    }))
  };
  return validateData(data);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const source = new URL('../input.json', import.meta.url);
  const destination = new URL('./timeline-data.json', import.meta.url);
  const data = convertInput(JSON.parse(await readFile(source, 'utf8')));
  await writeFile(destination, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Validated ${data.lanes.length} lanes and ${data.events.length} events: ${fileURLToPath(destination)}`);
}
