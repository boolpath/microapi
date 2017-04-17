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

/** Recursively mounts all routes - middleware and callback handlers **/
function routing(router, routes, schemas = {}, definitions = {}, path = '/') {
  let mapping = new Map()
  let middleware

  for (let segment in routes) {
    if (routes.hasOwnProperty(segment)) {
      let handler = routes[segment]

      /* Map route handlers or keep searching through the directory tree */
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

  /* Mount validation and request handlers for all paths */
  for (let [/*segpath*/, {method, path, handler}] of mapping) {
    router[method](path, validation(method, schemas, definitions))
    if (middleware) router.use(path, middleware) && (middleware = undefined)
    router[method](path, wrappers.callback(handler))
  }

  mapping.clear()
}

/** Loads the specified directory and the supported API description files **/
function loadApiDirectory(directory) {
  let contents = {}

  try { contents = requireDirectory(module, directory) }
  catch (error) { throw error || new Error('api-directory-not-found')}

  let {routes = {}, schemas = {}, middleware = {}, definitions = {}} = contents
  return {routes, middleware, schemas, definitions}
}

module.exports = (router, directory) => {
  let {routes, middleware, schemas, definitions} = loadApiDirectory(directory)
  for (let handler of middleware.index || []) router.use(handler)
  dereferenceSchemas(definitions, definitions)
  routing(router, routes, schemas, definitions)

  return {routes, schemas, middleware, definitions}
}
