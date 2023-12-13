/* Copyright © 2023 Seneca Project Contributors, MIT License. */

import Seneca from 'seneca'
import SenecaMsgTest from 'seneca-msg-test'
// import { Maintain } from '@seneca/maintain'

import ProgressDoc from '../src/ProgressDoc'
import Progress from '../src/Progress'

import BasicMessages from './basic.messages'


describe('progress', () => {
  test('happy', async () => {
    // console.log(Progress)
    expect(Progress).toBeDefined()
    expect(ProgressDoc).toBeDefined()
    const seneca = Seneca({ legacy: false })
      .test()
      .use('promisify')
      .use('entity')
      .use(Progress)
    await seneca.ready()
  })


  test('simple', async () => {
    const seneca = await makeSeneca()

    let p0 = await seneca.post('sys:progress,create:progress', { kind: 'simple' })
    // console.log('p0', p0)
    expect(p0.ok).toEqual(true)
    expect(p0.item).toMatchObject({
      kind: 'simple',
      step: 10,
      start: 0,
      end: 100,
      val: 0,
      status: 'active',
    })

    let p0g0 = await seneca.post('sys:progress,get:progress', { id: p0.item.id })
    // console.log('p0g0', p0g0)
    expect(p0g0.ok).toEqual(true)
    expect(p0g0.item).toMatchObject({
      kind: 'simple',
      step: 10,
      start: 0,
      end: 100,
      val: 0,
      status: 'active',
    })

    let p0g1 = await seneca.post('sys:progress,get:progress', { id: p0.item.id, full: true })
    // console.log('p0g1', p0g1)
    expect(p0g1.ok).toEqual(true)
    expect(p0g1.item).toMatchObject({
      kind: 'simple',
      step: 10,
      start: 0,
      end: 100,
      val: 0,
      status: 'active',
    })
    expect(p0g1.list).toEqual([])

    let p0u0 = await seneca.post('sys:progress,update:progress',
      { id: p0.item.id, how: 'step' })
    // console.log('p0u0', p0u0)
    expect(p0u0).toMatchObject({
      ok: true,
      item: {
        'entity$': '-/sys/progress',
        kind: 'simple',
        step: 10,
        start: 0,
        end: 100,
        val: 10,
        status: 'active',
      },
      entry: {
        'entity$': '-/sys/progressentry',
      },
      list: []
    })

    let p0u0g0 = await seneca.post('sys:progress,get:progress', { id: p0u0.item.id })
    // console.log('p0u0g0', p0u0g0)
    expect(p0u0g0).toMatchObject({
      ok: true,
      item: {
        'entity$': '-/sys/progress',
        kind: 'simple',
        step: 10,
        start: 0,
        end: 100,
        val: 10,
        status: 'active',
      },
      list: []
    })

    let p0u0g1 = await seneca.post('sys:progress,get:progress',
      { id: p0u0.item.id, full: true })
    // console.log('p0u0g1', p0u0g1)
    expect(p0u0g1).toMatchObject({
      ok: true,
      item: {
        'entity$': '-/sys/progress',
        kind: 'simple',
        step: 10,
        start: 0,
        end: 100,
        val: 10,
        status: 'active',
      },
      list: [
        {
          'entity$': '-/sys/progressentry',
        }
      ]
    })

    let p0u1 = await seneca.post('sys:progress,update:progress',
      { id: p0.item.id, how: 'val', val: 95, note: 'aaa', full: true })
    // console.log('p0u1', p0u1)
    expect(p0u1).toMatchObject({
      ok: true,
      item: {
        'entity$': '-/sys/progress',
        kind: 'simple',
        step: 10,
        start: 0,
        end: 100,
        val: 100,
        status: 'active',
      },
      entry: {
        'entity$': '-/sys/progressentry',
        note: 'aaa',
      },
      list: [
        {
          'entity$': '-/sys/progressentry',
        },
        {
          'entity$': '-/sys/progressentry',
          note: 'aaa',
        }
      ]
    })
  })


  test('basic.messages', async () => {
    const seneca = await makeSeneca()
    await SenecaMsgTest(seneca, BasicMessages)()
  })




  // test('maintain', Maintain)
})


async function makeSeneca(options?: any) {
  options = options || {}
  const seneca = Seneca({ legacy: false })
    .test()
    .use('promisify')
    .use('entity')
    .use('entity-util', { when: { active: true, human: 'y' } })
    .use(Progress, options.progress)

  await seneca.ready()

  // print all message patterns
  // console.log(seneca.list())

  return seneca
}

