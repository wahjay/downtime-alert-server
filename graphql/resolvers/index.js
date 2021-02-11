const websitesResolvers = require('./websites');

// combine all the resolvers into one
module.exports = {
  Query: {
    ...websitesResolvers.Query
  },
  Mutation: {
    ...websitesResolvers.Mutation
  }
};
