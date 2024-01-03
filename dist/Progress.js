"use strict";
/* Copyright © 2022 Seneca Project Contributors, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
// Default options.
const defaults = {
    debug: false,
    step: 10,
    start: 0,
    end: 100,
};
const INIT_OUT = {
    ok: false,
    why: 'unknown',
};
function Progress(options) {
    const seneca = this;
    const { Skip, Exact, Default, Min } = seneca.valid;
    const params = makeParams();
    seneca
        .fix('sys:progress')
        .message('create:progress', params.CreateProgress, msgCreateProgress)
        .message('update:progress', params.UpdateProgress, msgUpdateProgress)
        .message('get:progress', params.GetProgress, msgGetProgress)
        .message('list:progress', params.ListProgress, msgListProgress);
    // TODO: seneca.prepare should not be affected by seneca.fix
    seneca
        .prepare(prepare);
    // class SkipNumber extends Number { skip = true }
    // Deliberately not importing Gubu, instead using Gubu expressions as an example. 
    function makeParams() {
        return {
            CreateProgress: {
                kind: String,
                id$: Skip(String),
                step: Skip(0),
                start: Skip(0),
                end: Skip(0),
                code: Skip(String),
                owner: Skip(String),
                ref: Skip(String),
                user_id: Skip(String),
                custom: Skip(Object),
                note: Skip(String),
                expire: Skip(Number), // Expires in millis fron now.
            },
            UpdateProgress: {
                id: String,
                how: Exact('step', 'val', 'set'),
                val: Skip(Number),
                status: Skip(String),
                code: Skip(String),
                custom: Skip(Object),
                note: Skip(String), // Custom note string for Entry.
            },
            GetProgress: {
                id: String,
                full: Default(false, Boolean), // If true, include entries
            },
            ListProgress: {
                q: Min(1, {}),
            },
        };
    }
    async function msgCreateProgress(msg) {
        const seneca = this;
        const out = { ...INIT_OUT };
        const data = {
            kind: msg.kind,
            step: null == msg.step ? options.step : msg.step,
            start: null == msg.start ? options.start : msg.start,
            end: null == msg.end ? options.end : msg.end,
            code: msg.code,
            ref: msg.ref,
            owner: msg.owner,
            user_id: msg.user_id,
            custom: msg.custom,
            note: msg.note,
            expire: msg.expire,
        };
        if (null != msg.id$) {
            data.id$ = msg.id$;
        }
        data.val = data.start;
        data.status = 'active';
        data.when = Date.now();
        let progress = makeProgressEnt(seneca).data$(data);
        progress = await progress.save$();
        // console.log(data, progress)
        out.ok = true;
        delete out.why;
        out.item = progress.data$(false);
        return out;
    }
    async function msgUpdateProgress(msg) {
        const seneca = this;
        const out = { ...INIT_OUT };
        // console.log('UM', msg)
        const id = msg.id;
        const full = msg.full;
        const how = msg.how;
        const entryval = msg.val;
        const status = msg.status;
        const code = msg.code;
        const note = msg.note;
        const custom = msg.custom;
        let progress = await makeProgressEnt(seneca).load$(id);
        if (null != progress) {
            progress = await checkExpired(progress);
            let stepval = 0;
            if ('step' === how) {
                stepval = progress.step;
            }
            else if ('val' === how) {
                stepval = entryval;
            }
            else if ('set' === how) {
                stepval = 0;
            }
            else {
                out.why = 'invalid-how';
                out.details = { how };
                return out;
            }
            let entry = makeEntryEnt(seneca);
            entry.data$({
                progress_id: progress.id,
                code,
                note,
                custom,
                how,
                entryval,
                user_id: progress.user_id,
                owner: progress.owner,
                ref: progress.ref,
                when: Date.now(),
            });
            progress.val += stepval;
            if ('set' === how) {
                progress.val = entryval;
            }
            // Can't go beyond end.
            if (0 < progress.end && progress.end < progress.val) {
                progress.val = progress.end;
            }
            else if (progress.end < 0 && progress.val < progress.end) {
                progress.val = progress.end;
            }
            if (null != status) {
                progress.status = status;
            }
            entry = await entry.save$({
                status: progress.status,
                val: progress.val
            });
            progress = await progress.save$();
            out.item = progress;
            out.entry = entry;
            out.list = await listEntries(seneca, full, progress);
            delete out.why;
            out.ok = true;
        }
        else {
            out.why = 'not-found';
        }
        return out;
    }
    async function msgGetProgress(msg) {
        const seneca = this;
        const out = { ...INIT_OUT };
        const id = msg.id;
        const full = msg.full;
        let progress = await makeProgressEnt(seneca).load$(id);
        if (null != progress) {
            progress = await checkExpired(progress);
            out.item = progress;
            out.list = await listEntries(seneca, full, progress);
            delete out.why;
            out.ok = true;
        }
        else {
            out.why = 'not-found';
        }
        return out;
    }
    async function msgListProgress(msg) {
        const seneca = this;
        const out = { ...INIT_OUT };
        const q = { ...msg.q };
        q.status = q.status || 'active';
        const list = makeProgressEnt(seneca).list$(q);
        for (let item of list) {
            checkExpired(item);
        }
        out.ok = true;
        delete out.why;
        out.list = list;
        out.q = q;
        return out;
    }
    async function prepare() {
        const seneca = this;
    }
    async function listEntries(seneca, full, progress) {
        if (full) {
            const eq = {
                progress_id: progress.id,
                sort$: { 'when': 1 }
            };
            const list = await makeEntryEnt(seneca).list$(eq);
            return list;
        }
        return [];
    }
    async function checkExpired(progress) {
        if ('active' == progress.status &&
            Date.now() < (progress.when + progress.expire)) {
            progress.status = 'expired';
            await progress.save$();
        }
        return progress;
    }
    function makeProgressEnt(seneca) {
        return seneca.entity('sys/progress');
    }
    function makeEntryEnt(seneca) {
        return seneca.entity('sys/progressentry');
    }
    return {
        exports: {}
    };
}
Object.assign(Progress, { defaults });
// Prevent name mangling
Object.defineProperty(Progress, 'name', { value: 'Progress' });
exports.default = Progress;
if ('undefined' !== typeof module) {
    module.exports = Progress;
}
//# sourceMappingURL=Progress.js.map