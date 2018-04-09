import { NexeCompiler } from '../compiler'
import { readFileAsync, writeFileAsync } from '../util'
import { resolve, relative } from 'path'
import { NexeOptions } from '../options'
import resolveFiles from 'resolve-dependencies'

function makeRelative(cwd: string, path: string) {
  return './' + relative(cwd, path)
}

let producer = async function(compiler: NexeCompiler): Promise<string> {
  const { cwd, input } = compiler.options
  const { files, entries } = await resolveFiles(input, { cwd, expand: true })
  const mainFileContents = (entries[input].contents as string) || ''

  Object.keys(files).forEach(filename => {
    const file = files[filename]!
    if (file && file.contents) {
      compiler.addResource(makeRelative(cwd, filename), Buffer.from(file.contents))
    }
  })
  return Promise.resolve(mainFileContents)
}

export default async function bundle(compiler: NexeCompiler, next: any) {
  const { bundle, cwd, empty, input } = compiler.options
  if (!bundle) {
    compiler.input = await readFileAsync(resolve(cwd, input), 'utf-8')
    return next()
  }

  if (!input) {
    compiler.input = ''
    return next()
  }

  if (typeof bundle === 'string') {
    producer = require(resolve(cwd, bundle)).createBundle
  }

  compiler.input = await producer(compiler)
  const debugBundle = compiler.options.debugBundle

  if (debugBundle) {
    let bundleDebugFile = typeof debugBundle === 'string' ? debugBundle : 'nexe-debug.bundle.js'
    await writeFileAsync(resolve(cwd, bundleDebugFile), compiler.input)
  }

  return next()
}
