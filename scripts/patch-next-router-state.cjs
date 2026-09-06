const fs = require('node:fs');
const path = require('node:path');

const runtimeDirectory = path.join(
  process.cwd(),
  'node_modules/next/dist/compiled/next-server',
);
const runtimeFiles = [
  'app-page-experimental.runtime.dev.js',
  'app-page-experimental.runtime.prod.js',
  'app-page-turbo-experimental.runtime.dev.js',
  'app-page-turbo-experimental.runtime.prod.js',
  'app-page-turbo.runtime.dev.js',
  'app-page-turbo.runtime.prod.js',
  'app-page.runtime.dev.js',
  'app-page.runtime.prod.js',
];
const unpatched =
  'catch{throw Object.defineProperty(Error("The router state header was sent but could not be parsed."),"__NEXT_ERROR_CODE",{value:"E10",enumerable:!1,configurable:!0})}';
const patched = 'catch{return}';

for (const filename of runtimeFiles) {
  const filePath = path.join(runtimeDirectory, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected Next.js runtime file is missing: ${filename}`);
  }

  const source = fs.readFileSync(filePath, 'utf8');
  if (source.includes(unpatched)) {
    fs.writeFileSync(filePath, source.replaceAll(unpatched, patched));
  } else if (!source.includes(patched)) {
    throw new Error(`Next.js router-state parser changed unexpectedly: ${filename}`);
  }
}
