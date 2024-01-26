import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import fastifyInjector from '@autotelic/fastify-injector'
import { test } from 'tap'

import fastifyCsvImport from '../index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(dirname(__dirname), 'example', 'fixtures')

const defaultSchema = {
  type: 'object',
  properties: {
    'Catalog Title': { type: 'string' },
    SKU: { type: 'string' },
    'Fixed Price': { type: 'string', format: 'price' }
  },
  required: ['Catalog Title', 'SKU', 'Fixed Price']
}

function buildApp ({ validationSchema = defaultSchema, hasFileError = false } = {}) {
  const injectorOpts = {}
  if (hasFileError) {
    injectorOpts.requestDecorators = {
      file: () => {}
    }
  }
  const app = fastifyInjector(injectorOpts)
  app.register(fastifyCsvImport)

  app.post('/', async (req, reply) => {
    const { rows, errors } = await app.csvImport({ req, validationSchema })
    reply.send(rows.length ? rows : errors)
  })

  return app
}

function makeFormData (fileContent) {
  const boundary = '----MyBoundary'
  const payload = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="valid-products.csv"',
        'Content-Type: text/csv',
        '',
        fileContent,
        `--${boundary}--`,
        ''
  ].join('\r\n')
  const headers = {
    'Content-Type': `multipart/form-data; boundary=${boundary}`
  }
  return { payload, headers }
}

test('plugin should exist along with registering fastify-multipart', async ({ ok }) => {
  const app = buildApp()
  await app.ready()

  // hasPlugin() becomes available starting from v4.0.x
  // Here we are just checking if the instances of csvImport
  ok(app.csvImport)
})

test('should decorate fastify with `csvImport`', async ({ ok }) => {
  const app = buildApp()
  await app.ready()

  ok(app.csvImport)
})

test('should upload a valid csv', async ({ equal, same, teardown }) => {
  teardown(async () => app.close())
  const app = buildApp()
  await app.ready()

  const filePath = join(fixturesDir, 'valid-products.csv')
  const fileContent = readFileSync(filePath)

  const { payload, headers } = makeFormData(fileContent)

  const response = await app.inject({
    method: 'POST',
    url: '/',
    headers,
    payload
  })

  equal(response.statusCode, 200)
  same(response.json(), [
    {
      'Catalog Title': 'Product 1',
      SKU: 'PROD-123456',
      'Fixed Price': '10.83'
    },
    {
      'Catalog Title': 'Product 2',
      SKU: 'PROD-987653',
      'Fixed Price': '11.00'
    },
    {
      'Catalog Title': 'Product 3',
      SKU: 'PROD-987654',
      'Fixed Price': '0.77'
    }
  ])
})

test('should process invalid data', async ({ equal, same, teardown }) => {
  teardown(async () => app.close())
  const app = buildApp()
  await app.ready()

  const filePath = join(fixturesDir, 'invalid-fixed-price.csv')
  const fileContent = readFileSync(filePath)

  const { payload, headers } = makeFormData(fileContent)

  const response = await app.inject({
    method: 'POST',
    url: '/',
    headers,
    payload
  })

  equal(response.statusCode, 500)
  same(response.json(), {
    2: [
      {
        instancePath: '/Fixed Price',
        schemaPath: '#/properties/Fixed%20Price/format',
        keyword: 'format',
        params: { format: 'price' },
        message: 'must match format "price"'
      }
    ]
  })
})

test('should process large files', async ({ equal, same, teardown }) => {
  teardown(async () => app.close())
  const app = buildApp({
    validationSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        firstname: { type: 'string' },
        lastname: { type: 'string' },
        email: { type: 'string' },
        email2: { type: 'string' },
        profession: { type: 'string' }
      },
      required: ['id', 'email']
    }
  })
  await app.ready()

  const filePath = join(fixturesDir, 'large-file.csv')
  const fileContent = readFileSync(filePath)

  const { payload, headers } = makeFormData(fileContent)

  const response = await app.inject({
    method: 'POST',
    url: '/',
    headers,
    payload
  })

  equal(response.statusCode, 200)
  equal(response.json().length, 100000)
})

test('should use a custom file size', async ({ equal, teardown }) => {
  process.env.MAX_CSV_IMPORT = '1024'
  teardown(async () => {
    app.close()
    delete process.env.MAX_CSV_IMPORT
  })

  const app = buildApp()
  await app.ready()

  const filePath = join(fixturesDir, 'large-file.csv')
  const fileContent = readFileSync(filePath)
  const { payload, headers } = makeFormData(fileContent)

  const response = await app.inject({
    method: 'POST',
    url: '/',
    headers,
    payload
  })

  // 413 Content Too Large
  equal(response.statusCode, 413)
})

test('should fail if file cannot be found', async ({ equal, same, teardown }) => {
  teardown(async () => app.close())
  const app = buildApp({ hasFileError: true })
  await app.ready()

  const filePath = join(fixturesDir, 'valid-products.csv')
  const fileContent = readFileSync(filePath)

  const { payload, headers } = makeFormData(fileContent)

  const response = await app.inject({
    method: 'POST',
    url: '/',
    headers,
    payload
  })
  equal(response.statusCode, 200)
  same(response.json(), { fileError: 'No file uploaded' })
})
