const gql = require('graphql-tag');

// specify what to return from the query and mutation
module.exports = gql`
  type Website {
    id: ID!
    url: String!
    history: [Status]
    latestStatus: Int
    monitered: Boolean!
    email: String,
    title: String
  }

  type Status {
    statusCode: Int!
    timestamp: String!
  }

  type Query {
    getWebsites: [Website]
    checkStatus(websiteId: ID!): Status!
  }

  type Mutation {
    createWebsite(url: String!, email: String, title: String): Website!
    deleteWebsite(websiteId: ID!): String!
    startMonitoring(websiteId: ID!): Status!
    stopMonitoring(websiteId: ID!): Website!
    getReport(websiteId: ID!): Website!
  }
`;
