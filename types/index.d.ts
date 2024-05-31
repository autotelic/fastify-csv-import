import { RowMap } from '@fast-csv/parse'
import { Schema, ErrorObject } from 'ajv'
import type { FastifyPluginCallback, FastifyRequest } from 'fastify'

export interface Row extends RowMap<string> {}
export interface Errors extends Record<number, ErrorObject[] | { fileError: string } | null | undefined> { }
export interface CsvImportResults {
    rows: Row[]
    errors: Errors
}
export type CsvImportArgs = {
    req: FastifyRequest
    validationSchema: Schema
    customValidator: (row: Row) => Promise<{ isValidData: boolean; error: never[] }> | undefined
}

declare module 'fastify' {
    interface FastifyInstance {
        csvImport: ({ req, validationSchema, customValidator }:CsvImportArgs) => Promise<CsvImportResults>
    }
}

export interface fastifyCsvImportOptions {}

declare const fastifyCsvImport: FastifyPluginCallback<fastifyCsvImportOptions>

export default fastifyCsvImport
export { fastifyCsvImport }
