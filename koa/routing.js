'use strict'

const fs = require('fs')
const requireDirectory = require('require-directory')

const validation = require('./validation')
const wrappers = require('./wrappers')

function routing(router, handlers, schemas, path = '') {
  let mapping = new Map()
  let middleware

  for (let segment in handlers) {
    if (handlers.hasOwnProperty(segment)) {
      let handler = handlers[segment]

      if (typeof handler === 'object') {
        routing(router, handler, schemas[segment], `${path}/${segment}`)
      } else {
        path = path.replace(/_/g, ':') // colons for url parameters
        if (segment === 'use') middleware = wrappers.middleware(handler)
        else mapping.set(`${segment} ${path}`, {method: segment, path, handler})
      }
    }
  }

  for (let [/*segpath*/, {method, path, handler}] of mapping) {
    router[method](path, validation({schemas, method}))
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

  let {routes = {}, schemas = {}, middleware = {}} = contents
  return {routes, schemas, middleware}
}

module.exports = (router, directory) => {
  let {routes, schemas, middleware} = loadApiDirectory(directory)
  for (let handler of middleware.index || []) router.use(handler)
  routing(router, routes, schemas)

  return {routes, schemas, middleware}
}
