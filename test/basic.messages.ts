// Basic progressral: sent email invite to a friend

export default {
  print: false,
  pattern: 'sys:progress',
  allow: { missing: true },

  calls: [
    /*
    {
      name: 'create-alice',
      pattern: 'create:entry', // call { biz:progress, create:entry, ...params }
      params: {
        user_id: 'u01',
        kind: 'standard', // avoid using 'type', 'kind' has fewer conflicts
        email: 'alice@example.com',
      },
      out: {
        ok: true,
        entry: {
          user_id: 'u01', // _id suffix for foreign keys
          kind: 'standard',
          email: 'alice@example.com',
        },
        occur: {
          user_id: 'u01',
          entry_kind: 'standard',
          kind: 'create',
          email: 'alice@example.com',
        }
      },
    },
    */

    // Print entire database
    // { print: true, pattern: 'biz:null,role:mem-store,cmd:dump' },

  ],
}

