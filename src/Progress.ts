/* Copyright © 2022 Seneca Project Contributors, MIT License. */


type Options = {
  debug: boolean
  step: number
  start: number
  end: number
}

// Default options.
const defaults = {
  debug: false,
  step: 10,
  start: 0,
  end: 100,
}


export type ProgressOptions = Partial<Options>


type Out = {
  ok: boolean
  why?: string
  item?: any
  list?: any[]
  q?: object
  entry?: any
  details?: any
}

const INIT_OUT = {
  ok: false,
  why: 'unknown',
}


function Progress(this: any, options: ProgressOptions) {
  const seneca: any = this
  const { Skip, Exact, Default, Min } = seneca.valid

  const params = makeParams()

  seneca
    .fix('sys:progress')
    .message('create:progress', params.CreateProgress, msgCreateProgress)
    .message('update:progress', params.UpdateProgress, msgUpdateProgress)
    .message('get:progress', params.GetProgress, msgGetProgress)
    .message('list:progress', params.ListProgress, msgListProgress)

  // TODO: seneca.prepare should not be affected by seneca.fix
  seneca
    .prepare(prepare)

  // class SkipNumber extends Number { skip = true }

  // Deliberately not importing Gubu, instead using Gubu expressions as an example. 
  function makeParams() {
    return {
      CreateProgress: {
        kind: String, // Categorize this progress instance, required.

        id$: Skip(String), // Custom id, otherwise generated entity id.
        step: Skip(0), // Step size; Undefined (skipped) means use default from options.
        start: Skip(0), // Start value; Undefined (skipped) means use default from options.
        end: Skip(0), // Start value; Undefined (skipped) means use default from options.
        code: Skip(String), // Custom code string.
        ref: Skip(String), // Reference to the "owner" (E.g. an entity id).
        custom: Skip(Object), // Custom data.
        note: Skip(String), // Custom note string.
        expire: Skip(Number), // Expires in millis fron now.
      },

      UpdateProgress: {
        id: String,
        how: Exact('step', 'val'), // step=>incr by step value, val=>custom value.
        val: Skip(Number),
        status: Skip(String), // Set status manually.
        code: Skip(String), // Custom code string for Entry.
        custom: Skip(Object), // Custom data for Entry.
        note: Skip(String), // Custom note string for Entry.
      },

      GetProgress: {
        id: String,
        full: Default(false, Boolean), // If true, include entries
      },

      ListProgress: {
        q: Min(1, {}),
      },
    }
  }


  async function msgCreateProgress(this: any, msg: any) {
    const seneca = this

    const out: Out = { ...INIT_OUT }

    const data: any = {
      kind: msg.kind,
      step: null == msg.step ? options.step : msg.step,
      start: null == msg.start ? options.start : msg.start,
      end: null == msg.end ? options.end : msg.end,
      code: msg.code,
      ref: msg.ref,
      custom: msg.custom,
      note: msg.note,
      expire: msg.expire,
    }

    if (null != msg.id$) {
      data.id$ = msg.id$
    }

    data.val = data.start
    data.status = 'active'
    data.when = Date.now()

    let progress = makeProgressEnt(seneca).data$(data)

    progress = await progress.save$()
    // console.log(data, progress)

    out.ok = true
    delete out.why

    out.item = progress.data$(false)

    return out
  }


  async function msgUpdateProgress(this: any, msg: any) {
    const seneca = this
    const out: Out = { ...INIT_OUT }

    // console.log('UM', msg)

    const id = msg.id
    const full = msg.full
    const how = msg.how
    const msgval = msg.val
    const status = msg.status
    const code = msg.code
    const note = msg.note
    const custom = msg.custom

    let progress = await makeProgressEnt(seneca).load$(id)

    if (null != progress) {
      progress = await checkExpired(progress)

      let stepval = 0
      if ('step' === how) {
        stepval = progress.step
      }
      else if ('val' === how) {
        stepval = msgval
      }
      else {
        out.why = 'invalid-how'
        out.details = { how }
        return out
      }

      let entry = makeEntryEnt(seneca)
      entry.data$({
        progress_id: progress.id,
        code,
        note,
        custom,
        when: Date.now()
      })

      progress.val += stepval

      // Can't go beyond end.
      if (0 < progress.end && progress.end < progress.val) {
        progress.val = progress.end
      }
      else if (progress.end < 0 && progress.val < progress.end) {
        progress.val = progress.end
      }

      if (null != status) {
        progress.status = status
      }

      entry = await entry.save$()
      progress = await progress.save$()

      out.item = progress
      out.entry = entry

      out.list = await listEntries(seneca, full, progress)

      delete out.why
      out.ok = true
    }
    else {
      out.why = 'not-found'
    }

    return out
  }


  async function msgGetProgress(this: any, msg: any) {
    const seneca = this
    const out: Out = { ...INIT_OUT }

    const id = msg.id
    const full = msg.full

    let progress = await makeProgressEnt(seneca).load$(id)

    if (null != progress) {
      progress = await checkExpired(progress)

      out.item = progress

      out.list = await listEntries(seneca, full, progress)

      delete out.why
      out.ok = true
    }
    else {
      out.why = 'not-found'
    }

    return out
  }


  async function msgListProgress(this: any, msg: any) {
    const seneca = this
    const out: Out = { ...INIT_OUT }

    const q = { ...msg.q }
    q.status = q.status || 'active'

    const list = makeProgressEnt(seneca).list$(q)

    for (let item of list) {
      checkExpired(item)
    }

    out.ok = true
    delete out.why

    out.list = list
    out.q = q

    return out
  }


  async function prepare(this: any) {
    const seneca = this
  }


  async function listEntries(seneca: any, full: boolean, progress: any) {
    if (full) {
      const eq = {
        progress_id: progress.id,
        sort$: 'when'
      }
      const list = await makeEntryEnt(seneca).list$(eq)
      return list
    }
    return []
  }


  async function checkExpired(progress: any) {
    if (
      'active' == progress.status &&
      Date.now() < (progress.when + progress.expire)
    ) {
      progress.status = 'expired'
      await progress.save$()
    }
    return progress
  }


  function makeProgressEnt(seneca: any) {
    return seneca.entity('sys/progress')
  }

  function makeEntryEnt(seneca: any) {
    return seneca.entity('sys/progressentry')
  }


  return {
    exports: {
    }
  }
}


Object.assign(Progress, { defaults })

// Prevent name mangling
Object.defineProperty(Progress, 'name', { value: 'Progress' })

export default Progress

if ('undefined' !== typeof module) {
  module.exports = Progress
}
