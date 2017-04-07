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
app.define('./api')

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
    /_{parameter}
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
