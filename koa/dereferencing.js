'use strict'

/** Resolves all schema references by inserting their actual definitions **/
function dereferenceSchema(schema, definitions) {
  for (let property in schema) {
    if (!schema[property].isJoi) {
      dereferenceSchema(schema[property], definitions)
    } else {
      findReference(schema, property, definitions)
    }
  }
}

/** Recursively finds and replaces all subschema reference definitions **/
function findReference(schema, property, definitions) {
  let subschema = schema[property]
  let {className} = (subschema._meta || []).find(meta => meta.className) || {}

  /* Replace reference with definition or keep looking in joi._inner.children */
  if (className && definitions[className]) {
    schema[property] = definitions[className]
  } else if (subschema._inner && subschema._inner.children) {
    for (let index in subschema._inner.children) {
      findReference(subschema._inner.children[index], 'schema', definitions)
      /* the 'schema' parameter is a property of joi {key, schema} elements */
    }
  }
}

module.exports = dereferenceSchema
