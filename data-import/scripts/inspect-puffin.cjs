// Decode a padelpuffin Next.js RSC stream and locate the tournament data.
const fs = require('fs')
const path = require('path')

const file = process.argv[2]
const html = fs.readFileSync(file, 'utf8')

// Each chunk: self.__next_f.push([1,"<escaped json string>"])
const re = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g
let m
let out = ''
while ((m = re.exec(html))) {
  try {
    out += JSON.parse('"' + m[1] + '"')
  } catch {
    /* skip un-parseable chunk */
  }
}
const base = path.basename(file).replace(/\.html$/, '')
fs.writeFileSync(path.join(path.dirname(file), base + '.rsc.txt'), out)
console.log('decoded length:', out.length)

for (const kw of ['"matches"', '"players"', '"createdAt"', '"name"', '"score']) {
  const i = out.indexOf(kw)
  console.log(`\n===== first "${kw}" at ${i} =====`)
  if (i >= 0) console.log(out.slice(Math.max(0, i - 120), i + 400))
}
