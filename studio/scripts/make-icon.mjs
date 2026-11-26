import fs from 'node:fs';
import pngToIco from 'png-to-ico';

const buffer = await pngToIco('build/icon.png');
fs.writeFileSync('build/icon.ico', buffer);
console.log(`build/icon.ico ${buffer.length} bytes`);
