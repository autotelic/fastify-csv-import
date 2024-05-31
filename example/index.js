import Fastify from 'fastify'

import fastifyCsvImport from '../index.js'

const fastify = Fastify({
  logger: { level: 'info' }
})

const validationSchema = {
  type: 'object',
  properties: {
    'Catalog Title': { type: 'string' },
    SKU: { type: 'string' },
    'Fixed Price': { type: 'string', format: 'price' }
  },
  required: ['Catalog Title', 'SKU', 'Fixed Price']
}

fastify.register(fastifyCsvImport, {
  formats: [
    ['price', /^\d{1,8}(?:\.\d{1,4})?$/]
  ]
})

fastify.post('/csv/import', async (req, reply) => {
  if (!fastify.csvImport) {
    throw new Error('fastify-csv-import plugin is not available')
  }
  const { rows, errors } = await fastify.csvImport({
    req, validationSchema
  })
  console.log('rows', rows)
  console.log('errors', errors)
  const rowsLength = rows.length
  const errorsLength = Object.keys(errors).length
  if (rowsLength > 20 || errorsLength > 20) {
    reply.code(400).send({
      error: 'Too many results to display',
      rowsLength,
      errorsLength
    })
    return
  }
  reply.send(rows || errors)
})

const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
  } catch (err) {
    console.log('here')
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
