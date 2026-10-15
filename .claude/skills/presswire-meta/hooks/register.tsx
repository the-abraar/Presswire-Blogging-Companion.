import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { META, POST, checkMeta, skeleton } from './meta'

const PANE = 'posts'
const rev = atom({ plugin: 'presswire-meta', key: 'rev' } as const, 0)

const bump = ($: EngineInterface) => update($, rev, n => n + 1)

const isPresswire = async ($: EngineInterface, root: string) =>
  (await $.fs.exists(`${root}/working_rn`)) && (await $.fs.exists(`${root}/published`))

export const register: Register = on => {
  // Writing a published post: its number must match a working_rn folder; then make sure a meta.json exists.
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const post = POST.exec(e.file_path)
    const meta = META.exec(e.file_path)
    if (post && (await isPresswire($, post[1]!))) {
      const [, root, n, slug] = post
      const folders = (await $.fs.list(`${root}/working_rn`)).filter(f => f.name.startsWith(`${n}_`))
      if (folders.length === 0)
        return { deny: `presswire-meta: no working_rn/${n}_* folder. Numbers are global and sequential; create the folder first.` }
      if (folders[0]!.name !== `${n}_${slug}`)
        return { deny: `presswire-meta: slug mismatch. working_rn has "${folders[0]!.name}", this post is "${n}_${slug}".` }
      const ran = await next(e)
      const metaPath = `${root}/published/${n}_${slug}.meta.json`
      if (ran.deny === undefined && !(await $.fs.exists(metaPath))) {
        const title = /^#\s+(.+)$/m.exec(e.content)?.[1] ?? slug
        const date = new Date(await $.clock.now()).toISOString().slice(0, 10)
        await $.fs.write(metaPath, skeleton(Number(n), slug!, title, date))
        $.ui.toast(`presswire-meta: created ${n}_${slug}.meta.json (fill in tags and platforms)`)
      }
      await bump($)
      return ran
    }
    if (meta && (await isPresswire($, meta[1]!))) {
      const reason = checkMeta(e.content, Number(meta[2]))
      if (reason !== null) return { deny: `presswire-meta: ${meta[2]}_${meta[3]}.meta.json ${reason}.` }
      const ran = await next(e)
      await bump($)
      return ran
    }
    return next(e)
  }).catch(($, e, next) =>
    next.called ? next(e) : { deny: `${$.plugin.name}: its check failed, so the write was held.` },
  )

  // An Edit cannot be checked before it lands: check the file afterwards.
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const meta = META.exec(e.file_path)
    const ran = await next(e)
    if (meta && ran.deny === undefined && ran.isError !== true && (await isPresswire($, meta[1]!))) {
      const reason = checkMeta(await $.fs.read(e.file_path), Number(meta[2]))
      if (reason !== null) $.ui.toast(`presswire-meta: ${meta[2]}_${meta[3]}.meta.json ${reason}`)
      await bump($)
    }
    return ran
  }).catch(($, e, next) =>
    next.called ? next(e) : { deny: `${$.plugin.name}: its check failed, so the write was held.` },
  )

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'posts', description: 'Published posts and where they still need cross-posting' })
    return next(e)
  })

  on('command.run', { command: 'posts' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Posts' })
    return { text: 'Posts pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    await read($, rev)
    const { Box, Text } = $.ui.resolve(e)
    const rows: { name: string; used: string[]; todo: boolean }[] = []
    const files = (await $.fs.list('published').catch(() => [])).filter(f => f.name.endsWith('.meta.json'))
    for (const f of files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
      try {
        const m = JSON.parse(await $.fs.read(`published/${f.name}`))
        const used = Object.entries<any>(m.platforms ?? {}).filter(([, v]) => v?.url).map(([p]) => p)
        rows.push({ name: f.name.replace('.meta.json', ''), used, todo: used.length === 0 })
      } catch {
        rows.push({ name: f.name.replace('.meta.json', ''), used: ['invalid meta.json'], todo: false })
      }
    }
    if (rows.length === 0) return <Text dimColor>No published posts yet.</Text>
    return (
      <Box flexDirection="column">
        {rows.map(r => (
          <Text dimColor={!r.todo}>
            {r.todo ? 'TODO ' : 'done '} {r.name}: {r.used.join(', ') || 'not cross-posted'}
          </Text>
        ))}
      </Box>
    )
  })
}
