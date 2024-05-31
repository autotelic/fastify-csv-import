import fastify, { FastifyInstance, FastifyRequest } from 'fastify'
// eslint-disable-next-line import/no-unresolved
import { expectAssignable, expectError, expectType } from 'tsd'

import fastifyCsvImport from '..'

import type { CsvImportArgs, CsvImportResults, fastifyCsvImportOptions } from './index.d.ts'

const app = fastify()

const opt1: fastifyCsvImportOptions = {}
expectAssignable<FastifyInstance>(app.register(fastifyCsvImport, opt1))

app.register(fastifyCsvImport, opt1).after(() => {
  expectType<(args: CsvImportArgs) => Promise<CsvImportResults>>(app.csvImport)
})

const mockRequest: FastifyRequest = {} as FastifyRequest

const validCsvImportArgs: CsvImportArgs = {
  req: mockRequest,
  validationSchema: { type: 'object', properties: { name: { type: 'string' } } },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customValidator (): Promise<{ isValidData: boolean; error: any[] }> | undefined {
    throw new Error('Function not implemented.')
  }
}
expectAssignable<CsvImportArgs>(validCsvImportArgs)

const invalidCsvImportArgs = {
  req: mockRequest,
  validationSchema: 'invalid'
}
expectError<CsvImportArgs>(invalidCsvImportArgs)

const mockCsvImportResults: CsvImportResults = {
  rows: [{ column1: 'value1', column2: 'value2' }],
  errors: { 1: [{ keyword: 'type', instancePath: '.column1', schemaPath: '#/properties/column1/type', params: { type: 'string' }, message: 'should be string' }] }
}
expectAssignable<CsvImportResults>(mockCsvImportResults)

const invalidCsvImportResults = {
  rows: [{ column1: 'value1', column2: 'value2' }],
  errors: { 1: 'not an array of errors or valid error format' }
}
expectError<CsvImportResults>(invalidCsvImportResults)
