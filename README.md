# microapi
Plug and play API server for Async microservices.  

(requires Node >= 7.6 for async/await support).

## Usage
```
npm install microapi
```

``` js
const Microapi = require('microapi/koa')
const app = new Microapi()

/* Define routes, schemas and middleware under ./api */
app.define('./api') // or an absolute path

app.listen(3000)
```

## Motivation
- Automating mounting to remove manual wiring.
- Reducing the setup time for new microservices.
- Separating parameter validation from handlers.
- Exposing schemas for documentation purposes.
- WYSIWYG-style workflow: routes from directories.

## Workflow
1. **Create directories** according to your API paths: e.g. /path/to/a/resource/_id/collection.
2. **Add files** to such directories to handle HTTP verbs: i.e. get.js post.js put.js delete.js.
3. **Add middleware** files to run for specific routes: use.js files alongside {verb}.js files.
4. **Add schemas** and request/response validation functions to check request parameters.
5. **Generate documentation** by running `microjoi` to convert (Joi) schemas to (Swagger).

## Directory Structure
```
/your-project
  /api
    /routes
    /schemas
    /middleware
```

```
/routes (same for /schemas except use.js)
  get.js
  post.js
  use.js
  ...
  /{resource}
    ...
    /_{parameter}  (prefix directories with "_" to create URL parameters)
      ...
      /{collection}
        get.js
        post.js
        use.js
        ...
```
```
/middleware
  index.js
  some-middleware.js
  another-middleware.js
  ...
```

## File Structure

### ./api/routes
#### [get|post|put|delete].js
``` js
module.exports = async function handler({ request, params }) {
  // return {body: ..., status: 200}
}
```

#### use.js
``` js
module.exports = async function handler({ request, params }) {
  // return Promise.reject({body: ..., status: 400}) to interrupt the middleware flow
}
```

### ./api/schemas
#### [get|post|put|delete].js
The properties of request[path|query|body|header] objects must be Joi schemas (i.e. `name: joi...` pairs).
``` js
const joi = require('joi')

const schemas = {
  request: {
    path: {},
    query: {},
    body: {},
    header: {}
  },
  responses: {
    default: {
      description: '',
      body: {},
      examples: {}
    }
  }
}

function validateRequest(request) {
  // request.validation = {body: {details: request.validation.details}}
  // delete request.validation
  // return Promise
}

function validateResponse(response) {
  // return Promise
}

module.exports = {
  description: '',
  definitions: schemas,
  validations: {
    request: validateRequest,
    response: validateResponse
  }
}
```

### ./api/middleware
#### index.js
Insert the middleware into the array in the desired order of execution.
``` js
const middleware = require('require-directory')(module)

module.exports = [
  middleware.default,
  middleware.{middlewareName},
  ...
]
```

#### {middleware-name}.js
``` js
module.exports = async ({request, params}, next) => {
  // downwards code
  await next()
  // upwards code
}
```
