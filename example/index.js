import Fastify from 'fastify'

import fastifyCsvImport from '../index.js'

const PORT = 3000

const fastify = Fastify()

const validationSchema = {
  type: 'object',
  properties: {
    'Catalog Title': { type: 'string' },
    SKU: { type: 'string' },
    'Fixed Price': { type: 'string', format: 'price' }
  },
  required: ['Catalog Title', 'SKU', 'Fixed Price']
}

fastify.register(fastifyCsvImport)

fastify.post('/csv/import', async (req, reply) => {
  if (!fastify.csvImport) {
    throw new Error('fastify-csv-import plugin is not available')
  }
  const { rows, errors } = await fastify.csvImport({ req, validationSchema })
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

fastify.listen({ port: PORT }, (_, address) => {
  console.log(`listening at ${address}`)
})
