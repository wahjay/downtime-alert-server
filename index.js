const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const bodyParser = require('body-parser')
const mongoose = require('mongoose');

const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');

const { MONGODB } = require('./config');

const app = express();
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// integrate graphql with express
// only requests to /graphql will be handled
// by the graphql server.
server.applyMiddleware({ app });

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  return res.send("up and running");
});


// connect to mongoDB and start up the apollo server
mongoose.connect(MONGODB, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
     console.log('🚀 Connected to MongoDB successfully.');
     return app.listen(PORT);
  })
  .then(res => {
    console.log(`🚀 Server running at ${PORT}`);
  })
  .catch(err => {
    console.error(err);
  });
