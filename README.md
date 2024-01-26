# fastify-csv-import

A Fastify plugin that enables Fastify applications to parse CSV files and validate their content against a specified schema. It is built using `fast-csv` for parsing, `Ajv` for validation, and `fastify-multipart` for handling file uploads.

## Install

```sh
npm install @autotelic/fastify-csv-import
```

## Usage

```js
import Fastify from 'fastify'
import fastifyCsvImport from 'fastify-csv-import'

const PORT = 3000
const fastify = Fastify()

// Define your CSV validation schema
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
  reply.send(rows || errors)
})

fastify.listen({ port: PORT }, (_, address) => {
  console.log(`Server listening at ${address}`)
})
```

## Example

For a more detailed example, including how to handle various scenarios and errors, please refer to our [usage example](./example/README.md).

## API

### fastify.csvImport({ req, validationSchema })

- `req`: The request object from Fastify.
- `validationSchema`: A schema object used for validating the CSV data. It must conform to the JSON Schema standard.

`fastify-csv-import` decorates fastify with `csvImport`. The function parses the CSV file from the request, validates each row against the provided schema, and returns an object containing `rows` and `errors`. Rows that pass validation are included in `rows`, while validation errors are recorded in `errors`.

### Configuration Options

- `MAX_CSV_IMPORT`: An optional environment variable to set the maximum CSV file size. If not set, defaults to 50MB.

## Triggering a Release

_Prerequisite: Update repository access for the shared [NPM_PUBLISH_TOKEN](https://github.com/organizations/autotelic/settings/secrets/actions/NPM_PUBLISH_TOKEN) secret._

Trigger the release workflow via a tag

  ```sh
  git checkout main && git pull
  npm version { minor | major | path }
  git push --follow-tags
  ```
