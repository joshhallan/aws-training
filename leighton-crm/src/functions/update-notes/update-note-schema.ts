export const schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'OptionalNote',
  type: 'object',
  properties: {
    title: {
      type: 'string',
    },
    content: {
      type: 'string',
    },
    entityType: {
      type: 'string',
    },
    isPrivate: {
      type: 'boolean',
    },
  },
};