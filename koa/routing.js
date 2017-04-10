'use strict'

const fs = require('fs')
const pathjoin = require('path').join
const requireDirectory = require('require-directory')

const dereferenceSchemas = require('./dereferencing')
const validSegments = ['get', 'post', 'put', 'delete', 'use']
const validation = require('./validation')
const wrappers = require('./wrappers')

const underscore = /\/_/g // path segments starting with underscore: /_
const slashcolon = '/:' // colons for url parameters

function routing(router, handlers, schemas = {}, definitions = {}, path = '/') {
  let mapping = new Map()
  let middleware

  for (let segment in handlers) {
    if (handlers.hasOwnProperty(segment)) {
      let handler = handlers[segment]

      if (typeof handler === 'object') {
        let nextPath = pathjoin(path, segment)
        routing(router, handler, schemas[segment], definitions, nextPath)
      } else if (validSegments.indexOf(segment) >= 0) {
        path = path.replace(underscore, slashcolon)
        if (segment === 'use') middleware = wrappers.middleware(handler)
        else mapping.set(`${segment} ${path}`, {method: segment, path, handler})
      }
    }
  }

  for (let [/*segpath*/, {method, path, handler}] of mapping) {
    router[method](path, validation({method, schemas, definitions}))
    if (middleware) router.use(path, middleware) && (middleware = undefined)
    router[method](path, wrappers.callback(handler))
  }

  mapping.clear()
}

function loadApiDirectory(directory) {
  let contents = {}

  try {
    if (fs.statSync(directory).isDirectory()) {
      contents = requireDirectory(module, directory)
    }
  } catch (e) {
    throw e
  }

  let {routes = {}, schemas = {}, middleware = {}, definitions = {}} = contents
  return {routes, middleware, schemas, definitions}
}

module.exports = (router, directory) => {
  let {routes, middleware, schemas, definitions} = loadApiDirectory(directory)
  for (let handler of middleware.index || []) router.use(handler)
  dereferenceSchemas(definitions, definitions)
  routing(router, routes, schemas, definitions)

  return {routes, schemas, middleware}
}
