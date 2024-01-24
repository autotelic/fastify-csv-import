import fastify from 'fastify'
import { test } from 'tap'

import fastifyPluginTemplate from '../index.js'

test('fastify-plugin-template plugin should exist', async ({ ok }) => {
  const app = fastify()
  app.register(fastifyPluginTemplate, {})
  await app.ready()

  ok(app.hasPlugin('fastify-plugin-template'))
})
