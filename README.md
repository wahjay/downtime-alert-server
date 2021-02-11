# downtime-alert-server

[Project spec is here.](https://www.codementor.io/projects/downtime-monitoring-with-reporting-and-alerts-atx32kb677)

Tech Stack:
  - React
  - Nodejs
  - Express
  - GraphQL
  - MongoDB
  
  
  <img src="/downtime-monitor.png" alt="pic" width="600"/>
  
Since the history list for a website (depending on how long you have monitored it) can be really large, 
instead of sending the history list to the client everytime I want to render all the monitored websites, 
with GraphQL I can filter out the history list and only retrieve what is necessary.

Moreover, I can utilize the polling query from GraphQL.
What polling query will do is sending a request to the server asking for the latest status code for the websites currently being monitored.
Every time a user adds a website, the monitoring will not start. 
The monitoring will only start when the user clicks the start button. And then the server will run a cron job to send a request
to the destination url at a regular interval (every 1 hour), and then when the response is received, the status code will be extracted and saved to
the database. When the status code is not 200, the server will trigger an alert via email (only if provided) to the users.
