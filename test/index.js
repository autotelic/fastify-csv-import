import fastify from 'fastify'
import { test } from 'tap'

import fastifyCsvImport from '../index.js'

test('plugin should exist along with registering fastify-multipart', async ({ ok }) => {
  const app = fastify()
  app.register(fastifyCsvImport)
  await app.ready()

  ok(app.hasPlugin('fastify-csv-import'))
  ok(app.hasPlugin('@fastify/multipart'))
})

test('should decorate fastify with `csvImport`', async ({ ok }) => {
  const app = fastify()
  app.register(fastifyCsvImport)
  await app.ready()

  ok(app.csvImport)
})
